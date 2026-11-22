import { useDraggable } from "@dnd-kit/core";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import {
  CalendarDays,
  Check,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { decodeCourseText } from "@/lib/course-text";
import { toPrettySemester } from "@/helpers/semester";
import useDictionary from "@/dictionaries/useDictionary";
import { FolderDocType, ItemDocType, SemesterDocType } from "../../rxdb";
import { useConfirm } from "../../lib/use-confirm";
import { getFolderColorDotClass } from "../../lib/folder-colors";
import {
  effectiveStatus,
  normalizeSemesterId,
  RequirementProgress,
} from "../../lib/progress";

export const formatPlannerText = (
  template: string,
  values: Record<string, string | number>,
) =>
  template.replace(/\{([^{}]+)\}/g, (_, key: string) => `${values[key] ?? ""}`);

export const formatPlannerSemester = (semester: string) =>
  toPrettySemester(normalizeSemesterId(semester));

export const comparePlannerSemesters = (left: string, right: string) =>
  normalizeSemesterId(left).localeCompare(normalizeSemesterId(right));

export const splitCourseTitle = (title: string) => {
  const decoded = decodeCourseText(title);
  const match = decoded.match(/^(.*?)(?:\s+([A-Za-z][\s\S]*))?$/);
  return { primary: match?.[1] ?? decoded, secondary: match?.[2] ?? "" };
};

export const getCategoryColorClass = (folder?: FolderDocType) =>
  folder ? getFolderColorDotClass(folder.color) : "bg-muted-foreground";

export const isPlannerItemPending = (item: ItemDocType) =>
  (item.parent === "_unsorted" ||
    (!item.semester && item.status !== "failed")) &&
  item.status !== "failed";

export const getPlannerItemCategory = (
  item: ItemDocType,
  folders: FolderDocType[],
) => {
  let folder = folders.find((entry) => entry.id === item.parent);
  const seen = new Set<string>();
  while (folder?.parent && !seen.has(folder.id)) {
    seen.add(folder.id);
    const parent = folders.find((entry) => entry.id === folder?.parent);
    if (!parent || parent.id === "planner-1") break;
    folder = parent;
  }
  return folder;
};

export interface PlannerViewProps {
  folders: FolderDocType[];
  items: ItemDocType[];
  semesters: SemesterDocType[];
  now: string;
  overall: {
    done: number;
    inProgress: number;
    planned: number;
    required: number;
    remaining: number;
  };
  progress: Map<string, RequirementProgress>;
  pendingOnly: boolean;
  onOpenAddCourse: (folderId?: string, semesterId?: string) => void;
  onViewDetails: (item: ItemDocType) => void;
  onEdit: (item: ItemDocType) => void;
  onDelete: (item: ItemDocType) => void;
  onMoveCategory: (item: ItemDocType, folderId: string) => void;
  onChangeSemester: (item: ItemDocType, semesterId?: string) => void;
  onSetFailed: (item: ItemDocType, failed: boolean) => void;
}

interface PlannerCourseActionsProps {
  item: ItemDocType;
  folders: FolderDocType[];
  semesters: SemesterDocType[];
  onViewDetails: (item: ItemDocType) => void;
  onEdit: (item: ItemDocType) => void;
  onDelete: (item: ItemDocType) => void;
  onMoveCategory: (item: ItemDocType, folderId: string) => void;
  onChangeSemester: (item: ItemDocType, semesterId?: string) => void;
  onSetFailed: (item: ItemDocType, failed: boolean) => void;
}

export function PlannerCourseActions({
  item,
  folders,
  semesters,
  onViewDetails,
  onEdit,
  onDelete,
  onMoveCategory,
  onChangeSemester,
  onSetFailed,
}: PlannerCourseActionsProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const { confirm, ConfirmDialog } = useConfirm();
  const sortedFolders = [...folders]
    .filter((folder) => folder.id !== "planner-1")
    .sort((a, b) => a.order - b.order);
  const sortedSemesters = [...semesters].sort((a, b) =>
    comparePlannerSemesters(a.id, b.id),
  );

  const requestDelete = async () => {
    const accepted = await confirm({
      title: t.deleteConfirmTitle,
      description: `${decodeCourseText(item.title)} — ${t.deleteConfirmDescription}`,
      confirmLabel: dict.planner.common.delete,
      cancelLabel: dict.planner.common.cancel,
      destructive: true,
    });
    if (accepted) onDelete(item);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={dict.planner.courseList.moreActions}
            title={dict.planner.courseList.moreActions}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-border">
          <DropdownMenuItem onClick={() => onViewDetails(item)}>
            {t.viewDetails}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(item)}>
            {t.editCourse}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t.moveCategory}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto border-border">
              {sortedFolders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => onMoveCategory(item, folder.id)}
                >
                  {folder.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t.changeTerm}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto border-border">
              <DropdownMenuItem onClick={() => onChangeSemester(item)}>
                {t.noneTerm}
              </DropdownMenuItem>
              {sortedSemesters.map((semester) => (
                <DropdownMenuItem
                  key={semester.id}
                  onClick={() => onChangeSemester(item, semester.id)}
                >
                  {formatPlannerSemester(semester.id)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {item.status === "failed" ? (
            <DropdownMenuItem onClick={() => onSetFailed(item, false)}>
              {t.clearFailed}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onSetFailed(item, true)}>
              {t.markFailed}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500" onClick={requestDelete}>
            {t.deleteCourse}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {ConfirmDialog}
    </>
  );
}

interface PlannerCourseRowProps
  extends Omit<PlannerCourseActionsProps, "item"> {
  item: ItemDocType;
  now: string;
  showSemester?: boolean;
  showCode?: boolean;
  enableDrag?: boolean;
  compact?: boolean;
  showInProgressStatus?: boolean;
  rowId?: string;
  categoryFolder?: FolderDocType;
  onOpenDetails?: (item: ItemDocType) => void;
}

export function PlannerCourseRow({
  item,
  now,
  semesters,
  showSemester = false,
  showCode = false,
  enableDrag = true,
  compact = false,
  showInProgressStatus = true,
  rowId,
  categoryFolder,
  onOpenDetails,
  ...actions
}: PlannerCourseRowProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const status = effectiveStatus(item, now);
  const title = splitCourseTitle(item.title);
  const term = item.semester
    ? formatPlannerSemester(item.semester)
    : t.noneTerm;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `planner-course-${item.uuid}`,
      data: { type: "course", course: item },
      disabled: !enableDrag,
    });
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      id={rowId}
      ref={setNodeRef}
      style={dragStyle}
      className={`group flex items-center border-b border-border/70 ${compact ? "h-8 min-h-8 flex-nowrap gap-1" : "min-h-11 flex-wrap gap-2 px-1 py-2"} ${isDragging ? "opacity-40" : ""}`}
    >
      {enableDrag && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-7 w-4 shrink-0 touch-none cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          aria-label={t.dragHint}
          title={t.dragHint}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {categoryFolder && (
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(categoryFolder)}`}
        />
      )}
      {showCode && (
        <span className="hidden w-24 shrink-0 font-mono text-xs text-muted-foreground md:block">
          {item.id}
        </span>
      )}
      <button
        type="button"
        className={`min-w-0 flex-1 text-left leading-5 ${compact ? "truncate text-xs" : "basis-40"}`}
        onClick={() => onOpenDetails?.(item)}
        title={decodeCourseText(item.title)}
      >
        <span className="font-medium">{title.primary}</span>
        {!compact && title.secondary && (
          <span className="ml-1 text-xs text-muted-foreground">
            {title.secondary}
          </span>
        )}
      </button>
      <span className="shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground">
        {formatPlannerText(t.credits, { count: item.credits })}
      </span>
      {showSemester && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={compact ? "icon" : "sm"}
              className={`${compact ? "h-7 w-7 px-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100" : "h-7 min-w-[4.5rem] gap-1 px-2"} text-xs ${!item.semester && !compact ? "text-red-500" : status === "in-progress" ? "text-primary" : "text-muted-foreground"}`}
              aria-label={`${t.changeTerm}: ${term}`}
              title={`${t.changeTerm}: ${term}`}
            >
              <span className={compact ? "sr-only" : ""}>
                {item.semester ? term : t.noneTerm}
              </span>
              {!compact && status === "in-progress" && (
                <span className="rounded-sm bg-primary/10 px-1 py-1 text-[10px] text-primary">
                  {t.currentTerm}
                </span>
              )}
              <CalendarDays
                className={`${compact ? "h-3.5 w-3.5" : "ml-1 h-3 w-3"}`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            <DropdownMenuItem onClick={() => actions.onChangeSemester(item)}>
              {t.noneTerm}
            </DropdownMenuItem>
            {semesters.map((semester) => (
              <DropdownMenuItem
                key={semester.id}
                onClick={() => actions.onChangeSemester(item, semester.id)}
              >
                {formatPlannerSemester(semester.id)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {status === "failed" ? (
        <span className="rounded-sm bg-red-500/10 px-1.5 py-1 text-xs font-medium text-red-500">
          {t.statusFailed}
        </span>
      ) : status === "in-progress" && showInProgressStatus ? (
        <span className="rounded-sm bg-primary/10 px-1.5 py-1 text-xs font-medium text-primary">
          {t.statusInProgress}
        </span>
      ) : null}
      <PlannerCourseActions item={item} semesters={semesters} {...actions} />
    </div>
  );
}

export const RequirementSummary = ({
  folder,
  progress,
}: {
  folder: FolderDocType;
  progress?: RequirementProgress;
}) => {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const done = progress?.done ?? 0;
  const inProgress = progress?.inProgress ?? 0;
  const planned = progress?.planned ?? 0;
  const covered = done + inProgress + planned;
  const max = progress?.max ?? folder.max;
  const min = progress?.min ?? folder.min;
  const requirementRange = max && max !== min ? `${min}–${max}` : `${min}`;
  const unit =
    folder.metric === "courses"
      ? dict.planner.sidebar.coursesUnit
      : dict.course.credits;
  const remaining = progress?.remaining ?? Math.max(0, min - covered);

  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>
        {formatPlannerText(t.requirement, {
          covered,
          range: requirementRange,
          unit,
        })}
      </span>
      {remaining > 0 ? (
        <span className="font-medium text-red-500">
          {formatPlannerText(t.missingCount, { count: remaining })}
        </span>
      ) : progress?.satisfied ? (
        <span className="inline-flex items-center gap-1">
          <Check className="h-3 w-3" />
          {t.satisfied}
        </span>
      ) : (
        <span className="font-medium text-primary">{t.plannedCoverage}</span>
      )}
    </span>
  );
};
