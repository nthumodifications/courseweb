import { Button } from "@courseweb/ui";
import { CalendarDays } from "lucide-react";

interface SemesterHeaderProps {
  onOpenSemesterManagement: () => void;
}

export function SemesterHeader({
  onOpenSemesterManagement,
}: SemesterHeaderProps) {
  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <div>
        <h2 className="text-lg font-bold">學期規劃</h2>
        <p className="text-sm text-neutral-400">規劃您的課程安排</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onOpenSemesterManagement}>
        <CalendarDays className="h-4 w-4" />
      </Button>
    </div>
  );
}
