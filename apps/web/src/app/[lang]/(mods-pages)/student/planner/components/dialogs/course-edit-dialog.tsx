import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { useState, useEffect } from "react";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";

interface CourseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCourse: ItemDocType;
  semesterData: SemesterDocType[];
  leafFolders: FolderDocType[];
  onSave: (updatedCourse: ItemDocType) => void;
}

export function CourseEditDialog({
  open,
  onOpenChange,
  selectedCourse,
  semesterData,
  leafFolders,
  onSave,
}: CourseEditDialogProps) {
  const [editCourseForm, setEditCourseForm] =
    useState<ItemDocType>(selectedCourse);

  // Reset form when selected course changes
  useEffect(() => {
    setEditCourseForm({ ...selectedCourse });
  }, [selectedCourse]);

  const handleSave = () => {
    onSave(editCourseForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border">
        <DialogHeader>
          <DialogTitle>編輯課程</DialogTitle>
          <DialogDescription className="text-neutral-400">
            修改課程資訊
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-id">課程代碼</Label>
              <Input
                id="course-id"
                value={editCourseForm.id}
                className="bg-neutral-50 dark:bg-neutral-800 border-border"
                onChange={(e) =>
                  setEditCourseForm({
                    ...editCourseForm,
                    id: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-title">課程名稱</Label>
              <Input
                id="course-title"
                value={editCourseForm.title}
                className="bg-neutral-50 dark:bg-neutral-800 border-border"
                onChange={(e) =>
                  setEditCourseForm({
                    ...editCourseForm,
                    title: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-credits">學分數</Label>
              <Input
                id="course-credits"
                type="number"
                value={editCourseForm.credits}
                className="bg-neutral-50 dark:bg-neutral-800 border-border"
                onChange={(e) =>
                  setEditCourseForm({
                    ...editCourseForm,
                    credits: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-category">課程類別</Label>
              <Select
                value={editCourseForm.parent || ""}
                onValueChange={(value) =>
                  setEditCourseForm({ ...editCourseForm, parent: value })
                }
              >
                <SelectTrigger
                  id="course-category"
                  className="bg-neutral-50 dark:bg-neutral-800 border-border"
                >
                  <SelectValue placeholder="選擇類別" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-50 dark:bg-neutral-800border-border max-h-[300px]">
                  {leafFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-status">課程狀態</Label>
            <Select
              value={editCourseForm.status ?? ""}
              onValueChange={(value) =>
                setEditCourseForm({
                  ...editCourseForm,
                  status: value as CourseStatus,
                })
              }
            >
              <SelectTrigger
                id="course-status"
                className="bg-neutral-50 dark:bg-neutral-800 border-border"
              >
                <SelectValue placeholder="選擇狀態" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-50 dark:bg-neutral-800 border-border">
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="in-progress">進行中</SelectItem>
                <SelectItem value="planned">計劃中</SelectItem>
                <SelectItem value="failed">未通過</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-semester">學期</Label>
            <Select
              value={editCourseForm.semester ?? ""}
              onValueChange={(value) =>
                setEditCourseForm({ ...editCourseForm, semester: value })
              }
            >
              <SelectTrigger
                id="course-semester"
                className="bg-neutral-50 dark:bg-neutral-800 border-border"
              >
                <SelectValue placeholder="選擇學期" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-50 dark:bg-neutral-800 border-border">
                {semesterData.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-instructor">授課教師</Label>
            <Input
              id="course-instructor"
              value={editCourseForm.instructor || ""}
              className="bg-neutral-50 dark:bg-neutral-800 border-border"
              onChange={(e) =>
                setEditCourseForm({
                  ...editCourseForm,
                  instructor: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description">課程簡介</Label>
            <Textarea
              id="course-description"
              value={editCourseForm.description || ""}
              className="bg-neutral-50 dark:bg-neutral-800 border-border min-h-[100px]"
              onChange={(e) =>
                setEditCourseForm({
                  ...editCourseForm,
                  description: e.target.value,
                })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>儲存變更</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
