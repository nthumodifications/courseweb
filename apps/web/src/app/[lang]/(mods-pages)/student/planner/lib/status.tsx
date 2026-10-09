import { CheckCircle2, CircleDashed, CircleDot, X } from "lucide-react";
import { CourseStatus } from "../types";

export const STATUS_BADGE_CLASS: Record<CourseStatus, string> = {
  completed:
    "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  "in-progress":
    "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  failed:
    "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  planned:
    "bg-secondary text-secondary-foreground border-border",
};

const STATUS_ICON_COLOR_CLASS: Record<CourseStatus, string> = {
  completed: "text-green-500 dark:text-green-400",
  "in-progress": "text-blue-500 dark:text-blue-400",
  failed: "text-red-500 dark:text-red-400",
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
