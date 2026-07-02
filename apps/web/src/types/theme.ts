export type ThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export type ThemeDensity = "compact" | "comfortable" | "spacious";
export type ThemeBackground = "solid" | "gradient" | "dots" | "lines" | "noise";
export type ThemeFont =
  | "inter"
  | "jakarta"
  | "nunito"
  | "dm-sans"
  | "montserrat"
  | "mono";

export type ThemeCSSVar =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "border"
  | "input"
  | "ring"
  | "sidebar-background"
  | "sidebar-foreground"
  | "sidebar-primary"
  | "sidebar-primary-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"
  | "sidebar-border"
  | "sidebar-ring";

export interface ThemePresetColors {
  light: Partial<Record<ThemeCSSVar, string>>;
  dark: Partial<Record<ThemeCSSVar, string>>;
}

export interface ThemePreset {
  id: string;
  label: string;
  labelZh: string;
  // hex preview swatches shown in picker
  preview: {
    bg: string; // background color hex
    fg: string; // foreground/text hex
    accent: string; // primary/accent hex
  };
  colors: ThemePresetColors;
}

export interface ThemeConfig {
  version: 1;
  preset: string; // matches a ThemePreset.id; 'nthumods' is default
  radius: ThemeRadius; // default 'md'
  fontScale: number; // 0.875 to 1.25, default 1.0
  density: ThemeDensity; // default 'comfortable'
  background: ThemeBackground; // default 'solid'
  font?: ThemeFont;
  backgroundGradientFrom?: string; // CSS color string
  backgroundGradientTo?: string; // CSS color string
  backgroundGradientDir?: string; // e.g. '135deg'
  accentOverride?: string; // HSL string override for --primary e.g. "273 43% 54%"
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  version: 1,
  preset: "nthumods",
  radius: "md",
  fontScale: 1.0,
  density: "comfortable",
  background: "solid",
};

export const RADIUS_VALUES: Record<ThemeRadius, string> = {
  none: "0rem",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
};

export const DENSITY_VALUES: Record<ThemeDensity, number> = {
  compact: 0.75,
  comfortable: 1.0,
  spacious: 1.25,
};

export const FONT_DEFINITIONS: Record<
  ThemeFont,
  { label: string; googleFamily: string | null; cssFamily: string }
> = {
  inter: {
    label: "Inter",
    googleFamily: null,
    cssFamily: '"Inter", sans-serif',
  },
  jakarta: {
    label: "Jakarta",
    googleFamily: "Plus+Jakarta+Sans:wght@400;500;600;700",
    cssFamily: '"Plus Jakarta Sans", sans-serif',
  },
  nunito: {
    label: "Nunito",
    googleFamily: "Nunito:wght@400;500;600;700",
    cssFamily: '"Nunito", sans-serif',
  },
  "dm-sans": {
    label: "DM Sans",
    googleFamily: "DM+Sans:wght@400;500;600;700",
    cssFamily: '"DM Sans", sans-serif',
  },
  montserrat: {
    label: "Montserrat",
    googleFamily: "Montserrat:wght@400;500;600;700",
    cssFamily: '"Montserrat", sans-serif',
  },
  mono: {
    label: "Mono",
    googleFamily: "JetBrains+Mono:wght@400;500;600;700",
    cssFamily: '"JetBrains Mono", monospace',
  },
};
