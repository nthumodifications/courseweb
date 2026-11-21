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
        surface: "hsl(var(--surface))",
      },
    },
  },
};

export default config;
