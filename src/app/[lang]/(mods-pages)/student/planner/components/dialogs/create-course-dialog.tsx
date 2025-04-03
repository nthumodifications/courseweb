import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { CourseStatus } from "../../types";
import { v4 as uuidv4 } from "uuid";

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolder?: string | null;
  onCreateCourse: (newCourse: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
  }) => Promise<void>;
  buttonSize?: "default" | "sm";
  buttonVariant?: "default" | "outline";
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  selectedFolder,
  onCreateCourse,
  buttonSize = "default",
  buttonVariant = "default",
}: CreateCourseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    credits: 3,
    status: "planned" as CourseStatus,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.id || !formData.title) {
      // Basic validation
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreateCourse({
        uuid: uuidv4(), // Generate a new UUID for the course
        id: formData.id,
        title: formData.title,
        credits: formData.credits,
        status: formData.status,
        parent: selectedFolder != undefined ? selectedFolder : "planner-1", // Default to root folder if none selected
        order: 0, // This will be updated by the parent component
        dependson: [],
      });

      // Reset form
      setFormData({
        id: "",
        title: "",
        credits: 3,
        status: "planned",
      });

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating course:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDialog = () => {
    setFormData({
      id: "",
      title: "",
      credits: 3,
      status: "planned",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant}>
          <Plus className="h-4 w-4 mr-2" />
          建立新課程
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white">
        <DialogHeader>
          <DialogTitle>建立新課程</DialogTitle>
          <DialogDescription>手動創建一個自定義課程</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-course-id">課程代碼</Label>
            <Input
              id="new-course-id"
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="例如: CSIE1212"
              value={formData.id}
              onChange={(e) => handleChange("id", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-title">課程名稱</Label>
            <Input
              id="new-course-title"
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="例如: 程式設計"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-course-credits">學分數</Label>
              <Input
                id="new-course-credits"
                type="number"
                value={formData.credits}
                className="bg-neutral-800 border-neutral-700 text-white"
                onChange={(e) =>
                  handleChange("credits", Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-course-status">狀態</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger
                  id="new-course-status"
                  className="bg-neutral-800 border-neutral-700"
                >
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="planned">計劃中</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDialog}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "建立中..." : "建立課程"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
