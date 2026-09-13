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
├── apps/                    # Applications
│   └── web/                # Main Vite + React web application
├── packages/               # Shared packages
│   ├── api-types/          # Shared Hono API types and client factories
│   ├── database/           # Database schema and migrations
│   ├── eslint-config/      # Shared ESLint configuration
│   ├── shared/             # Shared utilities, types, and constants
│   ├── tailwind-config/    # Shared Tailwind CSS configuration
│   ├── ui/                 # Shared React components (40+ components)
├── services/               # Backend service workspaces
│   ├── api/                # Main API service (Cloudflare Workers)
│   └── secure-api/         # Authentication API service
├── tools/                  # Development and build tools
│   ├── build-scripts/      # Build automation scripts
│   ├── data-sync/          # Course data synchronization tools
│   └── dict-manager/       # i18n dictionary management CLI
└── docs/                   # Project documentation
```

### Package Overview

| Package                      | Description                    | Technology                       |
| ---------------------------- | ------------------------------ | -------------------------------- |
| `@courseweb/web`             | Main web application           | Vite 5, React 18, React Router 6 |
| `@courseweb/ui`              | UI component library           | React, Radix UI, Tailwind CSS    |
| `@courseweb/shared`          | Shared utilities and types     | TypeScript                       |
| `@courseweb/api-types`       | API types and client factories | TypeScript, Hono RPC             |
| `@courseweb/database`        | Database schema and migrations | Supabase, SQL                    |
| `@courseweb/tailwind-config` | Shared Tailwind configuration  | Tailwind CSS                     |
| `@courseweb/eslint-config`   | Shared lint configuration      | ESLint                           |
| `@courseweb/api`             | Main API service               | Hono, Cloudflare Workers, D1     |
| `@courseweb/secure-api`      | Authentication API service     | Hono, Bun, Prisma                |

## 🚀 Technologies Used

**Frontend:**

- [Vite 5](https://vite.dev/) for development and production builds
- [React 18](https://react.dev/) with [React Router 6](https://reactrouter.com/)
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Vite PWA](https://vite-pwa-org.netlify.app/) for installable and offline-capable web experiences

**Backend:**

- [Hono](https://hono.dev/) web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) for serverless compute
- [Supabase](https://supabase.com/) for database and authentication
- [Firebase](https://firebase.google.com/) for additional services

**Infrastructure:**

- [Turborepo](https://turbo.build/) for monorepo management
- [Vercel](https://vercel.com/) for web deployment
- [Cloudflare Workers](https://workers.cloudflare.com/) for API and edge deployment
- [DigitalOcean](https://www.digitalocean.com/) for production hosting
- [Algolia](https://www.algolia.com/) for search functionality

## 🌐 Usage

Access the website at **[nthumods.com](https://nthumods.com)**

For issues, feature requests, or bug reports, please [open an issue](https://github.com/nthumodifications/courseweb/issues/new/choose).

## 🛠️ Development

### Prerequisites

- **Node.js 20+**
- **Bun 1.3+**
- **Git**

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/nthumodifications/courseweb.git
   cd courseweb
   ```

2. **Install dependencies:**

   ```bash
   bun install --frozen-lockfile
   ```

3. **Set up frontend environment variables:**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   # Add the required VITE_* values described below.
   ```

4. **Start the web development server:**

   ```bash
   bun run dev:web
   ```

5. **Open your browser:**
   Navigate to [http://localhost:5173](http://localhost:5173). If that port is already in use, Vite automatically selects the next available port.

To run the backend services locally in separate terminals:

```bash
bun run dev:api          # Main API on http://localhost:5001
bun run dev:secure-api   # Authentication API on http://localhost:5002
```

`bun run dev` starts development tasks across the entire monorepo. For frontend-only work, prefer `bun run dev:web`.

### Available Scripts

```bash
# Development
bun run dev                 # Start development tasks across all workspaces
bun run dev:web             # Start only the web app
bun run dev:api             # Start the main API
bun run dev:secure-api      # Start the authentication API

# Building
bun run build               # Build all packages and apps
bun run build:web           # Build the web app and its dependencies
bun run build:api           # Build the main API
bun run build:secure-api    # Build the authentication API
bun run build:apis          # Build both API services
bun run build:api-types     # Build the shared API types

# Tools
bun run dict                # Manage the translation dictionary
bun run dict:create         # Create a translation entry
bun run dict:remove         # Remove a translation entry
bun run dict:move           # Move or rename a translation entry
bun run sync:once           # Sync course data once
bun run sync:scheduled      # Start the scheduled sync service

# Utilities
bun run lint                # Lint all packages
bun run test                # Run workspace tests
bun run format              # Format TypeScript, TSX, and Markdown files
bun run clean               # Clean build artifacts
bunx turbo run type-check   # Run TypeScript checks across supported workspaces
```

### Monorepo Commands

The project uses **Turborepo** for efficient task running:

```bash
# Run build for specific package
bunx turbo run build --filter=@courseweb/web

# Run dev for all packages
bunx turbo run dev

# Run type checks
bunx turbo run type-check

# Clear Turborepo cache
bunx turbo run clean
```

## 📱 Progressive Web App

NTHUMods is an installable Progressive Web App configured through `vite-plugin-pwa`. The manifest, icons, update behavior, and offline caching rules are defined in `apps/web/vite.config.ts`.

```bash
# Build the production PWA
bun run build:web

# Preview the production build locally
bun run --cwd apps/web preview
```

## 🌍 Internationalization

We use a custom dictionary management system for translations:

```bash
# Create new translation entry
bun run dict -- create "settings.theme" "主題" "Theme"

# Remove translation entry
bun run dict -- remove "old.key"

# Move/rename translation key
bun run dict -- move "old.key" "new.key"
```

## 🤝 Contributing

We welcome contributions from everyone! Here's how to get started:

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/courseweb.git
cd courseweb
bun install --frozen-lockfile
```

### 2. Create a Branch

```bash
git checkout -b feat/my-awesome-feature
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Follow our coding standards (ESLint + Prettier configured)
- Add tests if applicable
- Update documentation as needed
- Test your changes with `bun run test` and `bun run build:web`

### 4. Commit & Push

```bash
git add .
git commit -m "feat: add awesome new feature"
git push origin feat/my-awesome-feature
```

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### 5. Open a Pull Request

- Create a PR against the `main` branch
- Provide a clear description of your changes
- Link any related issues
- Wait for review and CI checks

### Development Guidelines

- **Code Style**: We use ESLint + Prettier (automatically configured)
- **TypeScript**: All new code should be properly typed
- **Components**: Use shared UI components from `@courseweb/ui` when possible
- **Testing**: Add tests where applicable and run them with Bun/Turborepo
- **Performance**: Consider bundle size and runtime performance

## 🚀 Deployment

### Web Application (Primary)

The web app is built as a Vite static application. The repository includes:

- `vercel.json` for Vercel builds, with output from `apps/web/dist`
- `apps/web/wrangler.toml` and `apps/web/worker.ts` for Cloudflare Workers deployment

The API service is deployed to Cloudflare Workers from the `main` branch through GitHub Actions.

**Production**: [nthumods.com](https://nthumods.com)

### Docker Status

`apps/web/Dockerfile` still targets the previous Next.js application structure and is not part of the current Vite deployment workflow. It must be migrated before Docker self-hosting is supported again.

### Environment Variables

Frontend variables are exposed to the browser and must use the `VITE_` prefix. Configure them in `apps/web/.env.local`:

```env
# Main API
VITE_COURSEWEB_API_URL=http://localhost:5001

# Authentication
VITE_NTHUMODS_AUTH_URL=
VITE_AUTH_CLIENT_ID=
VITE_NTHUMODS_AUTH_REDIRECT=http://localhost:5173/auth/callback
VITE_NTHUMODS_AUTH_SILENT_REDIRECT=http://localhost:5173/auth/silent

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Search
VITE_ALGOLIA_APP_ID=
VITE_ALGOLIA_SEARCH_KEY=
VITE_ALGOLIA_BACKUP_APP_ID=
VITE_ALGOLIA_BACKUP_SEARCH_KEY=

# Turnstile
VITE_TURNSTILE_SITE_KEY=

# Optional analytics
VITE_GTM_ID=
```

Never place private credentials in a `VITE_*` variable because Vite includes these values in the client bundle. Database URLs, service-role keys, API keys, signing keys, and other server secrets belong in their respective service environments. See `services/api/wrangler.toml`, `services/api/README.md`, and `services/secure-api/.env.example` for backend configuration.

## 📊 Performance & Monitoring

- **Error Tracking**: Sentry integration through the Vite build
- **Search**: Algolia-powered course search
- **Offline Support**: Service worker and runtime caching through Vite PWA
- **Production Builds**: Vite bundling with source maps and Turborepo caching

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.

- ✅ **You can**: Use, modify, distribute, and contribute
- ❌ **You must**: Keep it open source, include license and copyright
- 📖 **Learn more**: [License Details](LICENSE) | [GPL-3.0 Guide](https://gist.github.com/kn9ts/cbe95340d29fc1aaeaa5dd5c059d2e60)

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

- [Algolia](https://www.algolia.com/) - Powering our lightning-fast course search functionality
- [Cerana Technology](https://cerana.tech/) - Sponsoring our infrastructure to keep the project running

**Infrastructure:**

- [Vercel](https://vercel.com/) - Web hosting and deployment platform
- [DigitalOcean](https://www.digitalocean.com/) - Production infrastructure
- [Cloudflare](https://www.cloudflare.com/) - API hosting and CDN services

## 🔗 Links

- **Website**: [nthumods.com](https://nthumods.com)
- **Instagram**: [@nthumods](https://www.instagram.com/nthumods/)
- **Email**: [nthumods@gmail.com](mailto:nthumods@gmail.com)
- **GitHub**: [nthumodifications/courseweb](https://github.com/nthumodifications/courseweb)

## 💡 Inspiration

Inspired by [NUSMods](https://nusmods.com) from the National University of Singapore. The lack of a modern, student-friendly course planning system at NTHU motivated us to create this open-source alternative that puts students first.

---

**Made with ❤️ by students, for students at National Tsing Hua University**
