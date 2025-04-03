import { Button } from "@/components/ui/button";
import { FolderDocType } from "@/config/rxdb";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  FolderTree,
  CalendarDays,
  Search,
} from "lucide-react";
import { CreateCourseDialog } from "../dialogs/create-course-dialog";

interface CourseListEmptyProps {
  type: "noFolderSelected" | "hasChildFolders" | "noCoursesInFolder";
  courseData: any[];
  selectedFolder?: string | null;
  childFolders?: FolderDocType[];
  onSelectFolder?: (folderId: string) => void;
  onOpenFolderManagement?: () => void;
  onOpenSemesterManagement?: () => void;
  onOpenCourseSearch?: () => void;
  createCourseOpen: boolean;
  setCreateCourseOpen: (open: boolean) => void;
  onCreateCourse: (newCourse: any) => Promise<void>;
}

export function CourseListEmpty({
  type,
  courseData,
  selectedFolder,
  childFolders = [],
  onSelectFolder,
  onOpenFolderManagement,
  onOpenSemesterManagement,
  onOpenCourseSearch,
  createCourseOpen,
  setCreateCourseOpen,
  onCreateCourse,
}: CourseListEmptyProps) {
  // No folder selected - Show all courses or getting started instructions
  if (type === "noFolderSelected") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        {courseData.length > 0 ? (
          <div className="text-center">
            <h3 className="text-xl font-bold">選擇資料夾</h3>
            <p className="text-neutral-400 mt-2 mb-4">
              請從左側選擇一個資料夾來查看及管理課程
            </p>
          </div>
        ) : (
          <div className="max-w-lg text-center">
            <h3 className="text-xl font-bold mb-6">開始使用學分規劃</h3>
            <div className="space-y-6 text-left">
              <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">創建並選擇資料夾</h4>
                  <p className="text-neutral-400 mb-2 text-sm">
                    在左側面板建立您的畢業要求資料夾，或使用模板
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenFolderManagement}
                  >
                    <FolderTree className="h-4 w-4 mr-2" />
                    管理資料夾
                  </Button>
                </div>
              </div>

              <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">新增課程</h4>
                  <p className="text-neutral-400 mb-2 text-sm">
                    選擇資料夾後，點擊上方的「新增課程」按鈕
                  </p>
                  <p className="text-neutral-400 mb-2 text-xs">
                    提示：您可以設定課程狀態以追蹤進度
                  </p>
                  <div className="flex space-x-2 mb-1">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      已完成
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                      <CircleDot className="h-3 w-3" />
                      進行中
                    </Badge>
                    <Badge className="bg-neutral-700 text-neutral-300 border-neutral-600 flex items-center gap-1">
                      <CircleDashed className="h-3 w-3" />
                      計劃中
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">分配學期</h4>
                  <p className="text-neutral-400 mb-2 text-sm">
                    將課程分配到學期，以規劃您的學習路徑
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenSemesterManagement}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    管理學期
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Folder selected but not a leaf node and has no courses
  if (type === "hasChildFolders") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        <div className="max-w-md text-center">
          <FolderTree className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
          <h3 className="text-xl font-bold mb-2">選擇子資料夾</h3>
          <p className="text-neutral-400 mb-4">
            請選擇左側面板的子資料夾來管理課程。
            只有末端資料夾可以直接添加課程。
          </p>
          <div className="bg-neutral-800/50 p-3 rounded-lg text-left mb-4">
            <p className="text-sm">可用子資料夾：</p>
            <div className="mt-2 space-y-1">
              {childFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center p-2 rounded-md hover:bg-neutral-700 cursor-pointer"
                  onClick={() => onSelectFolder?.(folder.id)}
                >
                  {childFolders.some((f) => f.parent === folder.id) ? (
                    <ChevronRight className="h-4 w-4 text-neutral-400 mr-2" />
                  ) : (
                    <div className="w-4 h-4 mr-2" />
                  )}
                  <div
                    className={`w-2 h-2 rounded-full bg-${folder.color || "neutral"}-500 mr-2`}
                  ></div>
                  <span>{folder.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Leaf folder selected but has no courses
  if (type === "noCoursesInFolder") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        <div className="max-w-md text-center">
          <div className="h-12 w-12 mx-auto mb-2 text-neutral-400 flex items-center justify-center">
            <ChevronRight className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-bold mb-2">新增課程</h3>
          <p className="text-neutral-400 mb-4">
            這個資料夾還沒有課程。點擊以下按鈕來添加課程。
          </p>
          <div className="flex gap-2 justify-center">
            <CreateCourseDialog
              open={createCourseOpen}
              onOpenChange={setCreateCourseOpen}
              selectedFolder={selectedFolder}
              onCreateCourse={onCreateCourse}
            />

            <Button
              variant="outline"
              size="default"
              onClick={onOpenCourseSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              搜尋課程
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
