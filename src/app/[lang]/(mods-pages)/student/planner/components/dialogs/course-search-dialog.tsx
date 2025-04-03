import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderDocType, ItemDocType } from "@/config/rxdb";
import { MinimalCourse } from "@/types/courses";
import CourseSearchContainer from "../../course-picker/container";

interface CourseSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolder?: string | null;
  folderData: FolderDocType[];
  onAddCourse: (course: MinimalCourse, keepSemester?: boolean) => Promise<void>;
  onRemoveCourse: (course: MinimalCourse) => Promise<void>;
  courseData: ItemDocType[];
}

export function CourseSearchDialog({
  open,
  onOpenChange,
  selectedFolder,
  folderData,
  onAddCourse,
  onRemoveCourse,
  courseData,
}: CourseSearchDialogProps) {
  const folderTitle =
    folderData.find((f) => f.id === selectedFolder)?.title || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white min-w-full h-full">
        <DialogHeader>
          <DialogTitle>
            {selectedFolder ? `加入${folderTitle}` : "搜尋課程"}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            將課程新增到當前資料夾
          </DialogDescription>
        </DialogHeader>
        <CourseSearchContainer
          onAdd={onAddCourse}
          onRemove={onRemoveCourse}
          items={courseData}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button>新增所選課程</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
