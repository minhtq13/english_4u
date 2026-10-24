#!/usr/bin/env bash
# Restore a backup INTO a database whose tables were emptied but whose schema, functions and policies are still there
# (everything deleted with TRUNCATE / DELETE, or a restore drill: see RESTORE.md, section "3C").
# For a brand-new empty project use RESTORE.md section 3B instead.
#
#   ENV_FILE=~/.e4u-backup.env bash web/supabase/restore-in-place.sh ~/Downloads/backup-2026-10-23.tar.gpg
#
# Options:  --step     stop and wait for Enter before every step
#           --from N   continue from step N (steps before it are skipped, they were already done); step 1 always runs
#           --until N  stop after step N
#           --force    run even if the tables are not empty (only useful when you are sure)
#
# ENV_FILE has the lines SUPABASE_DB_URL=... (session pooler of the database to restore INTO) and BACKUP_PASSPHRASE=...
# Needs Docker. The Postgres tools run in a container (version 17), nothing is installed. Passwords are never printed.
# Optional BASELINE=/path/to/baseline.txt (output of verify-counts.sql taken before the loss) to compare at the end.
set -euo pipefail

BACKUP=${1:-}
shift || true
STEP=0; FORCE=0; FROM=1; UNTIL=0
while [ $# -gt 0 ]; do
  case $1 in
    --step) STEP=1 ;;
    --force) FORCE=1 ;;
    --from) FROM=${2:?"--from cần một số"}; shift ;;
    --until) UNTIL=${2:?"--until cần một số"}; shift ;;
    *) echo "tuỳ chọn lạ: $1" >&2; exit 2 ;;
  esac
  shift
done
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
IMG=public.ecr.aws/supabase/postgres:17.6.1.171
die() { echo "LỖI: $*" >&2; exit 1; }
[ -f "$BACKUP" ] || die "dùng: restore-in-place.sh <file backup .tar.gpg> [--step] [--from N] [--until N] [--force]"
command -v docker >/dev/null && docker info >/dev/null 2>&1 || die "cần Docker Desktop đang chạy"

if [ -n "${ENV_FILE:-}" ]; then
  [ -f "$ENV_FILE" ] || die "không thấy ENV_FILE: $ENV_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in SUPABASE_DB_URL=* | BACKUP_PASSPHRASE=*) key=${line%%=*}; val=${line#*=}; export "$key=$val" ;; esac
  done < "$ENV_FILE"
fi
if [ -z "${SUPABASE_DB_URL:-}" ]; then read -rsp "SUPABASE_DB_URL của database CẦN KHÔI PHỤC (gõ ẩn): " SUPABASE_DB_URL; echo; fi
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then read -rsp "BACKUP_PASSPHRASE (gõ ẩn): " BACKUP_PASSPHRASE; echo; fi
export SUPABASE_DB_URL BACKUP_PASSPHRASE

WORK=$(mktemp -d "${TMPDIR:-/tmp}/e4u-restore.XXXXXX"); chmod 777 "$WORK"
cleanup() { docker run --rm -v "$WORK":/work alpine:3 chown -R "$(id -u):$(id -g)" /work >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

# tool <program> <args...>: run a PostgreSQL 17 tool in a container, against $SUPABASE_DB_URL (exposed to it as $URL)
NET=(); [ -z "${DOCKER_NETWORK:-}" ] || NET=(--network "$DOCKER_NETWORK")   # only used by tests
tool() { docker run --rm ${NET[@]+"${NET[@]}"} -e URL="$SUPABASE_DB_URL" -v "$WORK":/work -w /work/opened --entrypoint "$1" "$IMG" "${@:2}"; }
psqlq() { tool psql "$SUPABASE_DB_URL" -q -v ON_ERROR_STOP=1 "$@"; }

# begin <title>: numbers the step and sets RUN=1 when it has to run, RUN=0 when it is skipped (--from)
n=0; RUN=1
begin() {
  n=$((n + 1))
  if [ "$UNTIL" -gt 0 ] && [ "$n" -gt "$UNTIL" ]; then echo; echo "Dừng sau bước $UNTIL (--until). Tiếp tục bằng --from $n."; exit 0; fi
  if [ "$n" -gt 1 ] && [ "$n" -lt "$FROM" ]; then RUN=0; echo; echo "== Bước $n: $*  (bỏ qua, đã làm trước đó)"; return 0; fi
  RUN=1; echo; echo "== Bước $n: $*"
  if [ "$STEP" = 1 ]; then read -rp "   Enter để chạy, Ctrl+C để dừng: " _; fi
  return 0
}

# the app tables, parents before children (a child row needs its parent row to exist)
ORDER="courses phases classes profiles lessons lesson_sections section_items class_teachers class_lessons class_lesson_students attempts attempt_results feedback error_log comment_templates lesson_structures admin_emails"

begin "Mở backup bằng BACKUP_PASSPHRASE"
docker run --rm -e PASSPHRASE="$BACKUP_PASSPHRASE" -v "$WORK":/work -v "$(cd "$(dirname "$BACKUP")" && pwd)/$(basename "$BACKUP")":/in/backup.gpg:ro alpine:3 sh -c '
  apk add --no-cache gnupg >/dev/null 2>&1; mkdir -p /work/opened
  gpg --batch --pinentry-mode loopback --passphrase "$PASSPHRASE" -d /in/backup.gpg 2>/dev/null | tar -C /work/opened -x' || die "không mở được backup (sai BACKUP_PASSPHRASE?)"
for f in public.dump auth.dump migrations.dump; do [ -s "$WORK/opened/$f" ] || die "backup thiếu $f"; done
echo "   file trong backup: $(ls "$WORK/opened" | tr '\n' ' ')"

begin "Kiểm tra database đích có TRỐNG không (không khôi phục đè lên dữ liệu đang có)"
if [ "$RUN" = 1 ]; then
  used=$(tool psql "$SUPABASE_DB_URL" -At -c "select (select count(*) from public.profiles) + (select count(*) from public.lessons) + (select count(*) from auth.users)") || die "không chạy được câu kiểm tra trên database đích: kiểm tra SUPABASE_DB_URL (chuỗi Session pooler, đúng mật khẩu), Docker và mạng"
  echo "   số dòng trong profiles + lessons + auth.users: $used"
  if [ "$used" != 0 ] && [ "$FORCE" = 0 ]; then die "database không trống. Chỉ chạy script này sau khi dữ liệu đã bị xoá (nếu đã làm dở thì dùng --from <bước tiếp theo>)"; fi
fi

begin "Tạm thay hàm handle_new_user bằng hàm rỗng (trigger trên auth.users không tắt được, nên làm nó vô hiệu)"
if [ "$RUN" = 1 ]; then
  psqlq -c "create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as \$\$ begin return new; end; \$\$"
fi

begin "Nạp tài khoản, phiên đăng nhập (auth.dump) và storage nếu có dữ liệu"
if [ "$RUN" = 1 ]; then
  tool pg_restore --data-only --no-owner -d "$SUPABASE_DB_URL" auth.dump
  if [ -s "$WORK/opened/storage.dump" ]; then
    # some storage tables are managed by Supabase and "postgres" may not write to them; only restore when there is something to restore
    storage_rows=$(tool pg_restore --data-only -f - storage.dump | awk '/^COPY /{c=1;next} /^\\\.$/{c=0;next} c{n++} END{print n+0}')
    if [ "$storage_rows" = 0 ]; then echo "   storage không có dòng dữ liệu nào, bỏ qua"; else echo "   storage có $storage_rows dòng, nạp"; tool pg_restore --data-only --no-owner -d "$SUPABASE_DB_URL" storage.dump; fi
  fi
fi

begin "Tắt trigger của các bảng app trong lúc nạp (trigger attempts_guard_status sẽ ghi đè submitted_at nếu để bật)"
if [ "$RUN" = 1 ]; then for t in $ORDER; do psqlq -c "alter table public.$t disable trigger user"; done; fi

begin "Nạp từng bảng app, cha trước con (mỗi bảng một giao dịch, lỗi thì dừng ngay)"
restore_failed=0
if [ "$RUN" = 1 ]; then
  for t in $ORDER; do
    if tool pg_restore --single-transaction --data-only --no-owner -t "$t" -d "$SUPABASE_DB_URL" public.dump > "$WORK/t-$t.log" 2>&1; then echo "   $t: xong"; else echo "   $t: LỖI"; head -3 "$WORK/t-$t.log"; restore_failed=1; break; fi
  done
fi

begin "Bật lại trigger"
if [ "$RUN" = 1 ]; then
  for t in $ORDER; do psqlq -c "alter table public.$t enable trigger user"; done
  [ "$restore_failed" = 0 ] || die "một bảng nạp lỗi (trigger đã được bật lại). Xem lỗi ở trên, chưa trả hàm handle_new_user thật!"
fi

begin "Đặt lại bộ đếm id của bảng phases (nạp từng bảng không tự đặt lại)"
if [ "$RUN" = 1 ]; then tool psql "$SUPABASE_DB_URL" -At -q -c "select setval(pg_get_serial_sequence('public.phases', 'id'), (select max(id) from public.phases))" >/dev/null; fi

begin "Nạp lịch sử migration (migrations.dump)"
if [ "$RUN" = 1 ]; then tool pg_restore --data-only --no-owner -d "$SUPABASE_DB_URL" migrations.dump; fi

begin "Trả lại hàm handle_new_user THẬT và trigger tạo hồ sơ (migration 36)"
if [ "$RUN" = 1 ]; then
  docker run --rm ${NET[@]+"${NET[@]}"} -e URL="$SUPABASE_DB_URL" -v "$HERE/migrations/20261022000036_auth_user_trigger.sql":/m/036.sql:ro --entrypoint psql "$IMG" "$SUPABASE_DB_URL" -q -v ON_ERROR_STOP=1 -f /m/036.sql
fi

begin "Tạo lại các job pg_cron (cron-jobs.sql; cần extension pg_cron đã bật)"
if [ "$RUN" = 1 ]; then
  if [ -s "$WORK/opened/cron-jobs.sql" ]; then
    if tool psql "$SUPABASE_DB_URL" -q -v ON_ERROR_STOP=1 -f cron-jobs.sql; then echo "   xong"; else echo "   LỖI: bật extension pg_cron (Database → Extensions) rồi chạy lại riêng bước này: ... --from 11 --until 11"; fi
  else echo "   backup không có job nào"; fi
fi

begin "Đối chiếu số liệu"
if [ "$RUN" = 1 ]; then
  docker run --rm ${NET[@]+"${NET[@]}"} -v "$HERE/verify-counts.sql":/v.sql:ro --entrypoint psql "$IMG" "$SUPABASE_DB_URL" -At -F '|' -f /v.sql > "$WORK/after.txt"
  if [ -n "${BASELINE:-}" ] && [ -f "$BASELINE" ]; then
    if diff "$BASELINE" "$WORK/after.txt" > "$WORK/diff.txt"; then echo "   ĐẠT: $(wc -l < "$WORK/after.txt" | tr -d ' ') chỉ số khớp mốc $BASELINE"
    else echo "   KHÁC mốc (các dòng < là trước, > là sau; auth.sessions/refresh_tokens đổi khi có người đăng nhập là bình thường):"; sed 's/^/   /' "$WORK/diff.txt"; fi
  else
    sed 's/|/: /; s/^/   /' "$WORK/after.txt" | grep -E "rows (public|auth\.(users|sessions))|handle_new_user|trigger on|pg_cron|disabled"
    echo "   (đặt BASELINE=/đường/dẫn/baseline.txt để tự so sánh)"
  fi
fi
echo; echo "Xong. Nếu thấy 'handle_new_user is the real one: true' và 'user triggers disabled: 0' là ổn."
