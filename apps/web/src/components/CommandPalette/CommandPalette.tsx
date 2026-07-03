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

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { language, darkMode, setDarkMode } = useSettings();
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
      label: language === "zh" ? "今天" : "Today",
      icon: <LayoutList className="h-4 w-4" />,
      href: `/${language}/today`,
    },
    {
      label: language === "zh" ? "課表" : "Timetable",
      icon: <Calendar className="h-4 w-4" />,
      href: `/${language}/timetable`,
    },
    {
      label: language === "zh" ? "公車" : "Bus",
      icon: <Bus className="h-4 w-4" />,
      href: `/${language}/bus`,
    },
    {
      label: language === "zh" ? "應用程式" : "Apps",
      icon: <LayoutGrid className="h-4 w-4" />,
      href: `/${language}/apps`,
    },
    {
      label: language === "zh" ? "設定" : "Settings",
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
          <div className="flex items-center px-4 py-3 border-b border-border gap-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              placeholder={
                language === "zh" ? "輸入指令..." : "Type a command..."
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
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {language === "zh" ? "找不到指令" : "No commands found"}
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading={
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 block">
                  {language === "zh" ? "頁面導航" : "Navigation"}
                </span>
              }
            >
              {navLinks.map((link) => (
                <Command.Item
                  key={link.href}
                  value={`navigate ${link.label}`}
                  onSelect={() => runCommand(() => navigate(link.href))}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm",
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
                  {language === "zh" ? "顯示" : "Display"}
                </span>
              }
            >
              <Command.Item
                value={darkMode ? "light mode 亮色模式" : "dark mode 暗色模式"}
                onSelect={() => runCommand(() => setDarkMode(!darkMode))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm",
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
                    ? language === "zh"
                      ? "切換亮色模式"
                      : "Switch to Light Mode"
                    : language === "zh"
                      ? "切換暗色模式"
                      : "Switch to Dark Mode"}
                </span>
              </Command.Item>
              <Command.Item
                value="zen mode focus mode 禪模式 専注模式"
                onSelect={() => runCommand(toggleZenMode)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                )}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                <span>
                  {zenMode
                    ? language === "zh"
                      ? "退出禪模式"
                      : "Exit Zen Mode"
                    : language === "zh"
                      ? "進入禪模式"
                      : "Enter Zen Mode"}
                </span>
              </Command.Item>
            </Command.Group>

            {/* Themes */}
            <Command.Group
              heading={
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 block">
                  {language === "zh" ? "主題" : "Themes"}
                </span>
              }
            >
              {THEME_PRESETS.map((preset) => (
                <Command.Item
                  key={preset.id}
                  value={`theme ${preset.label} ${preset.labelZh}`}
                  onSelect={() => runCommand(() => setPreset(preset.id))}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm",
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
              <kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1 rounded">↵</kbd> select
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
