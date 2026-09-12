import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Link2, RotateCcw } from "lucide-react";
import { Button } from "@courseweb/ui";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/SegmentedControl";
import useDictionary from "@/dictionaries/useDictionary";
import { useTheme } from "@/hooks/contexts/theme";
import { THEME_PRESETS } from "@/config/themePresets";
import {
  FONT_DEFINITIONS,
  FONT_ORDER,
  RADIUS_VALUES,
  type ThemeBackground,
  type ThemeDensity,
  type ThemeFont,
  type ThemeRadius,
} from "@/types/theme";
import { SettingItem } from "./SettingItem";

const RADIUS_OPTIONS: ThemeRadius[] = ["none", "sm", "md", "lg", "xl"];
const DENSITY_OPTIONS: ThemeDensity[] = ["compact", "comfortable", "spacious"];
const BACKGROUND_OPTIONS: ThemeBackground[] = [
  "solid",
  "gradient",
  "dots",
  "lines",
  "noise",
];

const getThemeLabel = (dict: ReturnType<typeof useDictionary>, id: string) =>
  dict.settings.appearance.preset.themes[
    id as keyof typeof dict.settings.appearance.preset.themes
  ];

const getFontLabel = (
  dict: ReturnType<typeof useDictionary>,
  font: ThemeFont,
) => dict.settings.appearance.font.options[font];

const RadiusSample = ({ value }: { value: ThemeRadius }) => (
  <span
    className="h-6 w-8 border-2 border-current"
    style={{ borderRadius: RADIUS_VALUES[value] }}
    aria-hidden="true"
  />
);

const BackgroundSample = ({ value }: { value: ThemeBackground }) => {
  if (value === "gradient") {
    return (
      <span
        className="h-6 w-10 rounded-sm border border-border bg-gradient-to-br from-background to-primary"
        aria-hidden="true"
      />
    );
  }
  if (value === "dots") {
    return (
      <span
        className="h-6 w-10 rounded-sm border border-border bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:6px_6px]"
        aria-hidden="true"
      />
    );
  }
  if (value === "lines") {
    return (
      <span
        className="h-6 w-10 rounded-sm border border-border bg-[repeating-linear-gradient(0deg,transparent,transparent_5px,hsl(var(--border))_5px,hsl(var(--border))_6px)]"
        aria-hidden="true"
      />
    );
  }
  if (value === "noise") {
    return (
      <span
        className="h-6 w-10 rounded-sm border border-border bg-muted"
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="h-6 w-10 rounded-sm border border-border bg-background"
      aria-hidden="true"
    />
  );
};

const ThemePreview = ({
  bg,
  fg,
  accent,
}: {
  bg: string;
  fg: string;
  accent: string;
}) => (
  <span
    className="flex h-8 w-full items-center justify-center gap-1 rounded-sm"
    style={{ backgroundColor: bg }}
    aria-hidden="true"
  >
    <span
      className="h-3 w-3 rounded-full"
      style={{ backgroundColor: accent }}
    />
    <span
      className="h-3 w-3 rounded-full opacity-60"
      style={{ backgroundColor: fg }}
    />
  </span>
);

export const ThemeSection = () => {
  const {
    config,
    setPreset,
    setRadius,
    setFontScale,
    setDensity,
    setBackground,
    setFont,
    setAccentOverride,
    resetTheme,
  } = useTheme();
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const dict = useDictionary();

  useEffect(() => {
    const encoded = new URLSearchParams(location.search).get("theme");
    if (!encoded) return;
    try {
      const decoded = JSON.parse(atob(encoded));
      if (decoded.version !== 1 || !decoded.preset) return;
      if (decoded.preset) setPreset(decoded.preset);
      if (decoded.radius) setRadius(decoded.radius);
      if (decoded.fontScale) setFontScale(decoded.fontScale);
      if (decoded.density) setDensity(decoded.density);
    } catch {
      // Ignore malformed shared themes.
    }
  }, [location.search, setDensity, setFontScale, setPreset, setRadius]);

  const handleShare = () => {
    try {
      const encoded = btoa(JSON.stringify(config));
      const url = `${window.location.origin}${window.location.pathname}?theme=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // Ignore clipboard errors.
    }
  };

  const hexToHslTriple = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const brandPreset = THEME_PRESETS.find((preset) => preset.id === "nthumods");
  const extraPresets = THEME_PRESETS.filter(
    (preset) => preset.id !== "nthumods",
  );
  const fontOptions = useMemo(
    () => [...FONT_ORDER.chinese, ...FONT_ORDER.latin],
    [],
  );

  const presetOption = (preset: (typeof THEME_PRESETS)[number]) => ({
    value: preset.id,
    label: (
      <span className="flex min-w-0 flex-col items-center gap-1">
        <ThemePreview {...preset.preview} />
        <span className="max-w-full truncate">
          {getThemeLabel(dict, preset.id)}
        </span>
      </span>
    ),
    ariaLabel: getThemeLabel(dict, preset.id),
  });

  const fontSegmentOptions: readonly SegmentedControlOption<ThemeFont>[] =
    fontOptions.map((font) => ({
      value: font,
      label: getFontLabel(dict, font),
      ariaLabel: getFontLabel(dict, font),
    }));

  const radiusSegmentOptions: readonly SegmentedControlOption<ThemeRadius>[] =
    RADIUS_OPTIONS.map((value) => ({
      value,
      label: (
        <span className="flex flex-col items-center gap-1">
          <RadiusSample value={value} />
          <span>{dict.settings.appearance.radius.options[value]}</span>
        </span>
      ),
      ariaLabel: dict.settings.appearance.radius.options[value],
    }));

  const densitySegmentOptions: readonly SegmentedControlOption<ThemeDensity>[] =
    DENSITY_OPTIONS.map((value) => ({
      value,
      label: dict.settings.appearance.density[value],
    }));

  const backgroundSegmentOptions: readonly SegmentedControlOption<ThemeBackground>[] =
    BACKGROUND_OPTIONS.map((value) => ({
      value,
      label: (
        <span className="flex flex-col items-center gap-1">
          <BackgroundSample value={value} />
          <span>{dict.settings.appearance.background[value]}</span>
        </span>
      ),
      ariaLabel: dict.settings.appearance.background[value],
    }));

  return (
    <div className="flex flex-col gap-6">
      {brandPreset && (
        <SettingItem
          title={dict.settings.appearance.preset.brand_title}
          description={dict.settings.appearance.preset.brand_description}
          control={
            <SegmentedControl
              value={config.preset}
              options={[presetOption(brandPreset)]}
              onValueChange={setPreset}
              aria-label={dict.settings.appearance.preset.title}
              className="sm:w-56"
              optionClassName="py-2"
            />
          }
        />
      )}

      <SettingItem
        title={dict.settings.appearance.preset.extra_title}
        description={dict.settings.appearance.preset.extra_description}
        control={
          <SegmentedControl
            value={config.preset}
            options={extraPresets.map(presetOption)}
            onValueChange={setPreset}
            aria-label={dict.settings.appearance.preset.extra_title}
            layout="grid"
            className="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
            optionClassName="py-2"
          />
        }
      />

      <SettingItem
        title={dict.settings.appearance.font.title}
        description={dict.settings.appearance.font.description}
        control={
          <SegmentedControl
            value={config.font ?? "inter"}
            options={fontSegmentOptions}
            onValueChange={setFont}
            aria-label={dict.settings.appearance.font.title}
            layout="grid"
            className="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
          />
        }
      />

      <SettingItem
        title={dict.settings.appearance.radius.title}
        description={dict.settings.appearance.radius.description}
        control={
          <SegmentedControl
            value={config.radius}
            options={radiusSegmentOptions}
            onValueChange={setRadius}
            aria-label={dict.settings.appearance.radius.title}
            layout="grid"
            className="grid-cols-3 sm:grid-cols-5"
            optionClassName="py-2"
          />
        }
      />

      <SettingItem
        title={dict.settings.appearance.font_scale.title}
        description={dict.settings.appearance.font_scale.description}
        control={
          <div className="flex w-full items-center gap-3 sm:w-72">
            <span className="text-xs text-muted-foreground">
              {dict.settings.appearance.font_scale.small}
            </span>
            <input
              type="range"
              min={0.875}
              max={1.25}
              step={0.125}
              value={config.fontScale}
              onChange={(event) => setFontScale(parseFloat(event.target.value))}
              aria-label={dict.settings.appearance.font_scale.title}
              className="min-w-0 flex-1 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="text-xs text-muted-foreground">
              {dict.settings.appearance.font_scale.large}
            </span>
            <span className="w-10 text-right font-mono text-xs text-muted-foreground">
              {Math.round(config.fontScale * 100)}%
            </span>
          </div>
        }
      />

      <SettingItem
        title={dict.settings.appearance.density.title}
        description={dict.settings.appearance.density.description}
        control={
          <SegmentedControl
            value={config.density}
            options={densitySegmentOptions}
            onValueChange={setDensity}
            aria-label={dict.settings.appearance.density.title}
            className="sm:w-72"
          />
        }
      />

      <SettingItem
        title={dict.settings.appearance.background.title}
        description={dict.settings.appearance.background.description}
        control={
          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <SegmentedControl
              value={config.background}
              options={backgroundSegmentOptions}
              onValueChange={setBackground}
              aria-label={dict.settings.appearance.background.title}
              layout="grid"
              className="grid-cols-3 sm:grid-cols-5"
              optionClassName="py-2"
            />
            {config.background === "gradient" && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted-foreground">
                  {dict.settings.appearance.background.from}
                  <input
                    type="color"
                    defaultValue="#7c5cbf"
                    aria-label={dict.settings.appearance.background.from}
                    onChange={(event) =>
                      setBackground("gradient", { from: event.target.value })
                    }
                    className="ml-2 h-8 w-10 rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {dict.settings.appearance.background.to}
                  <input
                    type="color"
                    defaultValue="#5e81ac"
                    aria-label={dict.settings.appearance.background.to}
                    onChange={(event) =>
                      setBackground("gradient", { to: event.target.value })
                    }
                    className="ml-2 h-8 w-10 rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </label>
              </div>
            )}
          </div>
        }
      />

      <SettingItem
        title={dict.settings.appearance.accent.title}
        description={dict.settings.appearance.accent.description}
        control={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <input
              type="color"
              defaultValue="#7c5cbf"
              onChange={(event) =>
                setAccentOverride(hexToHslTriple(event.target.value))
              }
              aria-label={dict.settings.appearance.accent.pick}
              className="h-9 w-10 rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {config.accentOverride && (
              <button
                type="button"
                onClick={() => setAccentOverride(undefined)}
                className="min-h-10 rounded-md px-3 text-xs text-muted-foreground underline underline-offset-4 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {dict.settings.appearance.reset}
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleShare}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          {copied
            ? dict.settings.appearance.copied
            : dict.settings.appearance.share_theme}
        </Button>
        <Button variant="outline" size="sm" onClick={resetTheme}>
          <RotateCcw className="h-3.5 w-3.5" />
          {dict.settings.appearance.reset}
        </Button>
      </div>
    </div>
  );
};
