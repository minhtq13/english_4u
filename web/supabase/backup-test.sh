#!/usr/bin/env bash
# Rehearse the database backup flow on this machine with Docker. Production is only READ (pg_dump / SELECT).
#
#   bash web/supabase/backup-test.sh live
#       dump production -> encrypt -> decrypt -> restore into a throwaway database -> compare with production
#   bash web/supabase/backup-test.sh file ~/Downloads/backup-2026-10-23.tar.gpg
#       open an artifact downloaded from GitHub Actions, restore it into a throwaway database, compare with production
#
# Secrets: SUPABASE_DB_URL (session pooler string) and BACKUP_PASSPHRASE, the same values as the GitHub secrets. They are read from the
# environment, from a file given as ENV_FILE=/path (lines KEY=VALUE), or typed at a hidden prompt. They are never printed.
# Everything temporary (container, dumps, decrypted files) is removed when the script ends.
set -euo pipefail

MODE=${1:-live}
FILE=${2:-}
PG_IMAGE=public.ecr.aws/supabase/postgres:17.6.1.171 # same major version as the project (17); has the Supabase roles and auth schema
GPG_IMAGE=alpine:3
NAME=e4u-backup-test

die() { echo "LỖI: $*" >&2; exit 1; }
command -v docker >/dev/null || die "cần Docker Desktop đang chạy"
docker info >/dev/null 2>&1 || die "Docker chưa chạy, hãy mở Docker Desktop"
[ "$MODE" = live ] || [ "$MODE" = file ] || die "dùng: backup-test.sh live | file <đường dẫn file .gpg>"
if [ "$MODE" = file ]; then [ -f "$FILE" ] || die "không thấy file: $FILE"; fi

# ---- secrets ----
if [ -n "${ENV_FILE:-}" ]; then
  [ -f "$ENV_FILE" ] || die "không thấy ENV_FILE: $ENV_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in SUPABASE_DB_URL=* | BACKUP_PASSPHRASE=*)
      key=${line%%=*}; val=${line#*=}; val=${val%\"}; val=${val#\"}; val=${val%\'}; val=${val#\'}
      export "$key=$val" ;;
    esac
  done < "$ENV_FILE"
fi
if [ -z "${SUPABASE_DB_URL:-}" ]; then read -rsp "SUPABASE_DB_URL (chuỗi Session pooler, gõ ẩn): " SUPABASE_DB_URL; echo; fi
if [ "$MODE" = live ] && [ -z "${BACKUP_PASSPHRASE:-}" ]; then read -rsp "BACKUP_PASSPHRASE (gõ ẩn): " BACKUP_PASSPHRASE; echo; fi
if [ "$MODE" = file ] && [ -z "${BACKUP_PASSPHRASE:-}" ]; then read -rsp "BACKUP_PASSPHRASE để mở file (gõ ẩn): " BACKUP_PASSPHRASE; echo; fi
[ -n "$SUPABASE_DB_URL" ] && [ -n "$BACKUP_PASSPHRASE" ] || die "thiếu SUPABASE_DB_URL hoặc BACKUP_PASSPHRASE"
export SUPABASE_DB_URL BACKUP_PASSPHRASE

# ---- scratch area, removed on exit ----
WORK=$(mktemp -d "${TMPDIR:-/tmp}/e4u-backup-test.XXXXXX")
chmod 777 "$WORK"
cleanup() {
  docker run --rm -v "$WORK":/work "$GPG_IMAGE" chown -R "$(id -u):$(id -g)" /work >/dev/null 2>&1 || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
docker rm -f "$NAME" >/dev/null 2>&1 || true

pgx() { docker exec -e URL="$SUPABASE_DB_URL" "$NAME" "$@"; } # runs inside the Postgres 17 container, URL available as $URL
step() { echo; echo "== $*"; }

step "Khởi động database tạm (Postgres 17 kiểu Supabase)"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test -v "$WORK":/work "$PG_IMAGE" >/dev/null
for _ in $(seq 1 90); do
  if docker exec "$NAME" psql -U postgres -At -c "select 1 from pg_roles where rolname = 'authenticated'" 2>/dev/null | grep -q 1 \
    && docker exec "$NAME" psql -U postgres -At -c "select 1 from pg_namespace where nspname = 'auth'" 2>/dev/null | grep -q 1; then ready=1; break; fi
  sleep 2
done
[ "${ready:-}" = 1 ] || die "database tạm không khởi động xong"
echo "sẵn sàng"

mkdir -p "$WORK/out"
if [ "$MODE" = live ]; then
  step "1/6 Dump production (chỉ đọc), đúng lệnh của workflow"
  pgx sh -c '
    set -e
    pg_dump "$URL" --schema=public --schema=private --no-owner --no-privileges --format=custom --file=/work/out/public.dump
    pg_dump "$URL" --data-only --schema=auth --exclude-table-data=auth.schema_migrations --no-owner --no-privileges --format=custom --file=/work/out/auth.dump
    pg_dump "$URL" --data-only --schema=storage --exclude-table-data=storage.migrations --no-owner --no-privileges --format=custom --file=/work/out/storage.dump
    pg_dump "$URL" --data-only --table=supabase_migrations.schema_migrations --no-owner --no-privileges --format=custom --file=/work/out/migrations.dump
    psql "$URL" -At -c "select case when jobname is null then format(\$q\$select cron.schedule(%L, %L);\$q\$, schedule, command) else format(\$q\$select cron.schedule(%L, %L, %L);\$q\$, jobname, schedule, command) end from cron.job order by jobid" > /work/out/cron-jobs.sql' \
    || die "pg_dump lỗi: kiểm tra SUPABASE_DB_URL (phải là chuỗi Session pooler, đúng mật khẩu mới)"
  for f in public auth storage migrations; do echo "$f.dump: $(wc -c < "$WORK/out/$f.dump" | tr -d ' ') bytes"; done
  echo "cron-jobs.sql: $(grep -c 'cron.schedule' "$WORK/out/cron-jobs.sql" || true) job"
  [ "$(wc -c < "$WORK/out/public.dump")" -gt 50000 ] || die "public.dump nhỏ bất thường"
  [ "$(wc -c < "$WORK/out/auth.dump")" -gt 1000 ] || die "auth.dump nhỏ bất thường"
  [ "$(wc -c < "$WORK/out/migrations.dump")" -gt 1000 ] || die "migrations.dump nhỏ bất thường"

  step "2/6 Mã hoá bằng BACKUP_PASSPHRASE, rồi giải mã lại và so từng byte"
  docker run --rm -e PASSPHRASE="$BACKUP_PASSPHRASE" -v "$WORK":/work "$GPG_IMAGE" sh -c '
    set -e
    apk add --no-cache gnupg >/dev/null 2>&1
    cd /work
    tar -C out -cf - . | gpg --batch --yes --pinentry-mode loopback --passphrase "$PASSPHRASE" --symmetric --cipher-algo AES256 --output backup.tar.gpg
    mkdir -p opened
    gpg --batch --pinentry-mode loopback --passphrase "$PASSPHRASE" -d backup.tar.gpg 2>/dev/null | tar -C opened -x
    for f in $(cd out && ls); do cmp "out/$f" "opened/$f" || { echo "khác nhau: $f"; exit 4; }; done; echo "giải mã khớp từng byte ($(cd out && ls | wc -l | tr -d " ") file)"
    if gpg --batch --pinentry-mode loopback --passphrase "sai-mat-khau" -d backup.tar.gpg >/dev/null 2>&1; then echo "CẢNH BÁO: mật khẩu sai vẫn mở được"; exit 3; fi
    echo "mật khẩu sai bị từ chối"' || die "bước mã hoá/giải mã lỗi"
else
  step "1/6 Mở file $FILE bằng BACKUP_PASSPHRASE"
  cp "$FILE" "$WORK/in.gpg"
  docker run --rm -e PASSPHRASE="$BACKUP_PASSPHRASE" -v "$WORK":/work "$GPG_IMAGE" sh -c '
    apk add --no-cache gnupg >/dev/null 2>&1
    cd /work
    printf "%s" "$PASSPHRASE" | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 -o plain.bin -d in.gpg 2>/dev/null || exit 2
    mkdir -p opened
    if tar -tf plain.bin >/dev/null 2>&1; then tar -C opened -xf plain.bin; echo "định dạng: tar (public.dump + auth.dump)"; else mv plain.bin opened/single.dump; echo "định dạng: một file dump duy nhất"; fi
    ls -l opened' || die "không mở được file: BACKUP_PASSPHRASE sai, hoặc file không phải bản mã hoá gpg"
  if [ -f "$WORK/opened/single.dump" ]; then
    echo; echo "Đây là bản dump kiểu cũ (một file, gồm cả schema auth) nên không khôi phục thử tự động được."
    echo "Các bảng có dữ liệu trong file:"
    docker exec "$NAME" pg_restore --list /work/opened/single.dump | grep "TABLE DATA" | sed 's/.*TABLE DATA //' | sed 's/ [a-z_]*$//' | tr '\n' ' '; echo
    echo "Mở được file nghĩa là mật khẩu đúng. Hãy dùng workflow mới (public + private, auth chỉ dữ liệu) để khôi phục được."
    exit 0
  fi
fi

step "3/6 Dựng database trống như một project Supabase mới, rồi nạp dữ liệu auth, storage, lịch sử migration"
pgx psql -U postgres -q -c "create database restore_test" 2>&1 | grep -v NOTICE || true
pgx sh -c '
  R="psql -U postgres -d restore_test -q"
  $R -c "create schema if not exists extensions" -c "create extension if not exists \"uuid-ossp\" with schema extensions" -c "create extension if not exists pgcrypto with schema extensions" >/dev/null 2>&1 || true
  # A new Supabase project already has these schemas and tables: clone only their structure from production, the data comes from the dumps.
  pg_dump "$URL" --schema-only --no-owner --no-privileges --schema=auth --schema=storage --schema=supabase_migrations > /work/managed-structure.sql
  $R -f /work/managed-structure.sql >/dev/null 2>&1 || true   # the trigger on auth.users needs public.handle_new_user, created later by public.dump
  : > /work/data.err
  for f in auth storage migrations; do
    if [ -f /work/opened/$f.dump ]; then pg_restore -U postgres --data-only --no-owner -d restore_test /work/opened/$f.dump 2>> /work/data.err && echo "đã nạp $f.dump"; fi
  done'
data_errors=$(grep -c "error:" "$WORK/data.err" || true)
echo "số lỗi khi nạp dữ liệu auth/storage/migrations: $data_errors"
[ "$data_errors" = 0 ] || { grep "error:" "$WORK/data.err" | head -5; die "nạp dữ liệu có lỗi (xem trên)"; }

step "4/6 Khôi phục schema + dữ liệu app"
# The dump re-creates schema "public", which every Supabase project already has: skip only that entry so any other error stays visible.
pgx sh -c 'pg_restore -l /work/opened/public.dump | grep -v -E "^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public " > /work/restore.list'
pgx pg_restore -U postgres --no-owner --no-privileges -L /work/restore.list -d restore_test /work/opened/public.dump 2> "$WORK/restore.err" || true
errors=$(grep -c "error:" "$WORK/restore.err" || true)
echo "số lỗi pg_restore: $errors"
[ "$errors" = 0 ] || { grep "error:" "$WORK/restore.err" | head -5; die "khôi phục có lỗi (xem trên)"; }

step "5/6 Đối chiếu với production"
cat > "$WORK/compare.sql" <<'SQL'
with tabs as (
  select format('%I.%I', n.nspname, c.relname) as t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and (n.nspname = 'public'
    or (n.nspname = 'auth' and c.relname <> 'schema_migrations')
    or (n.nspname = 'storage' and c.relname <> 'migrations')
    or n.nspname = 'supabase_migrations')
)
select 'rows ' || t as what, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %s', t), false, true, '')))[1]::text as n from tabs
union all select 'policies (public)', count(*)::text from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
union all select 'functions public+private', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private')
union all select 'triggers public', count(*)::text from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal
union all select 'indexes public', count(*)::text from pg_indexes where schemaname = 'public'
union all select 'RLS enabled tables', count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
union all select 'content checksum (lessons+items)', md5((select string_agg(md5(l::text), '' order by l.id) from public.lessons l) || (select string_agg(md5(i::text), '' order by i.id) from public.section_items i))
union all select 'checksum of migration history', md5(string_agg(md5(m::text), '' order by m.version)) from supabase_migrations.schema_migrations m
order by 1;
SQL
pgx sh -c 'psql "$URL" -At -F "|" -f /work/compare.sql > /work/prod.txt; psql -U postgres -d restore_test -At -F "|" -f /work/compare.sql > /work/restored.txt'

step "Job pg_cron (định nghĩa lịch)"
prod_jobs=$(pgx psql "$SUPABASE_DB_URL" -At -c "select count(*) from cron.job")
if [ -f "$WORK/opened/cron-jobs.sql" ]; then
  backup_jobs=$(grep -c "cron.schedule" "$WORK/opened/cron-jobs.sql" || true)
  echo "production có $prod_jobs job, bản backup có $backup_jobs job:"; sed 's/^/  /' "$WORK/opened/cron-jobs.sql"
  [ "$prod_jobs" = "$backup_jobs" ] || { echo "SỐ JOB KHÔNG KHỚP"; cron_bad=1; }
else
  echo "bản backup này chưa có cron-jobs.sql (bản cũ), nên chưa lưu job pg_cron"
fi

step "6/6 Kết quả"
if diff "$WORK/prod.txt" "$WORK/restored.txt" > "$WORK/diff.txt"; then
  echo "ĐẠT: $(wc -l < "$WORK/prod.txt" | tr -d ' ')/$(wc -l < "$WORK/prod.txt" | tr -d ' ') kiểm tra khớp production"
  sed 's/|/: /' "$WORK/prod.txt" | sed 's/^/  /'
else
  echo "KHÔNG KHỚP (< là production, > là bản khôi phục):"; cat "$WORK/diff.txt"
  echo "Nếu file là bản cũ hơn production thì chênh lệch dữ liệu là bình thường (dữ liệu đổi sau khi backup)."
  exit 1
fi
[ -z "${cron_bad:-}" ] || exit 1
