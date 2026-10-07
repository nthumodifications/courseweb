# Contributing to NTHUMods

## 快速開始（繁體中文）

在專案根目錄執行 `bun run setup`，再執行 `bun run dev:web`，即可在
`http://localhost:5173` 開始前端開發。前端開發會直接連到正式站的服務（不是測試環境，登入後儲存的資料是真的），不需要
密鑰；`bun run doctor` 可以檢查設定。需要 API、登入服務或資料同步時，請先和
維護者確認權限與資料庫，再執行 `bun run setup --full`。

## Before your first change

Use Bun 1.3 or newer, clone the repository, and run:

```bash
bun run setup
bun run dev:web
```

The setup command does not overwrite existing env files. It creates
`apps/web/.env.development.local` from the safe browser example and points frontend-only
development at the production API through a dev-server proxy. It is the real service, not a sandbox: data you save while signed in is saved for real, and public write forms (issues, recruitment, shortlinks) are blocked locally. No local database or secret is
needed for the usual student-contributor path.

## Choose a development track

### Frontend only (most contributors)

Edit pages in `apps/web/src/app`, components in `apps/web/src/components`, and
shared UI in `packages/ui/src`. The web workspace has focused commands:

```bash
bun run --cwd apps/web type-check
bun run --cwd apps/web test
bun run --cwd apps/web lint
```

If type-checking cannot resolve API declarations, run `bun run setup --full`.
The full preparation builds the API and secure-api declaration chain, but it
does not provide maintainer credentials for running those services.

### API (`services/api`)

This is the Hono Cloudflare Worker. It uses port 5001 under Wrangler. Run
`bun run setup --full`, then configure `services/api/.dev.vars` with the values
from a maintainer before using:

```bash
bun run dev:api
bun run --cwd services/api test
```

`services/api/.dev.vars.example` documents only optional AI provider settings.
The Worker also uses D1/AI/rate-limit bindings from `services/api/wrangler.toml`
and may need Supabase, Algolia admin, OAuth, weather, calendar, GitHub,
Turnstile, KV, or OCR credentials depending on the route.

### Auth (`services/secure-api`) + data-sync

The secure API is a Bun/Hono service on port 5002. It needs PostgreSQL,
Prisma-generated clients, signing keys, Firebase, and upstream OAuth settings.
The data-sync tool mutates course data and search indexes and requires
service-role/admin credentials. These are maintainer workflows:

```bash
bun run setup --full
bun run dev:secure-api
bun run --cwd services/secure-api test
bun run --cwd tools/data-sync sync:once
```

Do not run data-sync against shared infrastructure without an explicit review.

## Your first PR

1. Create a branch and make one focused change. Do not edit dictionary JSON
   directly unless the change is the dictionary itself.
2. For new or changed UI, add or update the closest web test when practical.
3. For translations, use `bun run dict -- create`, `remove`, or `move`; the
   command updates the dictionaries consistently across supported languages.
4. Run the focused web checks:

   ```bash
   bun run --cwd apps/web type-check
   bun run --cwd apps/web test
   ```

5. Review the diff, describe the user-visible behavior, and open a PR against
   `main`. Follow the repository's Conventional Commits convention for the PR
   title/commit message.

## Troubleshooting

- Run `bun run doctor` when setup is unclear. It checks Bun, dependencies, env
  files, and expected build outputs without changing anything.
- A missing `VITE_*` value usually means Vite was started before
  `apps/web/.env.development.local` was created. Run setup and restart the dev server.
- A web type-check failure mentioning `@courseweb/api-types` or secure-api
  `dist` means the full declaration chain has not been built. Use
  `bun run setup --full`.
- `services/api` is port 5001, `services/secure-api` is port 5002, and the web
  app is port 5173. Vite chooses another free port when needed.
- PowerShell, Git Bash, and macOS/Linux are supported for setup. The data-sync
  shell helper is platform-specific: use `run-docker.bat` on Windows or
  `run-docker.sh` on macOS/Linux.
