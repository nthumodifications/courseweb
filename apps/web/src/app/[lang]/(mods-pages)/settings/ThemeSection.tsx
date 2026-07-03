import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/contexts/theme";
import { THEME_PRESETS } from "@/config/themePresets";
import { ThemeBackground, ThemeDensity, ThemeRadius } from "@/types/theme";
import { FONT_DEFINITIONS, ThemeFont } from "@/types/theme";
import { cn } from "@/lib/utils";
import { Button } from "@courseweb/ui";
import { RotateCcw, Link2, Check } from "lucide-react";
import { useLocation } from "react-router-dom";

const RADIUS_OPTIONS: { value: ThemeRadius; label: string }[] = [
  { value: "none", label: "□" },
  { value: "sm", label: "▢" },
  { value: "md", label: "▣" },
  { value: "lg", label: "⬜" },
  { value: "xl", label: "●" },
];

const DENSITY_OPTIONS: {
  value: ThemeDensity;
  label: string;
  labelZh: string;
}[] = [
  { value: "compact", label: "Compact", labelZh: "緊湊" },
  { value: "comfortable", label: "Default", labelZh: "適中" },
  { value: "spacious", label: "Spacious", labelZh: "寬鬆" },
];

const BACKGROUND_OPTIONS: {
  value: ThemeBackground;
  label: string;
  icon: string;
}[] = [
  { value: "solid", label: "Solid", icon: "■" },
  { value: "gradient", label: "Gradient", icon: "⬛" },
  { value: "dots", label: "Dots", icon: "⋮⋮" },
  { value: "lines", label: "Lines", icon: "≡" },
  { value: "noise", label: "Noise", icon: "▒" },
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
    <div className="flex flex-col gap-6">
      {/* Preset Grid */}
      <div>
        <h3 className="text-sm font-medium mb-3">Theme Preset / 主題</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPreset(preset.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-colors",
                config.preset === preset.id
                  ? "border-primary shadow-md"
                  : "border-transparent hover:border-muted-foreground/30",
              )}
              title={preset.label}
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
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <h3 className="text-sm font-medium mb-3">Font Family / 字體</h3>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(FONT_DEFINITIONS) as ThemeFont[]).map((f) => (
            <button
              key={f}
              onClick={() => setFont(f)}
              className={cn(
                "px-3 py-1.5 text-xs border rounded transition-all",
                (config.font ?? "inter") === f
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
              style={{ fontFamily: FONT_DEFINITIONS[f].cssFamily }}
            >
              {FONT_DEFINITIONS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-sm font-medium mb-3">Border Radius / 圓角</h3>
        <div className="flex gap-2 flex-wrap">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 border rounded transition-all text-xs",
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
              <span className="capitalize">{opt.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Scale */}
      <div>
        <h3 className="text-sm font-medium mb-1">Font Size / 字體大小</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">小</span>
          <input
            type="range"
            min={0.875}
            max={1.25}
            step={0.125}
            value={config.fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground">大</span>
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
            {Math.round(config.fontScale * 100)}%
          </span>
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="text-sm font-medium mb-3">Density / 密度</h3>
        <div className="flex gap-2">
          {DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDensity(opt.value)}
              className={cn(
                "flex-1 py-2 px-3 text-xs border rounded transition-all",
                config.density === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <div>{opt.label}</div>
              <div className="text-muted-foreground">{opt.labelZh}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <h3 className="text-sm font-medium mb-3">Background / 背景</h3>
        <div className="flex gap-2 flex-wrap">
          {BACKGROUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBackground(opt.value)}
              className={cn(
                "flex items-center gap-2 py-2 px-3 text-xs border rounded transition-all",
                config.background === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <span className="font-mono">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
        {config.background === "gradient" && (
          <div className="mt-3 flex gap-3 items-center flex-wrap">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="color"
              defaultValue="#7c5cbf"
              onChange={(e) =>
                setBackground("gradient", { from: e.target.value })
              }
              className="w-10 h-8 rounded cursor-pointer"
            />
            <label className="text-xs text-muted-foreground">To</label>
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
      <div>
        <h3 className="text-sm font-medium mb-3">Accent Color / 強調色</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            defaultValue="#7c5cbf"
            onChange={(e) => setAccentOverride(hexToHslTriple(e.target.value))}
            className="w-10 h-9 rounded cursor-pointer border border-border"
            title="Pick accent color"
          />
          <span className="text-xs text-muted-foreground flex-1">
            Overrides the preset's primary color
          </span>
          {config.accentOverride && (
            <button
              onClick={() => setAccentOverride(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end gap-2">
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
          {copied ? "Copied!" : "Share Theme"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetTheme}
          className="gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
};
