import React, { useCallback } from "react";
import {
  TimetableDisplayPreferences,
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
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-px p-0.5">
      <div
        className={cn("rounded-sm bg-current opacity-80 w-1 h-1", row, col)}
      />
    </div>
  );
};

const FIELD_LABELS: Record<TimetableFieldKey, { en: string; zh: string }> = {
  code: { en: "Code", zh: "課號" },
  title: { en: "Title", zh: "課名" },
  time: { en: "Time", zh: "時間" },
  teacher: { en: "Teacher", zh: "教師" },
  venue: { en: "Venue", zh: "教室" },
  credits: { en: "Credits", zh: "學分" },
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

  return (
    <div className="flex flex-col gap-4">
      {/* Language */}
      <div className="flex flex-row items-center">
        <label className="font-bold flex-1 text-sm">
          {dict.settings.timetable.language}
        </label>
        <Select value={settings.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="app">App</SelectItem>
            <SelectItem value="zh">繁體中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2D Alignment picker */}
      <div className="flex flex-row items-start gap-4">
        <label className="font-bold text-sm pt-1 flex-1">
          Alignment / 對齊
        </label>
        <div className="grid grid-cols-3 gap-1 w-28">
          {ALIGN_GRID.map(([h, v]) => (
            <button
              key={`${h}-${v}`}
              onClick={() => handleAlignChange(h, v)}
              className={cn(
                "w-8 h-8 rounded border transition-colors flex items-center justify-center",
                isActive(h, v)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground text-muted-foreground",
              )}
              title={`${v} ${h}`}
            >
              <AlignDot h={h} v={v} />
            </button>
          ))}
        </div>
      </div>

      {/* Field display & order */}
      <div>
        <label className="font-bold text-sm mb-2 block">
          Fields &amp; Order / 欄位與順序
        </label>
        <div className="flex flex-col gap-1">
          {fieldOrder.map((field, idx) => {
            const label = FIELD_LABELS[field];
            const isOn =
              settings.display[field as keyof typeof settings.display] ?? false;
            return (
              <div
                key={field}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 border transition-colors",
                  isOn ? "border-border bg-muted/30" : "border-transparent",
                )}
              >
                {/* Up/down order buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => moveField(idx, -1)}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 h-3 flex items-center"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveField(idx, 1)}
                    disabled={idx === fieldOrder.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 h-3 flex items-center"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                {/* Field name */}
                <div className="flex-1 text-sm">
                  <span>{label.en}</span>
                  <span className="text-muted-foreground ml-1 text-xs">
                    {label.zh}
                  </span>
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
