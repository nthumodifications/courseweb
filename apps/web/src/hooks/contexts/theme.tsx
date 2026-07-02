import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_THEME_CONFIG,
  DENSITY_VALUES,
  FONT_DEFINITIONS,
  RADIUS_VALUES,
  ThemeBackground,
  ThemeConfig,
  ThemeDensity,
  ThemeFont,
  ThemeRadius,
} from "@/types/theme";
import { THEME_PRESET_MAP } from "@/config/themePresets";

interface ThemeContextValue {
  config: ThemeConfig;
  setPreset: (id: string) => void;
  setRadius: (r: ThemeRadius) => void;
  setFontScale: (scale: number) => void;
  setFont: (f: ThemeFont) => void;
  setDensity: (d: ThemeDensity) => void;
  setBackground: (
    bg: ThemeBackground,
    opts?: { from?: string; to?: string; dir?: string },
  ) => void;
  setAccentOverride: (hsl: string | undefined) => void;
  resetTheme: () => void;
  zenMode: boolean;
  toggleZenMode: () => void;
  compactHeader: boolean;
  toggleCompactHeader: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  config: DEFAULT_THEME_CONFIG,
  setPreset: () => {},
  setRadius: () => {},
  setFontScale: () => {},
  setFont: () => {},
  setDensity: () => {},
  setBackground: () => {},
  setAccentOverride: () => {},
  resetTheme: () => {},
  zenMode: false,
  toggleZenMode: () => {},
  compactHeader: false,
  toggleCompactHeader: () => {},
});

const applyThemeConfig = (config: ThemeConfig, isDark: boolean) => {
  const root = document.documentElement;
  const preset =
    THEME_PRESET_MAP[config.preset] ?? THEME_PRESET_MAP["nthumods"];
  const colors = isDark ? preset.colors.dark : preset.colors.light;

  // Apply preset CSS vars
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value as string);
  }

  // Apply accent override (overrides --primary and --ring)
  if (config.accentOverride) {
    root.style.setProperty("--primary", config.accentOverride);
    root.style.setProperty("--ring", config.accentOverride);
    root.style.setProperty("--sidebar-ring", config.accentOverride);
    root.style.setProperty("--sidebar-primary", config.accentOverride);
  }

  // Apply radius
  root.style.setProperty("--radius", RADIUS_VALUES[config.radius]);

  // Apply font scale
  root.style.setProperty("--font-scale", String(config.fontScale));

  // Apply density
  root.style.setProperty(
    "--density-factor",
    String(DENSITY_VALUES[config.density]),
  );

  // Apply background classes on body
  const body = document.body;
  body.classList.remove("bg-gradient", "bg-dots", "bg-lines", "bg-noise");
  if (config.background !== "solid") {
    body.classList.add(`bg-${config.background}`);
  }
  if (config.background === "gradient") {
    root.style.setProperty(
      "--bg-gradient-from",
      config.backgroundGradientFrom ?? "hsl(var(--background))",
    );
    root.style.setProperty(
      "--bg-gradient-to",
      config.backgroundGradientTo ?? "hsl(var(--primary))",
    );
    root.style.setProperty(
      "--bg-gradient-dir",
      config.backgroundGradientDir ?? "135deg",
    );
  }

  // Apply font
  if (config.font && config.font !== "inter") {
    const fontDef = FONT_DEFINITIONS[config.font];
    if (fontDef.googleFamily) {
      const linkId = `nthumods-font-${config.font}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${fontDef.googleFamily}&display=swap`;
        document.head.appendChild(link);
      }
    }
    root.style.setProperty("--font-family", fontDef.cssFamily);
  } else {
    root.style.setProperty("--font-family", '"Inter", sans-serif');
  }
};

const useThemeProvider = () => {
  const [config, setConfig] = useLocalStorage<ThemeConfig>(
    "theme_config_v1",
    DEFAULT_THEME_CONFIG,
  );

  const setPreset = useCallback(
    (id: string) => {
      setConfig((prev) => ({ ...prev, preset: id }));
    },
    [setConfig],
  );

  const setRadius = useCallback(
    (radius: ThemeRadius) => {
      setConfig((prev) => ({ ...prev, radius }));
    },
    [setConfig],
  );

  const setFontScale = useCallback(
    (fontScale: number) => {
      setConfig((prev) => ({ ...prev, fontScale }));
    },
    [setConfig],
  );

  const setFont = useCallback(
    (font: ThemeFont) => {
      setConfig((prev) => ({ ...prev, font }));
    },
    [setConfig],
  );

  const setDensity = useCallback(
    (density: ThemeDensity) => {
      setConfig((prev) => ({ ...prev, density }));
    },
    [setConfig],
  );

  const setBackground = useCallback(
    (
      background: ThemeBackground,
      opts?: { from?: string; to?: string; dir?: string },
    ) => {
      setConfig((prev) => ({
        ...prev,
        background,
        backgroundGradientFrom: opts?.from ?? prev.backgroundGradientFrom,
        backgroundGradientTo: opts?.to ?? prev.backgroundGradientTo,
        backgroundGradientDir: opts?.dir ?? prev.backgroundGradientDir,
      }));
    },
    [setConfig],
  );

  const setAccentOverride = useCallback(
    (accentOverride: string | undefined) => {
      setConfig((prev) => ({ ...prev, accentOverride }));
    },
    [setConfig],
  );

  const resetTheme = useCallback(() => {
    setConfig(DEFAULT_THEME_CONFIG);
  }, [setConfig]);

  const [zenMode, setZenMode] = useLocalStorage<boolean>("zen_mode", false);

  const toggleZenMode = useCallback(
    () => setZenMode((prev) => !prev),
    [setZenMode],
  );

  const [compactHeader, setCompactHeader] = useLocalStorage<boolean>(
    "compact_header",
    false,
  );

  const toggleCompactHeader = useCallback(
    () => setCompactHeader((prev) => !prev),
    [setCompactHeader],
  );

  return useMemo(
    () => ({
      config,
      setPreset,
      setRadius,
      setFontScale,
      setFont,
      setDensity,
      setBackground,
      setAccentOverride,
      resetTheme,
      zenMode,
      toggleZenMode,
      compactHeader,
      toggleCompactHeader,
    }),
    [
      config,
      setPreset,
      setRadius,
      setFontScale,
      setFont,
      setDensity,
      setBackground,
      setAccentOverride,
      resetTheme,
      zenMode,
      toggleZenMode,
      compactHeader,
      toggleCompactHeader,
    ],
  );
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: FC<PropsWithChildren<{ isDark: boolean }>> = ({
  children,
  isDark,
}) => {
  const value = useThemeProvider();

  useEffect(() => {
    applyThemeConfig(value.config, isDark);
  }, [value.config, isDark]);

  useEffect(() => {
    document.documentElement.classList.toggle("zen-mode", value.zenMode);
  }, [value.zenMode]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "compact-header",
      value.compactHeader,
    );
  }, [value.compactHeader]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
