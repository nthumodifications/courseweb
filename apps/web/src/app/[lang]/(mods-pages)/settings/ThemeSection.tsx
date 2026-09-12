import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/contexts/theme";
import { THEME_PRESETS } from "@/config/themePresets";
import { ThemeBackground, ThemeDensity, ThemeRadius } from "@/types/theme";
import { FONT_DEFINITIONS, FONT_ORDER } from "@/types/theme";
import { cn } from "@/lib/utils";
import { Button } from "@courseweb/ui";
import { RotateCcw, Link2, Check } from "lucide-react";
import { useLocation } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const RADIUS_OPTIONS: { value: ThemeRadius }[] = [
  { value: "none" },
  { value: "sm" },
  { value: "md" },
  { value: "lg" },
  { value: "xl" },
];

const DENSITY_OPTIONS: {
  value: ThemeDensity;
}[] = [{ value: "compact" }, { value: "comfortable" }, { value: "spacious" }];

const BACKGROUND_OPTIONS: {
  value: ThemeBackground;
  icon: string;
}[] = [
  { value: "solid", icon: "■" },
  { value: "gradient", icon: "⬛" },
  { value: "dots", icon: "⋮⋮" },
  { value: "lines", icon: "≡" },
  { value: "noise", icon: "▒" },
];

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

  // Import theme from URL ?theme= param on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get("theme");
    if (encoded) {
      try {
        const decoded = JSON.parse(atob(encoded));
        if (decoded.version === 1 && decoded.preset) {
          if (decoded.preset) setPreset(decoded.preset);
          if (decoded.radius) setRadius(decoded.radius);
          if (decoded.fontScale) setFontScale(decoded.fontScale);
          if (decoded.density) setDensity(decoded.density);
        }
      } catch {
        // ignore malformed theme param
      }
    }
  }, []);

  const handleShare = () => {
    try {
      const encoded = btoa(JSON.stringify(config));
      const url = `${window.location.origin}${window.location.pathname}?theme=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // ignore clipboard errors
    }
  };

  const hexToHslTriple = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
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

  return (
    <div className="flex flex-col divide-y divide-border">
      {/* Preset Grid */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.preset.title}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPreset(preset.id)}
              className={cn(
                "group flex h-full min-w-0 flex-col gap-2 rounded-md border border-border p-2 text-left transition-colors",
                config.preset === preset.id
                  ? "bg-primary/10 text-primary ring-2 ring-inset ring-primary"
                  : "hover:border-muted-foreground/30",
              )}
              title={
                dict.settings.appearance.preset.themes[
                  preset.id as keyof typeof dict.settings.appearance.preset.themes
                ]
              }
            >
              <div
                className="w-full h-10 rounded-md flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: preset.preview.bg }}
              >
                <div className="flex gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: preset.preview.accent }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: preset.preview.fg, opacity: 0.6 }}
                  />
                </div>
              </div>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {
                  dict.settings.appearance.preset.themes[
                    preset.id as keyof typeof dict.settings.appearance.preset.themes
                  ]
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.font.title}
        </h3>
        <div className="flex flex-col gap-4">
          {(["chinese", "latin"] as const).map((script) => (
            <div key={script} className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                {script === "chinese"
                  ? dict.settings.appearance.font.chinese
                  : dict.settings.appearance.font.latin}
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                {FONT_ORDER[script].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFont(f)}
                    className={cn(
                      "rounded border px-2 py-2 text-xs transition-all",
                      (config.font ?? "inter") === f
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border hover:border-muted-foreground",
                    )}
                    style={{ fontFamily: FONT_DEFINITIONS[f].cssFamily }}
                  >
                    {
                      dict.settings.appearance.font.options[
                        f as keyof typeof dict.settings.appearance.font.options
                      ]
                    }
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.radius.title}
        </h3>
        <div className="flex flex-row flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className={cn(
                "flex flex-col gap-2 rounded border px-4 py-2 text-xs transition-all",
                config.radius === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <div
                className="w-8 h-8 border-2 border-current"
                style={{
                  borderRadius:
                    opt.value === "none"
                      ? "0"
                      : opt.value === "sm"
                        ? "3px"
                        : opt.value === "md"
                          ? "6px"
                          : opt.value === "lg"
                            ? "10px"
                            : "999px",
                }}
              />
              <span>{dict.settings.appearance.radius.options[opt.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Scale */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.font_scale.title}
        </h3>
        <div className="flex flex-row items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {dict.settings.appearance.font_scale.small}
          </span>
          <input
            type="range"
            min={0.875}
            max={1.25}
            step={0.125}
            value={config.fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground">
            {dict.settings.appearance.font_scale.large}
          </span>
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
            {Math.round(config.fontScale * 100)}%
          </span>
        </div>
      </div>

      {/* Density */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.density.title}
        </h3>
        <div className="flex flex-row gap-2">
          {DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDensity(opt.value)}
              className={cn(
                "flex-1 rounded border px-2 py-2 text-xs transition-all",
                config.density === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <div>{dict.settings.appearance.density[opt.value]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.background.title}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {BACKGROUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBackground(opt.value)}
              className={cn(
                "flex h-16 w-full min-w-0 flex-col items-center justify-center gap-1 rounded border px-1 py-2 text-center text-xs leading-tight transition-all",
                config.background === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <span className="font-mono text-sm leading-none">{opt.icon}</span>
              <span className="min-w-0">{dict.settings.appearance.background[opt.value]}</span>
            </button>
          ))}
        </div>
        {config.background === "gradient" && (
          <div className="mt-4 flex flex-row flex-wrap items-center gap-4">
            <label className="text-xs text-muted-foreground">
              {dict.settings.appearance.background.from}
            </label>
            <input
              type="color"
              defaultValue="#7c5cbf"
              onChange={(e) =>
                setBackground("gradient", { from: e.target.value })
              }
              className="w-10 h-8 rounded cursor-pointer"
            />
            <label className="text-xs text-muted-foreground">
              {dict.settings.appearance.background.to}
            </label>
            <input
              type="color"
              defaultValue="#5e81ac"
              onChange={(e) =>
                setBackground("gradient", { to: e.target.value })
              }
              className="w-10 h-8 rounded cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Accent Color Override */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.appearance.accent.title}
        </h3>
        <div className="flex flex-row flex-wrap items-center gap-4">
          <label
            htmlFor="accent-color-picker"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <input
              id="accent-color-picker"
              type="color"
              defaultValue="#7c5cbf"
              onChange={(e) => setAccentOverride(hexToHslTriple(e.target.value))}
              className="h-6 w-6 cursor-pointer rounded border-0 p-0"
              title={dict.settings.appearance.accent.pick}
              aria-label={dict.settings.appearance.accent.pick}
            />
            <span className="whitespace-nowrap">
              {dict.settings.appearance.accent.pick}
            </span>
          </label>
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            {dict.settings.appearance.accent.description}
          </span>
          {config.accentOverride && (
            <button
              onClick={() => setAccentOverride(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {dict.settings.appearance.reset}
            </button>
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="flex flex-row flex-wrap justify-end gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-2"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          {copied
            ? dict.settings.appearance.copied
            : dict.settings.appearance.share_theme}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetTheme}
          className="gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {dict.settings.appearance.reset}
        </Button>
      </div>
    </div>
  );
};
