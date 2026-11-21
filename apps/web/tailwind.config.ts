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
  theme: {
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...sharedConfig.theme?.extend?.colors,
        // Soft grey between the theme's muted and background colours, so it
        // follows every theme preset instead of being a fixed value.
        surface:
          "color-mix(in srgb, hsl(var(--muted)) 60%, hsl(var(--background)))",
      },
    },
  },
};

export default config;
