import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { useSettings } from "@/hooks/contexts/settings";
import { useTheme } from "@/hooks/contexts/theme";
import { THEME_PRESETS } from "@/config/themePresets";
import {
  LayoutList,
  Calendar,
  Bus,
  LayoutGrid,
  Settings,
  Sun,
  Moon,
  Palette,
  Search,
  X,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { language, darkMode, setDarkMode } = useSettings();
  const dict = useDictionary();
  const labels = dict.command_palette;
  const { setPreset, zenMode, toggleZenMode } = useTheme();

  // Toggle with Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
      if (e.altKey && e.key === "z") {
        e.preventDefault();
        toggleZenMode();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleZenMode]);

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false);
    setSearch("");
    fn();
  }, []);

  const navLinks = [
    {
      label: dict.navigation.today,
      icon: <LayoutList className="h-4 w-4" />,
      href: `/${language}/today`,
    },
    {
      label: dict.navigation.timetable,
      icon: <Calendar className="h-4 w-4" />,
      href: `/${language}/timetable`,
    },
    {
      label: dict.navigation.bus,
      icon: <Bus className="h-4 w-4" />,
      href: `/${language}/bus`,
    },
    {
      label: dict.navigation.apps,
      icon: <LayoutGrid className="h-4 w-4" />,
      href: `/${language}/apps`,
    },
    {
      label: dict.navigation.settings,
      icon: <Settings className="h-4 w-4" />,
      href: `/${language}/settings`,
    },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[20vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Palette panel */}
      <div
        className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          value={search}
          onValueChange={setSearch}
          className="flex flex-col"
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              placeholder={
                labels.placeholder
              }
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="py-6 text-left text-sm text-muted-foreground">
              {labels.no_results}
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading={
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 block">
                  {labels.navigation}
                </span>
              }
            >
              {navLinks.map((link) => (
                <Command.Item
                  key={link.href}
                  value={`navigate ${link.label}`}
                  onSelect={() => runCommand(() => navigate(link.href))}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                  )}
                >
                  <span className="text-muted-foreground">{link.icon}</span>
                  <span>{link.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Display */}
            <Command.Group
              heading={
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 block">
                  {labels.display}
                </span>
              }
            >
              <Command.Item
                value={darkMode ? labels.light_mode : labels.dark_mode}
                onSelect={() => runCommand(() => setDarkMode(!darkMode))}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                )}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
                <span>
                  {darkMode
                    ? labels.light_mode
                    : labels.dark_mode}
                </span>
              </Command.Item>
              <Command.Item
                value={`${labels.enter_zen} ${labels.exit_zen}`}
                onSelect={() => runCommand(toggleZenMode)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                )}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                <span>
                  {zenMode
                    ? labels.exit_zen
                    : labels.enter_zen}
                </span>
              </Command.Item>
            </Command.Group>

            {/* Themes */}
            <Command.Group
              heading={
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 block">
                  {labels.themes}
                </span>
              }
            >
              {THEME_PRESETS.map((preset) => (
                <Command.Item
                  key={preset.id}
                  value={`theme ${preset.label} ${preset.labelZh}`}
                  onSelect={() => runCommand(() => setPreset(preset.id))}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                  )}
                >
                  <div className="flex gap-1 items-center">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: preset.preview.accent }}
                    />
                    <Palette className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    {language === "zh" ? preset.labelZh : preset.label}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> {labels.navigate}
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1 rounded">↵</kbd> {labels.select}
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> {labels.close}
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
