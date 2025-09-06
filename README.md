![Frame 3](https://github.com/nthumodifications/courseweb/assets/74640729/c810b72f-e428-47bc-8f5b-22a49c4eb1a0)

# 國立清華大學非公式的開源預排，選課，課表網站

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
│   ├── web/                # Main Next.js web application
│   ├── mobile/             # Capacitor mobile app (iOS/Android)
│   ├── admin/              # Admin dashboard (planned)
│   └── docs/               # Documentation site (planned)
├── packages/               # Shared packages
│   ├── ui/                 # Shared React components (40+ components)
│   ├── shared/             # Shared utilities, types, and constants
│   ├── database/           # Database schema and migrations
│   └── eslint-config/      # Shared ESLint configuration
├── services/               # Backend services (git submodules)
│   ├── api/                # Main API service (Cloudflare Workers)
│   ├── secure-api/         # Authentication API service
│   └── discord-bot/        # Discord integration service
└── tools/                  # Development and build tools
    ├── data-sync/          # Course data synchronization tools
    ├── dict-manager/       # i18n dictionary management CLI
    └── build-scripts/      # Build automation and CI/CD scripts
```

### Package Overview

| Package                 | Description              | Technology                         |
| ----------------------- | ------------------------ | ---------------------------------- |
| `@courseweb/web`        | Main web application     | Next.js 14, App Router, TypeScript |
| `@courseweb/mobile`     | Mobile application       | Capacitor, Ionic                   |
| `@courseweb/ui`         | UI component library     | React, Radix UI, Tailwind CSS      |
| `@courseweb/shared`     | Shared utilities & types | TypeScript                         |
| `@courseweb/database`   | Database schema          | SQL, Migrations                    |
| `@courseweb/api`        | Main API service         | Hono, Cloudflare Workers           |
| `@courseweb/secure-api` | Auth API service         | Hono, Cloudflare Workers           |

## 🚀 Technologies Used

**Frontend:**

- [Next.js 14](https://nextjs.org/) with App Router
- [React 18](https://reactjs.org/) with Server Components
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Framer Motion](https://www.framer.com/motion/) for animations

**Backend:**

- [Hono](https://hono.dev/) web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) for serverless compute
- [Supabase](https://supabase.com/) for database and authentication
- [Firebase](https://firebase.google.com/) for additional services

**Mobile:**

- [Capacitor](https://capacitorjs.com/) for cross-platform mobile apps
- [Ionic](https://ionicframework.com/) for mobile UI components

**Infrastructure:**

- [Turborepo](https://turbo.build/) for monorepo management
- [Vercel](https://vercel.com/) for web deployment
- [DigitalOcean](https://www.digitalocean.com/) for production hosting
- [Algolia](https://www.algolia.com/) for search functionality

## 🌐 Usage

Access the website at **[nthumods.com](https://nthumods.com)**

For issues, feature requests, or bug reports, please [open an issue](https://github.com/nthumodifications/courseweb/issues/new/choose).

## 🛠️ Development

### Prerequisites

- **Node.js 20+**
- **npm** (comes with Node.js)
- **Git** with submodules support

### Quick Start

1. **Clone the repository with submodules:**

   ```bash
   git clone --recursive https://github.com/nthumodifications/courseweb.git
   cd courseweb
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server:**

   ```bash
   npm run dev
   # or for faster builds:
   npm run dev-turbo
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
# Development
npm run dev                 # Start all development servers
npm run dev-turbo          # Start with Turbo for faster builds
npm run dev:web            # Start only web app
npm run dev:mobile         # Start mobile development

# Building
npm run build              # Build all packages and apps
npm run build:web          # Build only web app
npm run build:mobile       # Build mobile app

# Tools
npm run dict               # Manage translation dictionary
npm run sync:once          # Sync course data once
npm run sync:scheduled     # Start scheduled sync service

# Mobile
npm run sync:mobile        # Sync mobile app
npm run build:ios          # Build iOS app
npm run build:android      # Build Android app

# Utilities
npm run lint               # Lint all packages
npm run type-check         # TypeScript type checking
npm run clean              # Clean build artifacts
```

### Monorepo Commands

The project uses **Turborepo** for efficient task running:

```bash
# Run build for specific package
npx turbo run build --filter=@courseweb/web

# Run dev for all packages
npx turbo run dev

# Run tests with dependencies
npx turbo run test --filter=@courseweb/ui...

# Clear Turborepo cache
npx turbo run clean
```

## 📱 Mobile Development

The mobile app is built with **Capacitor** and supports both iOS and Android:

```bash
# Install mobile dependencies
cd apps/mobile
npm install

# Sync web assets to mobile
npm run sync:mobile

# Run on iOS simulator
npm run build:ios

# Run on Android emulator
npm run build:android
```

## 🌍 Internationalization

We use a custom dictionary management system for translations:

```bash
# Create new translation entry
npm run dict -- create "settings.theme" "主題" "Theme"

# Remove translation entry
npm run dict -- remove "old.key"

# Move/rename translation key
npm run dict -- move "old.key" "new.key"
```

## 🤝 Contributing

We welcome contributions from everyone! Here's how to get started:

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/courseweb.git
cd courseweb
npm install
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
- Test your changes: `npm run dev-turbo`

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
- **Testing**: Add tests for new features (we use Vitest)
- **Performance**: Consider bundle size and runtime performance

## 🚀 Deployment

### Web Application (Primary)

The web app is deployed on **Vercel** with automatic deployments from `main` branch.

**Production**: [nthumods.com](https://nthumods.com)

### Docker Deployment

For self-hosting, use the provided Docker configuration:

```bash
# Build Docker image (run from repository root)
docker build -f apps/web/Dockerfile -t nthumods-web .

# Run container
docker run -p 3000:3000 nthumods-web
```

**Note**: The Dockerfile is located in `apps/web/Dockerfile` but must be run from the repository root to access the monorepo structure and shared packages.

### Environment Variables

Required environment variables (see `apps/web/.env.local.example`):

```env
# Database
DATABASE_URL=
DIRECT_URL=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# External Services
SUPABASE_URL=
SUPABASE_ANON_KEY=
ALGOLIA_APP_ID=
ALGOLIA_API_KEY=

# Optional
SENTRY_AUTH_TOKEN=
TURNSTILE_SECRET_KEY=
```

## 📊 Performance & Monitoring

- **Performance**: Web Vitals monitoring with Vercel Analytics
- **Error Tracking**: Sentry integration for error monitoring
- **Search**: Algolia for lightning-fast course search
- **Caching**: Aggressive caching strategy with Vercel Edge Network
- **Bundle Analysis**: Built-in bundle analyzer (`npm run analyze`)

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
