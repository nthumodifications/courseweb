import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Check, Edit, Eye, FileText } from "lucide-react";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";

interface CourseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCourse: ItemDocType;
  folderData: FolderDocType[];
  semesterData: SemesterDocType[];
  onEdit: () => void;
}

export function CourseDetailsDialog({
  open,
  onOpenChange,
  selectedCourse,
  folderData,
  semesterData,
  onEdit,
}: CourseDetailsDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{selectedCourse.title}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {selectedCourse.id} • {selectedCourse.credits}學分
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-2 text-neutral-400" />
                授課教師
              </h3>
              <p className="text-neutral-300 bg-neutral-800 dark:text-neutral-600 dark:bg-neutral-50 p-2 rounded-md">
                {selectedCourse.instructor}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">課程簡介</h3>
              <p className="text-neutral-300 bg-neutral-800 dark:text-neutral-600 dark:bg-neutral-50 p-2 rounded-md">
                {selectedCourse.description}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md">
                <p className="text-xs text-neutral-400">類別</p>
                <p className="font-medium">
                  {folderData.find((f) => f.id === selectedCourse.parent)
                    ?.title || selectedCourse.parent}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md">
                <p className="text-xs text-neutral-400">學期</p>
                <p className="font-medium">
                  {selectedCourse.semester
                    ? semesterData.find((s) => s.id === selectedCourse.semester)
                        ?.name || selectedCourse.semester
                    : "未分配"}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md">
                <p className="text-xs text-neutral-400">狀態</p>
                <p className="font-medium">
                  {selectedCourse.status === "completed"
                    ? "已完成"
                    : selectedCourse.status === "in-progress"
                      ? "進行中"
                      : "計劃中"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">先修課程</h3>
              {selectedCourse.dependson &&
              selectedCourse.dependson.length > 0 ? (
                <div className="space-y-1">
                  {selectedCourse.dependson.map((prereq, index) => (
                    <div
                      key={index}
                      className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md flex items-center"
                    >
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span>{prereq}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-300 bg-neutral-800 dark:text-neutral-600 dark:bg-neutral-50 p-2 rounded-md">
                  無先修課程要求
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">畢業要求滿足情況</h3>
              <div className="space-y-1">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>
                    滿足「
                    {folderData.find((f) => f.id === selectedCourse.parent)
                      ?.title || "未知"}
                    」要求
                  </span>
                </div>
              </div>
            </div>

            {/* Add link to actual course if raw_id exists */}
            {selectedCourse.raw_id && (
              <div>
                <h3 className="font-medium mb-2">課程詳情</h3>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/zh/courses/${selectedCourse.raw_id}`)
                  }
                >
                  <Eye className="h-4 w-4 mr-2" />
                  查看課程詳情頁面
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            編輯課程
          </Button>
          <Button onClick={() => onOpenChange(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
