import { useState } from "react";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { CourseStatus } from "../../types";
import { v4 as uuidv4 } from "uuid";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

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
}

interface FormErrors {
  id?: string;
  title?: string;
  credits?: string;
}

const initialFormData = {
  id: "",
  title: "",
  credits: 3,
  status: "planned" as CourseStatus,
};

export function CreateCourseDialog({
  open,
  onOpenChange,
  selectedFolder,
  onCreateCourse,
}: CreateCourseDialogProps) {
  const dict = useDictionary();
  const t = dict.planner.dialogs.create;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!formData.id || !formData.id.trim()) {
      nextErrors.id = t.idRequired;
    }
    if (!formData.title || !formData.title.trim()) {
      nextErrors.title = t.titleRequired;
    }
    if (Number.isNaN(formData.credits) || formData.credits < 0) {
      nextErrors.credits = t.creditsInvalid;
    }
    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
      setFormData(initialFormData);
      setErrors({});

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating course:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDialog = () => {
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFormData(initialFormData);
          setErrors({});
        }
        onOpenChange(nextOpen);
      }}
      title={t.title}
      description={t.description}
      footer={
        <>
          <Button variant="outline" onClick={cancelDialog}>
            {dict.planner.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="new-course-id">{t.courseId}</Label>
          <Input
            id="new-course-id"
            className="border-border"
            placeholder={t.courseIdPlaceholder}
            value={formData.id}
            onChange={(e) => handleChange("id", e.target.value)}
          />
          {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-course-title">{t.courseTitle}</Label>
          <Input
            id="new-course-title"
            className="border-border"
            placeholder={t.courseTitlePlaceholder}
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-course-credits">{t.credits}</Label>
            <Input
              id="new-course-credits"
              type="number"
              min={0}
              value={formData.credits}
              className="border-border"
              onChange={(e) => {
                const value = Number(e.target.value);
                handleChange(
                  "credits",
                  Number.isNaN(value) ? 0 : Math.max(0, value),
                );
              }}
            />
            {errors.credits && (
              <p className="text-xs text-destructive">{errors.credits}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-status">{t.status}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger id="new-course-status" className="border-border">
                <SelectValue placeholder={t.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent className="border-border">
                <SelectItem value="completed">
                  {dict.planner.status.completed}
                </SelectItem>
                <SelectItem value="in-progress">
                  {dict.planner.status.inProgress}
                </SelectItem>
                <SelectItem value="planned">
                  {dict.planner.status.planned}
                </SelectItem>
                <SelectItem value="failed">
                  {dict.planner.status.failed}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
