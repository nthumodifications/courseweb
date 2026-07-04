import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  MinusCircle,
  Plus,
} from "lucide-react";
import { Button } from "@courseweb/ui";
import { Progress } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@courseweb/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { FolderDocType, ItemDocType, SemesterDocType } from "./rxdb";
import { CourseStatus } from "@/app/[lang]/(mods-pages)/student/planner/types";
import {
  getStatusBadgeClass,
  getStatusIcon,
  getStatusLabel,
} from "./lib/status";
import { useConfirm } from "./lib/use-confirm";
import { CreateCourseDialog } from "./components/dialogs/create-course-dialog";
import useDictionary from "@/dictionaries/useDictionary";
import { useState } from "react";

// Named constant instead of a magic number: the credit cap used to size the
// "total credits" progress bar for a single semester.
const MAX_CREDITS_PER_SEMESTER = 25;

type Dict = ReturnType<typeof useDictionary>;

interface SemesterPlanningProps {
  folders: FolderDocType[];
  semesters: SemesterDocType[];
  currentSemester: string | undefined;
  setCurrentSemester: (semester: string) => void;
  getCoursesBySemester: (semester: string) => ItemDocType[];
  getTotalCreditsBySemester: (semester: string) => number;
  onViewDetails: (course: ItemDocType) => void;
  onEdit: (course: ItemDocType) => void;
  onStatusChange: (uuid: string, status: CourseStatus) => void;
  onSemesterChange: (uuid: string, semester: string | undefined) => void;
  onDelete: (course: ItemDocType) => void;
  onCreateCourse: (newCourse: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string;
    order: number;
    dependson: string[];
  }) => Promise<void>;
}

interface SemesterCourseRowProps {
  course: ItemDocType;
  dict: Dict;
  onViewDetails: (course: ItemDocType) => void;
  onEdit: (course: ItemDocType) => void;
  onStatusChange: (uuid: string, status: CourseStatus) => void;
  onSemesterChange: (uuid: string, semester: string | undefined) => void;
  onDeleteRequest: (course: ItemDocType) => void;
}

function SemesterCourseRow({
  course,
  dict,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  onDeleteRequest,
}: SemesterCourseRowProps) {
  // Draggable course row (dnd-kit) - lets the user drag a scheduled course
  // back out to another semester or into a folder.
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `course-${course.uuid}`,
      data: { type: "course", course },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-md border border-border bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center touch-none cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0 overflow-hidden mr-2">
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {course.id}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {course.credits} {dict.planner.semester.creditsUnit}
          </Badge>
          <Badge
            className={`${getStatusBadgeClass(course.status as CourseStatus)} text-xs flex items-center gap-1`}
          >
            {getStatusIcon(course.status as CourseStatus)}
            {getStatusLabel(course.status as CourseStatus, dict.planner.status)}
          </Badge>
        </div>
        <div className="text-sm font-medium truncate max-w-full">
          {course.title}
        </div>
      </div>
      <div className="flex items-center flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          aria-label={dict.planner.semester.viewDetailsAriaLabel}
          title={dict.planner.semester.viewDetailsAriaLabel}
          onClick={() => onViewDetails(course)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label={dict.planner.semester.moreActionsAriaLabel}
              title={dict.planner.semester.moreActionsAriaLabel}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEdit(course)}>
              <Edit className="h-4 w-4 mr-2" />
              {dict.planner.semester.editCourse}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onStatusChange(course.uuid, "completed")}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              {dict.planner.semester.markAs}{" "}
              {getStatusLabel("completed", dict.planner.status)}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange(course.uuid, "in-progress")}
            >
              <CircleDot className="h-4 w-4 mr-2 text-yellow-500" />
              {dict.planner.semester.markAs}{" "}
              {getStatusLabel("in-progress", dict.planner.status)}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange(course.uuid, "planned")}
            >
              <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
              {dict.planner.semester.markAs}{" "}
              {getStatusLabel("planned", dict.planner.status)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 cursor-pointer"
              onClick={() => onSemesterChange(course.uuid, undefined)}
            >
              <MinusCircle className="h-4 w-4 mr-2" />
              {dict.planner.semester.removeFromSemester}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 cursor-pointer"
              onClick={() => onDeleteRequest(course)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {dict.planner.semester.deleteCourse}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface SemesterSummaryCardProps {
  semester: SemesterDocType;
  isActive: boolean;
  totalCredits: number;
  dict: Dict;
  onSelect: () => void;
}

function SemesterSummaryCard({
  semester,
  isActive,
  totalCredits,
  dict,
  onSelect,
}: SemesterSummaryCardProps) {
  // Droppable target so a course can be dropped directly onto a semester
  // card to assign it, without first selecting that semester.
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-${semester.id}`,
    data: { type: "semester", semesterId: semester.id },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`bg-background border ${
        isActive
          ? "border-primary"
          : isOver
            ? "border-primary/70 bg-primary/5"
            : "border-border"
      } cursor-pointer transition-all hover:border-primary`}
      onClick={onSelect}
    >
      <CardHeader className="p-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">{semester.name}</CardTitle>
        </div>
        <CardDescription className="text-sm flex items-center gap-1">
          <Badge
            className={`${getStatusBadgeClass(semester.status as CourseStatus)} text-xs`}
          >
            {getStatusLabel(
              semester.status as CourseStatus,
              dict.planner.status,
            )}
          </Badge>
          {totalCredits} {dict.planner.semester.creditsUnit}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface CurrentSemesterDropZoneProps {
  semesterId: string;
  className: string;
  children: React.ReactNode;
}

function CurrentSemesterDropZone({
  semesterId,
  className,
  children,
}: CurrentSemesterDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-active-${semesterId}`,
    data: { type: "semester", semesterId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded-md p-2 ${className} ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function SemesterPlanning({
  folders,
  semesters,
  currentSemester,
  setCurrentSemester,
  getCoursesBySemester,
  getTotalCreditsBySemester,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  onDelete,
  onCreateCourse,
}: SemesterPlanningProps) {
  const dict = useDictionary();
  const { confirm, ConfirmDialog } = useConfirm();
  const [createCourseOpen, setCreateCourseOpen] = useState(false);

  const topFolders = folders.filter((folder) => folder.parent === "planner-1");

  const getAllCoursesInFolder = (
    folderId: string,
    semesterId: string,
  ): ItemDocType[] => {
    // Get direct courses in this folder from the current semester only
    const directCourses = getCoursesBySemester(semesterId).filter(
      (course) => course.parent === folderId,
    );

    // Get all subfolders of this folder
    const subfolders = folders.filter((f) => f.parent === folderId);

    // Recursively get courses from all subfolders for the current semester
    const coursesInSubfolders = subfolders.flatMap((subfolder) =>
      getAllCoursesInFolder(subfolder.id, semesterId),
    );

    // Combine direct courses and courses from subfolders
    return [...directCourses, ...coursesInSubfolders];
  };

  const creditsInEachTopFolder = topFolders.map((folder) => {
    const coursesInFolder = currentSemester
      ? getAllCoursesInFolder(folder.id, currentSemester)
      : [];

    const totalCredits = coursesInFolder.reduce(
      (total, course) => total + course.credits,
      0,
    );

    return { folder, totalCredits };
  });

  const handleDeleteRequest = async (course: ItemDocType) => {
    const confirmed = await confirm({
      title: dict.planner.semester.deleteCourseConfirmTitle,
      description: dict.planner.semester.deleteCourseConfirmDescription,
      confirmLabel: dict.planner.common.delete,
      cancelLabel: dict.planner.common.cancel,
      destructive: true,
    });
    if (confirmed) {
      onDelete(course);
    }
  };

  // Reuses the shared course-creation callback, then scopes the new course
  // to whichever semester is currently being viewed.
  const handleCreateCourseForSemester = async (newCourse: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
  }) => {
    await onCreateCourse({
      ...newCourse,
      parent: newCourse.parent ?? "planner-1",
    });
    if (currentSemester) {
      await onSemesterChange(newCourse.uuid, currentSemester);
    }
  };

  const currentSemesterStatusClass = (() => {
    const status = semesters.find((s) => s.id === currentSemester)?.status;
    if (status === "completed") return "border-green-500/30";
    if (status === "in-progress") return "border-yellow-500/30";
    return "border-border";
  })();

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="p-4 space-y-4">
        {semesters.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
              <div className="text-center space-y-3">
                <h3 className="font-medium text-lg">
                  {dict.planner.semester.emptyTitle}
                </h3>
                <p className="text-neutral-400">
                  {dict.planner.semester.emptyDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {semesters
                .filter((s) => s.isActive)
                .map((semester) => (
                  <SemesterSummaryCard
                    key={semester.id}
                    semester={semester}
                    isActive={semester.id === currentSemester}
                    totalCredits={getTotalCreditsBySemester(semester.id)}
                    dict={dict}
                    onSelect={() => setCurrentSemester(semester.id)}
                  />
                ))}
            </div>

            {currentSemester && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">
                    {semesters.find((s) => s.id === currentSemester)?.name}{" "}
                    {dict.planner.semester.coursesSuffix}
                  </h3>
                  <Button size="sm" onClick={() => setCreateCourseOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {dict.planner.courseList.addCourse}
                  </Button>

                  <CreateCourseDialog
                    open={createCourseOpen}
                    onOpenChange={setCreateCourseOpen}
                    onCreateCourse={handleCreateCourseForSemester}
                  />
                </div>

                <CurrentSemesterDropZone
                  semesterId={currentSemester}
                  className={currentSemesterStatusClass}
                >
                  <div className="space-y-1 min-h-[100px]">
                    {getCoursesBySemester(currentSemester).map((course) => (
                      <SemesterCourseRow
                        key={course.uuid}
                        course={course}
                        dict={dict}
                        onViewDetails={onViewDetails}
                        onEdit={onEdit}
                        onStatusChange={onStatusChange}
                        onSemesterChange={onSemesterChange}
                        onDeleteRequest={handleDeleteRequest}
                      />
                    ))}

                    {getCoursesBySemester(currentSemester).length === 0 && (
                      <div className="flex items-center justify-center h-24 text-neutral-400 text-center px-4">
                        <p>{dict.planner.semester.dropHint}</p>
                      </div>
                    )}
                  </div>
                </CurrentSemesterDropZone>
              </div>
            )}

            {currentSemester && (
              <Card className="border-border">
                <CardHeader className="p-3">
                  <CardTitle className="text-base">
                    {dict.planner.semester.statsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span>{dict.planner.semester.totalCredits}</span>
                        <span>
                          {getTotalCreditsBySemester(currentSemester)}
                        </span>
                      </div>
                      <Progress
                        value={
                          (getTotalCreditsBySemester(currentSemester) /
                            MAX_CREDITS_PER_SEMESTER) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {creditsInEachTopFolder.map((folder) => (
                        <div
                          key={folder.folder.id}
                          className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md"
                        >
                          <p className="text-xs text-neutral-400">
                            {folder.folder.title}
                          </p>
                          <p className="font-medium">
                            {folder.totalCredits}{" "}
                            {dict.planner.semester.creditsUnit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      {ConfirmDialog}
    </ScrollArea>
  );
}
