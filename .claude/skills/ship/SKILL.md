---
name: ship
description: Check, commit and push the web app to main (Vercel auto-deploys).
disable-model-invocation: true
---

# Ship to production

1. Under Node 24 (`source ~/.nvm/nvm.sh && nvm use` in `web/`), run `npm run typecheck`, `npm test` and `npm run build`. All three pass before going on. `npm test` includes `tests/i18n.test.ts`: every UI string added since the last push is in both `vi.json` and `en.json` (see `.claude/rules/web-i18n.md`).
2. Confirm every migration file added since the last push has been applied: compare `web/supabase/migrations/` with the Supabase MCP `list_migrations` for project `aqguszxitrgbdczvqres`. A file the user ran in the SQL Editor (the MCP refuses functions whose body deletes) is not listed there, so check what it creates in the live catalog instead (`pg_proc`, `pg_views`). Apply or report any gap before pushing, because the deployed app expects the schema.
3. Review `git status` and `git diff --stat`. Stage the project files by name; `.env` and `.claude/settings.local.json` stay out.
4. Commit on `main` with a message summarising the user-visible change, then `git push origin main` (SSH remote).
5. Report the commit hash, and list the flows the user should try on the Vercel URL after deploy, naming any that were not tested logged in.
