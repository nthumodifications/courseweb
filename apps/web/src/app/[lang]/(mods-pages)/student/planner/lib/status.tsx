import { CheckCircle2, CircleDashed, CircleDot, X } from "lucide-react";
import { CourseStatus } from "../types";

export const STATUS_BADGE_CLASS: Record<CourseStatus, string> = {
  completed:
    "bg-success/10  text-success  border-success",
  "in-progress":
    "bg-info/10  text-info  border-info",
  failed:
    "bg-destructive/10  text-destructive  border-destructive",
  planned:
    "bg-muted  text-foreground  border-border ",
};

const STATUS_ICON_COLOR_CLASS: Record<CourseStatus, string> = {
  completed: "text-success ",
  "in-progress": "text-info ",
  failed: "text-destructive ",
  planned: "text-muted-foreground",
};

export function getStatusBadgeClass(status: CourseStatus | undefined | null) {
  return STATUS_BADGE_CLASS[status ?? "planned"];
}

export function getStatusIconColorClass(
  status: CourseStatus | undefined | null,
) {
  return STATUS_ICON_COLOR_CLASS[status ?? "planned"];
}

export function getStatusIcon(
  status: CourseStatus | undefined | null,
  className = "h-3.5 w-3.5",
) {
  const colorClass = getStatusIconColorClass(status);
  const combined = `${className} ${colorClass}`;
  switch (status) {
    case "completed":
      return <CheckCircle2 className={combined} />;
    case "in-progress":
      return <CircleDot className={combined} />;
    case "failed":
      return <X className={combined} />;
    default:
      return <CircleDashed className={combined} />;
  }
}

interface PlannerStatusDict {
  completed: string;
  inProgress: string;
  failed: string;
  planned: string;
}

export function getStatusLabel(
  status: CourseStatus | undefined | null,
  dict: PlannerStatusDict,
) {
  switch (status) {
    case "completed":
      return dict.completed;
    case "in-progress":
      return dict.inProgress;
    case "failed":
      return dict.failed;
    default:
      return dict.planned;
  }
}
