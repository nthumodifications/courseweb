import { cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getTermAvailability,
  type TermAvailabilityStatus,
} from "@/lib/module-availability";

type BarFill = "solid" | "striped" | "empty";

const BAR_FILL: Record<TermAvailabilityStatus, BarFill> = {
  every_year: "solid",
  most_years: "solid",
  some_years: "striped",
  once: "striped",
  stopped: "empty",
  never: "empty",
};

const STRIPES =
  "repeating-linear-gradient(135deg, currentColor 0 2px, transparent 2px 5px)";

/**
 * One bar per term: solid when the course reliably runs in that term, striped
 * when it only sometimes does, empty when it does not.
 */
export const ModuleTermAvailability = ({
  semesters,
  size = "md",
  className,
}: {
  semesters: readonly string[];
  size?: "sm" | "md";
  className?: string;
}) => {
  const dict = useDictionary();
  const labels = dict.course.module.availability;

  return (
    <dl
      className={cn(
        "flex flex-row flex-wrap items-center",
        size === "md" ? "gap-x-6 gap-y-2 text-base" : "gap-x-4 gap-y-1 text-sm",
        className,
      )}
    >
      {getTermAvailability(semesters).map(({ term, status }) => {
        const fill = BAR_FILL[status];
        return (
          <div key={term} className="flex flex-row items-center gap-2">
            <span
              aria-hidden="true"
              style={
                fill === "striped" ? { backgroundImage: STRIPES } : undefined
              }
              className={cn(
                "shrink-0 rounded-sm text-nthu-500",
                size === "md" ? "h-3 w-10" : "h-2.5 w-7",
                fill === "solid" && "bg-nthu-500",
                fill === "striped" && "ring-1 ring-inset ring-nthu-500/40",
                fill === "empty" && "bg-muted ring-1 ring-inset ring-border",
              )}
            />
            <dt className="font-medium text-foreground">
              {labels.terms[term]}
            </dt>
            <dd className="text-muted-foreground">{labels.status[status]}</dd>
          </div>
        );
      })}
    </dl>
  );
};
