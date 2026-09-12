import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: ReactNode;
  ariaLabel?: string;
}

interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentedControlOption<Value>[];
  onValueChange: (value: Value) => void;
  "aria-label": string;
  layout?: "row" | "grid";
  className?: string;
  optionClassName?: string;
}

/**
 * The shared choice treatment for settings. Visual samples belong inside the
 * option, so a swatch never becomes a second control style.
 */
export function SegmentedControl<Value extends string>({
  value,
  options,
  onValueChange,
  "aria-label": ariaLabel,
  layout = "row",
  className,
  optionClassName,
}: SegmentedControlProps<Value>) {
  return (
    <div
      className={cn(
        "grid min-h-10 w-full gap-1 rounded-md border border-border bg-muted p-1",
        layout === "grid"
          ? "grid-flow-row grid-cols-2"
          : "grid-flow-col auto-cols-fr",
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-h-8 min-w-0 rounded-sm px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              optionClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
