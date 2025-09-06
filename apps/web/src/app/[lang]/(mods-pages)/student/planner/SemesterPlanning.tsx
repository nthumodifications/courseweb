import {
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  MinusCircle,
  Calendar,
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
}: SemesterPlanningProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600 min-w-max">已完成</Badge>;
      case "in-progress":
        return <Badge className="bg-yellow-600 min-w-max">進行中</Badge>;
      default:
        return (
          <Badge className="min-w-max" variant="outline">
            計劃中
          </Badge>
        );
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-500/30 bg-green-500/10";
      case "in-progress":
        return "border-yellow-500/30 bg-yellow-500/10";
      default:
        return "border-border bg-neutral-800";
    }
  };

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

  // Track whether a dragged course was dropped into a valid target
  const handleDragStart = (e: React.DragEvent, course: ItemDocType) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(course));
    // Add a custom property to track the source semester
    e.dataTransfer.setData("source-semester", course.semester || "");
  };

  const handleDragEnd = (e: React.DragEvent, course: ItemDocType) => {
    // If the course was not dropped in a valid drop target
    // (dropEffect is "none" when not dropped in a valid target)
    if (e.dataTransfer.dropEffect === "none") {
      // Remove the course from its current semester
      onSemesterChange(course.uuid, undefined);
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {semesters.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
              <div className="text-center space-y-3">
                <h3 className="font-medium text-lg">尚未設定任何學期</h3>
                <p className="text-neutral-400">
                  請點擊右上角的 <Calendar className="size-4 inline" />{" "}
                  按鈕來創建您的第一個學期
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
                  <Card
                    key={semester.id}
                    className={`bg-background border ${semester.id === currentSemester ? "border-primary" : "border-border"} cursor-pointer transition-all hover:border-primary`}
                    onClick={() => setCurrentSemester(semester.id)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">
                          {semester.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {getStatusBadge(semester.status)}{" "}
                        {getTotalCreditsBySemester(semester.id)} 學分
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
            </div>

            {currentSemester && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">
                    {semesters.find((s) => s.id === currentSemester)?.name} 課程
                  </h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新增課程
                  </Button>
                </div>

                <div
                  className={`border-2 border-dashed rounded-md p-2 ${
                    semesters.find((s) => s.id === currentSemester)?.status ===
                    "completed"
                      ? "border-green-500/30"
                      : semesters.find((s) => s.id === currentSemester)
                            ?.status === "in-progress"
                        ? "border-yellow-500/30"
                        : "border-border"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    // Handle drop logic here
                    try {
                      const courseData = JSON.parse(
                        e.dataTransfer.getData("text/plain"),
                      );
                      onSemesterChange(courseData.uuid, currentSemester);
                    } catch (error) {
                      console.error("Error parsing course data:", error);
                    }
                  }}
                >
                  <div className="space-y-1 min-h-[100px]">
                    {getCoursesBySemester(currentSemester).map(
                      (course, index) => (
                        <div
                          key={index}
                          className="p-2 rounded-md border border-border bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center"
                          draggable
                          onDragStart={(e) => handleDragStart(e, course)}
                          onDragEnd={(e) => handleDragEnd(e, course)}
                        >
                          <div className="flex-1 min-w-0 overflow-hidden mr-2">
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {course.id}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {course.credits}學分
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
                              className="h-8 w-8"
                              onClick={() => onViewDetails(course)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => onEdit(course)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  編輯課程
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    onStatusChange(course.uuid, "completed")
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                  標記為已完成
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onStatusChange(course.uuid, "in-progress")
                                  }
                                >
                                  <CircleDot className="h-4 w-4 mr-2 text-yellow-500" />
                                  標記為進行中
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onStatusChange(course.uuid, "planned")
                                  }
                                >
                                  <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
                                  標記為計劃中
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-700" />
                                <DropdownMenuItem
                                  className="text-red-400 cursor-pointer"
                                  onClick={() =>
                                    onSemesterChange(course.uuid, undefined)
                                  }
                                >
                                  <MinusCircle className="h-4 w-4 mr-2" />
                                  從學期移除
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-400 cursor-pointer"
                                  onClick={() => onDelete(course)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  移除課程
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ),
                    )}

                    {getCoursesBySemester(currentSemester).length === 0 && (
                      <div className="flex items-center justify-center h-24 text-neutral-400">
                        <p>拖曳課程到此處或點擊新增課程</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentSemester && (
              <Card className="border-border">
                <CardHeader className="p-3">
                  <CardTitle className="text-base">學期統計</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span>總學分</span>
                        <span>
                          {getTotalCreditsBySemester(currentSemester)}
                        </span>
                      </div>
                      <Progress
                        value={
                          (getTotalCreditsBySemester(currentSemester) / 25) *
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
                            {folder.totalCredits} 學分
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
    </ScrollArea>
  );
}
