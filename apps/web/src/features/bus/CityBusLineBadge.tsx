import { cn } from "@courseweb/ui";
import type { CityBusCategory } from "@/libs/citybus";

type CityBusLineBadgeProps = {
  nameZh: string;
  nameEn: string;
  category: CityBusCategory;
  language: "zh" | "en";
};

export function CityBusLineBadge({
  nameZh,
  nameEn,
  category,
  language,
}: CityBusLineBadgeProps) {
  const isBlue = nameZh.includes("藍線");
  const isGreen = nameZh.includes("綠線");
  const label = language === "zh" ? nameZh : nameEn;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 min-w-7 max-w-20 shrink-0 items-center justify-center rounded-full border px-1.5 text-center text-[11px] font-bold leading-none",
        category === "pilot" && "border-nthu-500 bg-nthu-500 text-white",
        isBlue && "border-blue-600 bg-blue-600 text-white",
        isGreen && "border-green-600 bg-green-600 text-white",
        !isBlue &&
          !isGreen &&
          category !== "pilot" &&
          "border-border bg-muted text-foreground",
      )}
      title={nameEn}
    >
      {label}
    </span>
  );
}
