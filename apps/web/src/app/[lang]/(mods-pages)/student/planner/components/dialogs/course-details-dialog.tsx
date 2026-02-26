import { useNavigate, useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Users, Check, Edit, Eye, FileText, Info } from "lucide-react";
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
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

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
              {selectedCourse.raw_id && (
                <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-md">
                  <p className="text-xs text-neutral-400">課程ID</p>
                  <p className="font-medium">{selectedCourse.raw_id}</p>
                </div>
              )}
            </div>

            {/* Prominent link to actual course */}
            {selectedCourse.raw_id && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() =>
                  navigate(`/${lang}/courses/${selectedCourse.raw_id}`)
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                查看完整課程資訊
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {/* Show all item data for debugging/reference */}
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2 text-neutral-400" />
                課程資料
              </h3>
              <pre className="text-xs text-neutral-300 bg-neutral-800 dark:text-neutral-600 dark:bg-neutral-50 p-2 rounded-md overflow-auto max-h-40">
                {JSON.stringify(selectedCourse, null, 2)}
              </pre>
            </div>
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
