# Supabase / Postgres migrations

SQL in this directory targets the **Supabase Postgres** database and is applied
by a maintainer, not by CI.

Do **not** put Postgres SQL in `services/api/migrations/`. That directory is the
**Cloudflare D1 (SQLite)** migration set and the `migrate-db` job in
`.github/workflows/build.yaml` applies every file in it with
`wrangler d1 migrations apply data-d1 --remote`. A Postgres file there fails the
deploy with `unknown database public ... SQLITE_ERROR [code: 7500]`.
