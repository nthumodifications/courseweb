import {
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  SquareCheckBig,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@courseweb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import { SemesterDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";
import { useConfirm } from "@/app/[lang]/(mods-pages)/student/planner/lib/use-confirm";
import useDictionary from "@/dictionaries/useDictionary";

interface BulkActionsMenuProps {
  selectedCount: number;
  semesterData: SemesterDocType[];
  onStatusChange: (status: CourseStatus) => void;
  onSemesterChange: (semesterId: string) => void;
  onDelete: () => void;
  onClearSelections: () => void;
}

export function BulkActionsMenu({
  selectedCount,
  semesterData,
  onStatusChange,
  onSemesterChange,
  onDelete,
  onClearSelections,
}: BulkActionsMenuProps) {
  const dict = useDictionary();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: dict.planner.bulkActions.deleteConfirmTitle,
      description: dict.planner.bulkActions.deleteConfirmDescription.replace(
        "{count}",
        String(selectedCount),
      ),
      confirmLabel: dict.planner.common.delete,
      cancelLabel: dict.planner.common.cancel,
      destructive: true,
    });
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-[calc(100vw-2rem)] overflow-x-auto bg-background border border-border rounded-lg shadow-lg p-2 z-50 transition-all duration-200 flex items-center gap-2">
      <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-md mr-2 shrink-0">
        <SquareCheckBig className="h-4 w-4 text-primary mr-1" />
        <span className="text-sm font-medium w-max">
          {dict.planner.bulkActions.selectedCount.replace(
            "{count}",
            String(selectedCount),
          )}
        </span>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onStatusChange("completed")}
          aria-label={dict.planner.bulkActions.markAsCompleted}
          title={dict.planner.bulkActions.markAsCompleted}
        >
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onStatusChange("in-progress")}
          aria-label={dict.planner.bulkActions.markAsInProgress}
          title={dict.planner.bulkActions.markAsInProgress}
        >
          <CircleDot className="h-4 w-4 text-yellow-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onStatusChange("planned")}
          aria-label={dict.planner.bulkActions.markAsPlanned}
          title={dict.planner.bulkActions.markAsPlanned}
        >
          <CircleDashed className="h-4 w-4 text-neutral-400" />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-11 shrink-0">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{dict.planner.bulkActions.changeSemester}</span>
            <ChevronsUpDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="border-border">
          {semesterData.map((semester) => (
            <DropdownMenuItem
              key={semester.id}
              className="cursor-pointer"
              onClick={() => onSemesterChange(semester.id)}
            >
              {semester.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="border-l border-border pl-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-red-500 hover:text-red-400 hover:bg-red-900/20"
          onClick={handleDelete}
          aria-label={dict.planner.bulkActions.delete}
          title={dict.planner.bulkActions.delete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          <span>{dict.planner.bulkActions.delete}</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 ml-1 shrink-0"
        onClick={onClearSelections}
        aria-label={dict.planner.bulkActions.clearSelection}
        title={dict.planner.bulkActions.clearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
      {ConfirmDialog}
    </div>
  );
}
