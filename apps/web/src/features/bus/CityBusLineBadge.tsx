import { cn } from "@courseweb/ui";
import type { CityBusCategory } from "@/libs/citybus";

type CityBusLineBadgeProps = {
  nameZh: string;
  nameEn: string;
  category: CityBusCategory;
  language: "zh" | "en";
  className?: string;
};

// Solid discs in the same family as the shuttle line icons
// (components/BusIcons): one colour per line, a short white mark inside.
const NUMBERED_LINE_COLOURS = [
  "#0284C7",
  "#E11D48",
  "#D97706",
  "#0D9488",
  "#4F46E5",
  "#C026D3",
  "#65A30D",
  "#EA580C",
  "#0891B2",
  "#DB2777",
];
const NAMED_LINES: Array<[RegExp, string, string]> = [
  [/^藍線?/, "藍", "#2563EB"],
  [/^綠線?/, "綠", "#059669"],
  [/^先導/, "先", "#9333EA"],
  [/^世博/, "博", "#DC2626"],
  [/^幸福小黃/, "黃", "#CA8A04"],
];
const INTERCITY_COLOUR = "#475569";

const hash = (value: string) =>
  [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

export const getCityBusLineMark = (
  nameZh: string,
  category: CityBusCategory,
) => {
  for (const [pattern, glyph, colour] of NAMED_LINES) {
    if (!pattern.test(nameZh)) continue;
    // 藍線1區 -> 藍1, 世博3號 -> 博3; a plain 藍線 stays 藍.
    const variant = /\d+/.exec(nameZh)?.[0] ?? "";
    return { mark: `${glyph}${variant}`, colour };
  }
  const number = /^\d+/.exec(nameZh)?.[0];
  if (!number) return { mark: nameZh.slice(0, 2), colour: INTERCITY_COLOUR };
  const suffix = nameZh.slice(number.length, number.length + 1);
  return {
    mark: number.length <= 2 ? `${number}${suffix}` : number,
    colour:
      category === "intercity"
        ? INTERCITY_COLOUR
        : NUMBERED_LINE_COLOURS[hash(number) % NUMBERED_LINE_COLOURS.length],
  };
};

const MARK_SIZE = [
  "",
  "text-[15px]",
  "text-[13px]",
  "text-[11px]",
  "text-[9px]",
];

export function CityBusLineBadge({
  nameZh,
  nameEn,
  category,
  className,
}: CityBusLineBadgeProps) {
  const { mark, colour } = getCityBusLineMark(nameZh, category);

  return (
    <span
      aria-hidden="true"
      title={nameEn}
      style={{ backgroundColor: colour }}
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full font-bold leading-none tracking-tight text-white",
        MARK_SIZE[Math.min(mark.length, 4)],
        className,
      )}
    >
      {mark}
    </span>
  );
}
