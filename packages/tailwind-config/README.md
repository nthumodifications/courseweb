# @courseweb/tailwind-config

Shared Tailwind CSS configuration for all CoursWeb applications.

## Overview

This package provides a centralized Tailwind CSS configuration that can be extended by all apps in the monorepo. It ensures consistent styling across all applications while allowing for app-specific customizations.

## Features

- **Consistent Design System**: Shared colors, spacing, typography, and component styles
- **Custom NTHU Branding**: Includes NTHU purple color palette
- **Accessibility**: Proper focus states and hover-only-when-supported variants
- **Animation Support**: Built-in animations for accordions and other components
- **Plugin Integration**: Pre-configured with useful plugins like typography and container queries

## Installation

This package is automatically available to all apps in the monorepo through workspace dependencies.

```json
{
  "dependencies": {
    "@courseweb/tailwind-config": "*"
  }
}
```

## Usage

### In Next.js Apps (TypeScript)

Create or update your `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";
import sharedConfig from "@courseweb/tailwind-config";

const config: Config = {
  ...sharedConfig,
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    // Include all packages that might use Tailwind
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
};

export default config;
```

### In Other Apps (JavaScript)

Use the template from `templates/app.js`:

```javascript
const sharedConfig = require("@courseweb/tailwind-config");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Include all packages that might use Tailwind
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};
```

## Important: Content Paths

Make sure to include the packages directories in your content paths so Tailwind can scan UI components from the monorepo packages:

```typescript
content: [
  // Your app files
  "./src/**/*.{ts,tsx}",
  // Monorepo packages
  "../../packages/ui/src/**/*.{ts,tsx}",
  "../../packages/shared/src/**/*.{ts,tsx}",
],
```

## Color Palette

### NTHU Colors

- `nthu-50` to `nthu-950`: Complete NTHU purple palette

### Semantic Colors

- `primary`, `secondary`, `destructive`, `muted`, `accent`: Theme-aware colors
- `background`, `foreground`, `border`, `input`, `ring`: Base colors
- `sidebar-*`: Sidebar-specific colors

## Custom Features

### Animations

- `accordion-down`, `accordion-up`: For collapsible content

### Hover Variants

- Uses `hover-only-when-supported` for better touch device compatibility

### CSS Variables

All colors use CSS variables for easy theme switching between light and dark modes.

## Included Plugins

- `tailwindcss-animate`: Animation utilities
- `@tailwindcss/typography`: Rich text styling
- `tailwind-scrollbar`: Custom scrollbar styling
- `@tailwindcss/container-queries`: Container query support

## Extending the Configuration

You can extend or override any part of the shared configuration:

```typescript
const config: Config = {
  ...sharedConfig,
  theme: {
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme?.extend,
      // Your custom extensions
      colors: {
        ...sharedConfig.theme?.extend?.colors,
        brand: {
          100: "#custom-color",
        },
      },
    },
  },
};
```

## PostCSS Configuration

Don't forget to set up PostCSS in your app:

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Global CSS

Import Tailwind directives in your global CSS file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Troubleshooting

### Styles Not Applied from Packages

Make sure your `content` paths include the packages directories:

```typescript
content: [
  "../../packages/ui/src/**/*.{ts,tsx}",
  "../../packages/shared/src/**/*.{ts,tsx}",
];
```

### Build Errors

Ensure you have the necessary dependencies installed:

```bash
npm install
```

### Dark Mode Issues

The configuration uses class-based dark mode. Make sure your app implements dark mode switching correctly.

## Contributing

When modifying the shared configuration:

1. Consider backward compatibility
2. Test changes across all apps
3. Update this README if adding new features
4. Follow the existing naming conventions

## Dependencies

This package includes the following Tailwind plugins:

- `tailwindcss-animate`
- `@tailwindcss/typography`
- `tailwind-scrollbar`
- `@tailwindcss/container-queries`

These are automatically available to apps that extend this configuration.
