import { useState } from "react";
import { Badge } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import {
  Calendar,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { SemesterSelectionDialog } from "../../components/semester-selection-dialog";
import { CourseStatus } from "../../types";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import {
  getStatusBadgeClass,
  getStatusIcon,
  getStatusLabel,
} from "@/app/[lang]/(mods-pages)/student/planner/lib/status";
import { useConfirm } from "@/app/[lang]/(mods-pages)/student/planner/lib/use-confirm";
import useDictionary from "@/dictionaries/useDictionary";

interface CourseListItemProps {
  course: ItemDocType;
  isSelected: boolean;
  isMultiSelected: boolean;
  onClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onStatusChange: (status: CourseStatus) => void;
  onSemesterChange: (semester: string) => void;
  semesters: SemesterDocType[];
  folders: FolderDocType[];
  onDeleteCourse: () => void;
}

/**
 * Resolves a course's parent folder id to a display name, falling back to
 * `fallback` when the course has no parent or the folder can't be found.
 * Shared with `course-grid-item.tsx` to keep folder-name resolution consistent.
 */
export function getParentName(
  course: ItemDocType,
  folders: FolderDocType[],
  fallback: string,
) {
  const parentFolder = folders.find((folder) => folder.id === course.parent);
  return parentFolder ? parentFolder.title : fallback;
}

export function CourseListItem({
  course,
  isSelected,
  isMultiSelected,
  onClick,
  onSelect,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  semesters,
  folders,
  onDeleteCourse,
}: CourseListItemProps) {
  const dict = useDictionary();
  const { confirm, ConfirmDialog } = useConfirm();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSemesterDialogOpen, setIsSemesterDialogOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `course-${course.uuid}`,
      data: { type: "course", course },
    });
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const handleStatusChange = (status: CourseStatus) => {
    setDropdownOpen(false);
    onStatusChange(status);
  };

  const handleEdit = () => {
    setDropdownOpen(false);
    onEdit();
  };

  const handleDeleteCourse = async () => {
    setDropdownOpen(false);
    const confirmed = await confirm({
      title: dict.planner.courseList.deleteConfirmTitle,
      description: `${course.title} — ${dict.planner.courseList.deleteConfirmDescription}`,
      confirmLabel: dict.planner.common.delete,
      cancelLabel: dict.planner.common.cancel,
      destructive: true,
    });
    if (confirmed) {
      onDeleteCourse();
    }
  };

  const handleSemesterChange = (semester: string) => {
    setDropdownOpen(false);
    onSemesterChange(semester);
  };

  const openSemesterDialog = () => {
    setDropdownOpen(false);
    setIsSemesterDialogOpen(true);
  };

  const status = course.status as CourseStatus | null | undefined;

  const parentName = getParentName(
    course,
    folders,
    dict.planner.courseList.noFolder,
  );

  const semesterStatusText = course.semester
    ? course.status === "completed"
      ? `${dict.planner.courseList.completedIn} ${course.semester}`
      : course.status === "in-progress"
        ? `${dict.planner.courseList.inProgressIn} ${course.semester}`
        : `${dict.planner.courseList.plannedFor} ${course.semester}`
    : dict.planner.courseList.noSemester;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      className={`flex items-center p-2 rounded-md border ${isSelected ? "border-primary" : isMultiSelected ? "border-primary bg-primary/10" : "border-border"}
        bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:border-primary transition-colors duration-200 group relative touch-none`}
      onClick={onClick}
    >
      {/* Selection checkbox - always rendered, at reduced opacity until hover/focus/selected */}
      <button
        type="button"
        aria-label={dict.planner.courseList.selectCourse}
        title={dict.planner.courseList.selectCourse}
        className={`absolute left-1 top-1 p-3.5 flex items-center justify-center rounded ${
          isMultiSelected
            ? "opacity-100"
            : "opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
        } transition-opacity duration-200 z-10`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center
          ${isMultiSelected ? "bg-primary border-primary" : "border-neutral-500 bg-neutral-50 dark:bg-neutral-800"}`}
        >
          {isMultiSelected && <Check className="h-3 w-3" />}
        </div>
      </button>
      <div className="flex-1 min-w-0 pl-8">
        <div className="flex items-center flex-wrap gap-1 mb-1">
          <Badge variant="outline" className="text-xs">
            {course.id}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {course.credits} {dict.course.credits}
          </Badge>
          <Badge
            className={`${getStatusBadgeClass(status)} text-xs flex items-center gap-1`}
          >
            {getStatusIcon(status, "h-4 w-4")}
            {getStatusLabel(status, dict.planner.status)}
          </Badge>
        </div>
        <div className="font-medium truncate">{course.title}</div>
        <div className="flex items-center mt-1 text-xs text-neutral-400">
          <span>{parentName}</span>
          <span className="mx-1">•</span>
          <span>{semesterStatusText}</span>
        </div>
      </div>
      <div
        className="flex items-center ml-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={dict.planner.courseList.viewDetails}
          title={dict.planner.courseList.viewDetails}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              aria-label={dict.planner.courseList.moreActions}
              title={dict.planner.courseList.moreActions}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-border">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {dict.planner.courseList.editCourse}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              {dict.planner.courseList.markAsCompleted}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>
              <CircleDot className="h-4 w-4 mr-2 text-yellow-500" />
              {dict.planner.courseList.markAsInProgress}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("planned")}>
              <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
              {dict.planner.courseList.markAsPlanned}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openSemesterDialog}>
              <Calendar className="h-4 w-4 mr-2" />
              {dict.planner.courseList.changeSemester}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteCourse}>
              <Trash2 className="h-4 w-4 mr-2" />
              {dict.planner.courseList.deleteCourse}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Semester Selection Dialog */}
      <SemesterSelectionDialog
        open={isSemesterDialogOpen}
        onOpenChange={setIsSemesterDialogOpen}
        semesters={semesters}
        currentSemester={course.semester}
        onSemesterSelect={handleSemesterChange}
      />
      {ConfirmDialog}
    </div>
  );
}
