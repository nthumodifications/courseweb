import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
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
import {
  FolderDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolder?: string | null;
  selectedSemester?: string | null;
  folders?: FolderDocType[];
  semesters?: SemesterDocType[];
  onCreateCourse: (newCourse: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
    semester?: string;
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
};

export function CreateCourseDialog({
  open,
  onOpenChange,
  selectedFolder,
  selectedSemester,
  folders = [],
  semesters = [],
  onCreateCourse,
}: CreateCourseDialogProps) {
  const dict = useDictionary();
  const t = dict.planner.dialogs.create;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [folderId, setFolderId] = useState(selectedFolder ?? "planner-1");
  const [semesterId, setSemesterId] = useState(selectedSemester ?? "");

  useEffect(() => {
    if (open) {
      setFolderId(selectedFolder ?? "planner-1");
      setSemesterId(selectedSemester ?? "");
    }
  }, [open, selectedFolder, selectedSemester]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!formData.id?.trim()) {
      nextErrors.id = t.idRequired;
    }
    if (!formData.title?.trim()) {
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
        status: "planned" as CourseStatus,
        parent: folderId,
        order: 0, // This will be updated by the parent component
        dependson: [],
        semester: semesterId || undefined,
      });

      // Reset form
      setFormData(initialFormData);
      setErrors({});
      setFolderId(selectedFolder ?? "planner-1");
      setSemesterId(selectedSemester ?? "");

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
    setFolderId(selectedFolder ?? "planner-1");
    setSemesterId(selectedSemester ?? "");
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
          {errors.id && <p className="text-xs text-red-500">{errors.id}</p>}
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
            <p className="text-xs text-red-500">{errors.title}</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <p className="text-xs text-red-500">{errors.credits}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-category">
              {dict.planner.dialogs.edit.category}
            </Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="new-course-category" className="border-border">
                <SelectValue
                  placeholder={dict.planner.dialogs.edit.categoryPlaceholder}
                />
              </SelectTrigger>
              <SelectContent className="border-border">
                <SelectItem value="planner-1">
                  {dict.planner.remake.noneCategory}
                </SelectItem>
                {folders
                  .filter((folder) => folder.id !== "planner-1")
                  .map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-course-semester">
              {dict.planner.dialogs.edit.semester}
            </Label>
            <Select
              value={semesterId || "__none__"}
              onValueChange={(value) =>
                setSemesterId(value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger id="new-course-semester" className="border-border">
                <SelectValue
                  placeholder={dict.planner.dialogs.edit.semesterPlaceholder}
                />
              </SelectTrigger>
              <SelectContent className="border-border">
                <SelectItem value="__none__">
                  {dict.planner.remake.noneTerm}
                </SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
