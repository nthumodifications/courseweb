export type ThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export type ThemeDensity = "compact" | "comfortable" | "spacious";
export type ThemeBackground = "solid" | "gradient" | "dots" | "lines" | "noise";
export type ThemeFont =
  // Chinese-capable faces come first: this is a Traditional Chinese product.
  | "system-tc"
  | "noto-sans-tc"
  | "noto-serif-tc"
  // Latin faces. Each one still falls back to a CJK stack for Chinese glyphs.
  | "inter"
  | "jakarta"
  | "nunito"
  | "dm-sans"
  | "montserrat"
  | "mono"
  | "lora";

export type ThemeFontScript = "chinese" | "latin";

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
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "info"
  | "info-foreground"
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

/**
 * Traditional Chinese (Taiwan) system stack. PingFang TC on Apple platforms,
 * Microsoft JhengHei on Windows, Noto Sans CJK TC on Linux and Android. Costs
 * no download, so it is the safe fallback for every face below.
 */
const CJK_TC_STACK =
  '"PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", "Heiti TC", sans-serif';

const CJK_TC_SERIF_STACK =
  '"Songti TC", "PMingLiU", "Noto Serif CJK TC", "Noto Serif TC", serif';

export const FONT_DEFINITIONS: Record<
  ThemeFont,
  {
    label: string;
    script: ThemeFontScript;
    googleFamily: string | null;
    cssFamily: string;
  }
> = {
  // --- Chinese ---
  "system-tc": {
    label: "系統中文",
    script: "chinese",
    googleFamily: null,
    cssFamily: CJK_TC_STACK,
  },
  "noto-sans-tc": {
    label: "思源黑體",
    script: "chinese",
    googleFamily: "Noto+Sans+TC:wght@400;500;600;700",
    cssFamily: `"Noto Sans TC", ${CJK_TC_STACK}`,
  },
  "noto-serif-tc": {
    label: "思源宋體",
    script: "chinese",
    googleFamily: "Noto+Serif+TC:wght@400;500;600;700",
    cssFamily: `"Noto Serif TC", ${CJK_TC_SERIF_STACK}`,
  },
  // --- Latin ---
  // Every Latin face appends the CJK stack so Chinese text keeps a real
  // Traditional Chinese face instead of falling through to generic sans-serif.
  inter: {
    label: "Inter",
    script: "latin",
    googleFamily: null,
    cssFamily: `"Inter", ${CJK_TC_STACK}`,
  },
  jakarta: {
    label: "Jakarta",
    script: "latin",
    googleFamily: "Plus+Jakarta+Sans:wght@400;500;600;700",
    cssFamily: `"Plus Jakarta Sans", ${CJK_TC_STACK}`,
  },
  nunito: {
    label: "Nunito",
    script: "latin",
    googleFamily: "Nunito:wght@400;500;600;700",
    cssFamily: `"Nunito", ${CJK_TC_STACK}`,
  },
  "dm-sans": {
    label: "DM Sans",
    script: "latin",
    googleFamily: "DM+Sans:wght@400;500;600;700",
    cssFamily: `"DM Sans", ${CJK_TC_STACK}`,
  },
  montserrat: {
    label: "Montserrat",
    script: "latin",
    googleFamily: "Montserrat:wght@400;500;600;700",
    cssFamily: `"Montserrat", ${CJK_TC_STACK}`,
  },
  mono: {
    label: "Mono",
    script: "latin",
    googleFamily: "JetBrains+Mono:wght@400;500;600;700",
    cssFamily: `"JetBrains Mono", ui-monospace, ${CJK_TC_STACK}`,
  },
  lora: {
    label: "Lora",
    script: "latin",
    googleFamily: "Lora:wght@400;500;600;700",
    cssFamily: `"Lora", ${CJK_TC_SERIF_STACK}`,
  },
};

export const FONT_ORDER: Record<ThemeFontScript, ThemeFont[]> = {
  chinese: (Object.keys(FONT_DEFINITIONS) as ThemeFont[]).filter(
    (f) => FONT_DEFINITIONS[f].script === "chinese",
  ),
  latin: (Object.keys(FONT_DEFINITIONS) as ThemeFont[]).filter(
    (f) => FONT_DEFINITIONS[f].script === "latin",
  ),
};
