![Frame 3](https://github.com/nthumodifications/courseweb/assets/74640729/c810b72f-e428-47bc-8f5b-22a49c4eb1a0)

# 國立清華大學非公式的開源預排，選課，課表網站

[![Build and Deploy](https://github.com/nthumodifications/courseweb/actions/workflows/build.yaml/badge.svg?branch=main)](https://github.com/nthumodifications/courseweb/actions/workflows/build.yaml)

The unofficial open-source course preselection, timetable builder, and course catalog website!

We are a passionate team of students dedicated to improving the technological standards of NTHU through students. We hope that with our efforts and yours, we'll make NTHU great again!

Since its inception, NTHUMods has been continuously enhanced with features like:

- 📚 **Course Selector** - Advanced course search and filtering
- 📅 **Timetable Builder** - Interactive drag-and-drop course scheduling
- 🎓 **Graduation Planner** - Track your academic progress
- 🚍 **Bus Schedule** - Real-time campus shuttle information
- 📱 **Mobile Support** - Progressive Web App with offline capabilities
- 🌐 **Multi-Language Support** - Traditional Chinese and English
- 🏫 **Venue Explorer** - Campus building and room finder
- 💬 **Course Reviews** - Student feedback and ratings
- 🔗 **Calendar Integration** - Export to Google Calendar, iCal
- 📊 **Grade Analytics** - Academic performance tracking

The platform has gained significant traction, now boasting over **3,000+ active users**. It is proudly supported under NTHU IDEAL, CLC, and CLL projects.

Follow more updates on [Instagram](https://www.instagram.com/nthumods/) | [Website](https://nthumods.com)

## 🏗️ Monorepo Structure

This project is organized as a modern monorepo using **Turborepo** for efficient builds and development:

```
courseweb/
├── apps/web/              # Main Vite + React web application
├── packages/              # Shared UI, types, database, and config packages
├── services/api/          # Main Hono Cloudflare Worker API
├── services/secure-api/   # Bun/Hono authentication API
├── tools/data-sync/       # Course data synchronization
├── tools/dict-manager/    # i18n dictionary CLI
└── docs/                  # Project documentation
```

## 🚀 Technologies Used

- **Frontend:** Vite 5, React 18, React Router 6, TypeScript, Tailwind CSS, Radix UI
- **Backend:** Hono, Cloudflare Workers, Supabase, Firebase, Prisma
- **Infrastructure:** Turborepo, Cloudflare Workers, DigitalOcean, Algolia

## 🌐 Usage

Access the website at **[nthumods.com](https://nthumods.com)**.

For issues, feature requests, or bug reports, please [open an issue](https://github.com/nthumodifications/courseweb/issues/new/choose).

## 🛠️ Development

### Prerequisites and quick start

- **Bun 1.3 or newer** (`packageManager` pins 1.3.11; other 1.3.x versions normally work)
- **Git**

```bash
git clone https://github.com/nthumodifications/courseweb.git
cd courseweb
bun run setup
bun run dev:web
```

Open [http://localhost:5173](http://localhost:5173). `bun run setup` installs the
locked dependencies, creates `apps/web/.env.development.local` only when it is missing, and
builds the frontend-safe shared packages. The example points at the production API through a dev-server proxy. It is the real service, not a sandbox: data you save while signed in is saved for real, and public write forms (issues, recruitment, shortlinks) are blocked locally. Use `bun run doctor` to diagnose a setup without changing files.

### Development tracks

#### Frontend only (most contributors)

Use `bun run setup`, then `bun run dev:web`. Pages live under
`apps/web/src/app`; reusable UI is in `packages/ui`, shared code is in
`packages/shared`, and API client types are in `packages/api-types`.

Useful checks, scoped to the web workspace:

```bash
bun run --cwd apps/web type-check
bun run --cwd apps/web test
bun run --cwd apps/web lint
```

The web type-check imports declarations from API workspaces. If it reports
missing `dist` declarations after a fresh clone, run `bun run setup --full`;
that path also needs backend configuration before the API services can run.

#### API (`services/api`)

The main API is a Cloudflare Worker. It normally listens on
`http://localhost:5001` and reads `services/api/.dev.vars`. Start with
`bun run setup --full`, fill the maintainer-owned values described in
`services/api/README.md`, then run:

```bash
bun run dev:api
```

The checked-in `services/api/.dev.vars.example` contains only optional AI
provider settings. Database, Supabase service-role, Algolia admin, OAuth,
weather, calendar, GitHub, Turnstile, and Cloudflare KV credentials are not
frontend credentials and must come from a maintainer.

#### Auth (`services/secure-api`) + data-sync

The secure API listens on `http://localhost:5002`; it needs PostgreSQL,
Prisma-generated clients, signing keys, Firebase configuration, and upstream
OAuth credentials. The data-sync tool writes course data and Algolia indexes;
it needs a Supabase service-role key and an Algolia admin key. These are
maintainer-only operations, not part of the frontend quick start.

```bash
bun run setup --full
bun run dev:secure-api
bun run --cwd tools/data-sync sync:once
```

Do not run the sync command without explicit maintainer credentials and a
review of the target database/index.

### Scripts and i18n

The root scripts are the supported entry points: `bun run build`, `bun run
build:web`, `bun run build:apis`, `bun run build:api-types`, `bun run test`,
`bun run dict`, `bun run sync:once`, and `bun run sync:scheduled`. For a
production web preview use `bun run build:web` followed by `bun run --cwd apps/web
preview`.

Translation dictionaries are JSON files under `apps/web/src/dictionaries`.
Use the dictionary CLI rather than editing key structure by hand:

```bash
bun run dict -- create "settings.theme" "主題" "Theme"
bun run dict -- remove "old.key"
bun run dict -- move "old.key" "new.key"
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the first-PR walkthrough and the
three development tracks.

### Troubleshooting

- `Bun ... is too old`: run `bun upgrade`, then rerun `bun run setup`. A
  different 1.3.x patch version only prints a notice.
- Requests going to `http://localhost:5001` during frontend-only work: Vite
  loads `apps/web/.env.development` before `.env.local`, so overrides must
  live in `apps/web/.env.development.local` (what `bun run setup` creates).
- `supabaseUrl is required` or `VITE_COURSEWEB_API_URL is not defined`: run
  `bun run setup` and restart Vite. Use only `apps/web/.env.example` for the
  browser environment.
- CORS errors for `https://api.nthumods.com` from `localhost`: the production
  API only allows the nthumods.com origin. Keep
  `VITE_COURSEWEB_API_URL=http://localhost:5173/__api` so requests go through
  the dev-server proxy, and update the port if Vite runs on another one.
- A `401` from the production API is an application/auth response; it is not
  the same as a missing local Worker. Public course reads should still use the
  production API configured in `apps/web/.env.development.local`.
- Missing `@courseweb/api-types` or secure API declarations during web
  type-check means the backend dist chain has not been built. Run
  `bun run setup --full` and fill backend env values where required.
- API local development uses port 5001; secure API uses port 5002; Vite uses
  port 5173 and selects another free port if necessary.
- `bun run setup --full` creates ignored env files from examples but never
  invents secrets. Backend services remain unavailable until their real
  maintainer credentials and databases are configured.

### Windows notes

Run commands from the repository root in PowerShell, Git Bash, or macOS/Linux
shells. `bun run setup` and `bun run doctor` do not depend on `cp`, `rm`, or
shell-specific environment syntax. For data-sync Docker helpers, use
`tools/data-sync/run-docker.bat` on Windows and `run-docker.sh` on macOS/Linux.

## 📱 Progressive Web App

NTHUMods is an installable Progressive Web App configured through
`vite-plugin-pwa`. Build and preview it with:

```bash
bun run build:web
bun run --cwd apps/web preview
```

## 🤝 Contributing

We welcome contributions from everyone. Read [CONTRIBUTING.md](CONTRIBUTING.md)
for setup, the frontend/API/auth tracks, focused checks, and the first-PR
walkthrough. We follow [Conventional Commits](https://www.conventionalcommits.org/).

## 🚀 Deployment

The web app is a Vite static application deployed to Cloudflare Workers using
`apps/web/wrangler.toml` and `apps/web/worker.ts`. The API service is deployed
to Cloudflare Workers from `main` through GitHub Actions.

**Production:** [nthumods.com](https://nthumods.com)

`apps/web/Dockerfile` still targets the previous Next.js application structure
and is not part of the current Vite deployment workflow.

## 📊 Performance & Monitoring

- **Error Tracking:** Sentry integration through the Vite build
- **Search:** Algolia-powered course search with a production API fallback
- **Offline Support:** Service worker and runtime caching through Vite PWA
- **Production Builds:** Vite bundling with source maps and Turborepo caching

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.

- ✅ **You can:** Use, modify, distribute, and contribute
- ❌ **You must:** Keep it open source, include license and copyright
- 📖 **Learn more:** [License Details](LICENSE) | [GPL-3.0 Guide](https://gist.github.com/kn9ts/cbe95340d29fc1aaeaa5dd5c059d2e60)

## 👥 Team

**Core Contributors:**

- [Chew Tzi Hwee](https://github.com/ImJustChew) - Project Lead & Full-Stack Developer
- [Joshua Lean](https://github.com/Joshimello) - Frontend Developer & UI/UX Designer
- [Huang Shi Jie](https://github.com/SJieNg123) - Backend Developer & DevOps

**Want to join?** Email us at [nthumods@gmail.com](mailto:nthumods@gmail.com)

## 🙏 Acknowledgements

**Academic Support:**

- [National Tsing Hua University Interdisciplinary Program](https://ipth.site.nthu.edu.tw/p/406-1462-267815,r9940.php) - Academic backing and project support

**Technology Partners:**

- [Algolia](https://www.algolia.com/) - Powering our course search
- [Cerana Technology](https://cerana.tech/) - Sponsoring our infrastructure
- [Cloudflare](https://www.cloudflare.com/) - API hosting and CDN services

## 🔗 Links

- **Website:** [nthumods.com](https://nthumods.com)
- **Issues:** [GitHub Issues](https://github.com/nthumodifications/courseweb/issues)
- **Instagram:** [@nthumods](https://www.instagram.com/nthumods/)
