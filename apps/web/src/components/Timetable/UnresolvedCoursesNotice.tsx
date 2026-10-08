import { AlertTriangle } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

export const UnresolvedCoursesNotice = ({ count }: { count: number }) => {
  const dict = useDictionary();

  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {dict.timetable.unresolved_courses.replace("{count}", String(count))}
    </div>
  );
};
