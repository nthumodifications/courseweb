import React, { useCallback } from "react";
import {
  TimetableDisplayPreferences,
  TimetableFontFamily,
  TimetableFontSize,
  TimetableFieldKey,
  DEFAULT_FIELD_ORDER,
} from "@/hooks/contexts/useUserTimetable";
import { Switch } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { SettingItem } from "./SettingItem";

interface SettingsControlProps {
  settings: TimetableDisplayPreferences;
  onSettingsChange: (settings: TimetableDisplayPreferences) => void;
}

// 3×3 alignment cell: [horizontalAlign, verticalAlign]
const ALIGN_GRID: Array<
  ["left" | "center" | "right", "top" | "center" | "bottom"]
> = [
  ["left", "top"],
  ["center", "top"],
  ["right", "top"],
  ["left", "center"],
  ["center", "center"],
  ["right", "center"],
  ["left", "bottom"],
  ["center", "bottom"],
  ["right", "bottom"],
];

// Visual dots inside each 3×3 cell show where text would sit
const AlignDot = ({
  h,
  v,
}: {
  h: "left" | "center" | "right";
  v: "top" | "center" | "bottom";
}) => {
  const col =
    h === "left"
      ? "col-start-1"
      : h === "center"
        ? "col-start-2"
        : "col-start-3";
  const row =
    v === "top"
      ? "row-start-1"
      : v === "center"
        ? "row-start-2"
        : "row-start-3";
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1 p-1">
      <div
        className={cn("rounded-sm bg-current opacity-80 w-1 h-1", row, col)}
      />
    </div>
  );
};

const TimetablePreferences: React.FC<SettingsControlProps> = ({
  settings,
  onSettingsChange,
}) => {
  const dict = useDictionary();
  const fieldOrder: TimetableFieldKey[] =
    settings.fieldOrder ?? DEFAULT_FIELD_ORDER;

  const handleLanguageChange = (value: "app" | "zh" | "en") => {
    onSettingsChange({ ...settings, language: value });
  };

  const handleAlignChange = (
    h: "left" | "center" | "right",
    v: "top" | "center" | "bottom",
  ) => {
    onSettingsChange({ ...settings, align: h, verticalAlign: v });
  };

  const handleDisplayChange = (key: TimetableFieldKey) => {
    onSettingsChange({
      ...settings,
      display: {
        ...settings.display,
        [key]: !settings.display[key as keyof typeof settings.display],
      },
    });
  };

  const moveField = useCallback(
    (idx: number, dir: -1 | 1) => {
      const next = [...fieldOrder];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return;
      [next[idx], next[target]] = [next[target], next[idx]];
      onSettingsChange({ ...settings, fieldOrder: next });
    },
    [fieldOrder, settings, onSettingsChange],
  );

  const isActive = (
    h: "left" | "center" | "right",
    v: "top" | "center" | "bottom",
  ) => settings.align === h && (settings.verticalAlign ?? "top") === v;

  const handleFontSizeChange = (value: string) => {
    onSettingsChange({
      ...settings,
      fontSize: value as TimetableFontSize,
    });
  };

  const handleFontFamilyChange = (value: string) => {
    onSettingsChange({
      ...settings,
      fontFamily: value as TimetableFontFamily,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Language */}
      <SettingItem
        title={dict.settings.timetable.language}
        description={dict.settings.timetable.language_description}
        control={
          <Select
            value={settings.language}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="app">
                {dict.settings.timetable.language_options.app}
              </SelectItem>
              <SelectItem value="zh">
                {dict.settings.timetable.language_options.zh}
              </SelectItem>
              <SelectItem value="en">
                {dict.settings.timetable.language_options.en}
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <SettingItem
        title={dict.settings.timetable.font_size}
        description={dict.settings.timetable.font_size_description}
        control={
          <Select
            value={settings.fontSize ?? "sm"}
            onValueChange={handleFontSizeChange}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xs">
                {dict.settings.timetable.font_size_options.xs}
              </SelectItem>
              <SelectItem value="sm">
                {dict.settings.timetable.font_size_options.sm}
              </SelectItem>
              <SelectItem value="base">
                {dict.settings.timetable.font_size_options.base}
              </SelectItem>
              <SelectItem value="lg">
                {dict.settings.timetable.font_size_options.lg}
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <SettingItem
        title={dict.settings.timetable.font_family}
        description={dict.settings.timetable.font_family_description}
        control={
          <Select
            value={settings.fontFamily ?? "system"}
            onValueChange={handleFontFamilyChange}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                {dict.settings.timetable.font_family_options.system}
              </SelectItem>
              <SelectItem value="sans">
                {dict.settings.timetable.font_family_options.sans}
              </SelectItem>
              <SelectItem value="serif">
                {dict.settings.timetable.font_family_options.serif}
              </SelectItem>
              <SelectItem value="mono">
                {dict.settings.timetable.font_family_options.mono}
              </SelectItem>
              <SelectItem value="rounded">
                {dict.settings.timetable.font_family_options.rounded}
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* 2D Alignment picker */}
      <SettingItem
        title={dict.settings.timetable.alignment}
        description={dict.settings.timetable.alignment_description}
        control={
          <div className="grid w-28 grid-cols-3 gap-1">
            {ALIGN_GRID.map(([h, v]) => (
              <button
                type="button"
                key={`${h}-${v}`}
                onClick={() => handleAlignChange(h, v)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive(h, v)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                )}
                title={`${dict.settings.timetable.align[v]} ${dict.settings.timetable.align[h]}`}
                aria-label={`${dict.settings.timetable.align[v]} ${dict.settings.timetable.align[h]}`}
              >
                <AlignDot h={h} v={v} />
              </button>
            ))}
          </div>
        }
      />

      {/* Field display & order */}
      <SettingItem
        title={dict.settings.timetable.fields_order}
        description={dict.settings.timetable.fields_order_description}
        control={
          <div className="flex w-full flex-col gap-1 sm:w-auto">
            {fieldOrder.map((field, idx) => {
              const label = {
                code: dict.settings.timetable.slot_code,
                title: dict.settings.timetable.slot_title,
                time: dict.settings.timetable.slot_time,
                teacher: dict.settings.timetable.slot_teacher,
                venue: dict.settings.timetable.slot_venue,
                credits: dict.settings.timetable.slot_credits,
              }[field];
              const isOn =
                settings.display[field as keyof typeof settings.display] ??
                false;
              return (
                <div
                  key={field}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-2 transition-colors",
                    isOn ? "border-border bg-muted/30" : "border-transparent",
                  )}
                >
                  {/* Up/down order buttons */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="flex h-3 items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20"
                      aria-label={dict.settings.timetable.move_up}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === fieldOrder.length - 1}
                      className="flex h-3 items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20"
                      aria-label={dict.settings.timetable.move_down}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Field name */}
                  <div className="flex-1 text-sm">
                    <span>{label}</span>
                  </div>
                  {/* Toggle */}
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => handleDisplayChange(field)}
                  />
                </div>
              );
            })}
          </div>
        }
      />
    </div>
  );
};

export default TimetablePreferences;
