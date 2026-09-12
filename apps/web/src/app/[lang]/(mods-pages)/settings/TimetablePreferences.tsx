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
    <div className="divide-y divide-border">
      {/* Language */}
      <div className="flex flex-row items-center gap-4 py-4">
        <label className="font-bold flex-1 text-sm">
          {dict.settings.timetable.language}
        </label>
        <Select value={settings.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[160px]">
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
      </div>

      <div className="flex flex-row items-center gap-4 py-4">
        <label className="font-bold flex-1 text-sm">
          {dict.settings.timetable.font_size}
        </label>
        <Select
          value={settings.fontSize ?? "sm"}
          onValueChange={handleFontSizeChange}
        >
          <SelectTrigger className="w-[160px]">
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
      </div>

      <div className="flex flex-row items-center gap-4 py-4">
        <label className="font-bold flex-1 text-sm">
          {dict.settings.timetable.font_family}
        </label>
        <Select
          value={settings.fontFamily ?? "system"}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="w-[160px]">
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
      </div>

      {/* 2D Alignment picker */}
      <div className="flex flex-row items-start gap-4 py-4">
        <label className="font-bold text-sm pt-1 flex-1">
          {dict.settings.timetable.alignment}
        </label>
        <div className="grid grid-cols-3 gap-1">
          {ALIGN_GRID.map(([h, v]) => (
            <button
              key={`${h}-${v}`}
              onClick={() => handleAlignChange(h, v)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded border transition-colors",
                isActive(h, v)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground text-muted-foreground",
              )}
              title={`${dict.settings.timetable.align[v]} ${dict.settings.timetable.align[h]}`}
            >
              <AlignDot h={h} v={v} />
            </button>
          ))}
        </div>
      </div>

      {/* Field display & order */}
      <div className="py-4">
        <label className="mb-2 block text-sm font-bold">
          {dict.settings.timetable.fields_order}
        </label>
        <div className="divide-y divide-border">
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
              settings.display[field as keyof typeof settings.display] ?? false;
            return (
              <div
                key={field}
                className="flex flex-row items-center gap-2 py-4"
              >
                {/* Up/down order buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => moveField(idx, -1)}
                    disabled={idx === 0}
                    type="button"
                    className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"
                    aria-label={dict.settings.timetable.move_up}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveField(idx, 1)}
                    disabled={idx === fieldOrder.length - 1}
                    type="button"
                    className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"
                    aria-label={dict.settings.timetable.move_down}
                  >
                    <ChevronDown className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default TimetablePreferences;
