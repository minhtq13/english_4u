---
name: ship
description: Check, commit and push the web app to main (Vercel auto-deploys).
disable-model-invocation: true
---

# Ship to production

1. Under Node 24 (`source ~/.nvm/nvm.sh && nvm use` in `web/`), run `npm run typecheck` and `npm run build`. Both pass before going on.
2. Confirm every migration file added since the last push has been applied: compare `web/supabase/migrations/` with the Supabase MCP `list_migrations` for project `aqguszxitrgbdczvqres`. Apply or report any gap before pushing, because the deployed app expects the schema.
3. Review `git status` and `git diff --stat`. Stage the project files by name; `.env` and `.claude/settings.local.json` stay out.
4. Commit on `main` with a message summarising the user-visible change, then `git push origin main` (SSH remote).
5. Report the commit hash, and list the flows the user should try on the Vercel URL after deploy, naming any that were not tested logged in.
