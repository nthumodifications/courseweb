import { Button } from "@courseweb/ui";
import { CalendarDays } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

interface SemesterHeaderProps {
  onOpenSemesterManagement: () => void;
}

export function SemesterHeader({
  onOpenSemesterManagement,
}: SemesterHeaderProps) {
  const dict = useDictionary();

  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <div>
        <h2 className="text-lg font-bold">{dict.planner.semester.title}</h2>
        <p className="text-sm text-muted-foreground">
          {dict.planner.semester.subtitle}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label={dict.planner.semester.manageAriaLabel}
        title={dict.planner.semester.manageAriaLabel}
        onClick={onOpenSemesterManagement}
      >
        <CalendarDays className="h-4 w-4" />
      </Button>
    </div>
  );
}
