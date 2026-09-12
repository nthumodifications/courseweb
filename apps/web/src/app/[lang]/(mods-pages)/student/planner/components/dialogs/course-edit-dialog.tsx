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
import { useEffect, useState } from "react";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

interface CourseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCourse: ItemDocType;
  semesterData: SemesterDocType[];
  leafFolders: FolderDocType[];
  onSave: (updatedCourse: ItemDocType) => void;
}

interface FormErrors {
  title?: string;
  credits?: string;
}

export function CourseEditDialog({
  open,
  onOpenChange,
  selectedCourse,
  semesterData,
  leafFolders,
  onSave,
}: CourseEditDialogProps) {
  const dict = useDictionary();
  const t = dict.planner.dialogs.edit;
  const [editCourseForm, setEditCourseForm] =
    useState<ItemDocType>(selectedCourse);
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form whenever the dialog is (re)opened for a course, so
  // cancel-then-reopen never shows stale, previously-edited values.
  useEffect(() => {
    if (open) {
      setEditCourseForm({ ...selectedCourse });
      setErrors({});
    }
  }, [selectedCourse, open]);

  const validate = (form: ItemDocType): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!form.title || !form.title.trim()) {
      nextErrors.title = t.titleRequired;
    }
    if (
      form.credits === null ||
      form.credits === undefined ||
      Number.isNaN(form.credits) ||
      form.credits < 0
    ) {
      nextErrors.credits = t.creditsInvalid;
    }
    return nextErrors;
  };

  const handleSave = () => {
    const nextErrors = validate(editCourseForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave(editCourseForm);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {dict.planner.common.cancel}
          </Button>
          <Button onClick={handleSave}>{dict.planner.common.save}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course-id">{t.courseId}</Label>
            <Input
              id="course-id"
              value={editCourseForm.id}
              readOnly
              disabled
              className="bg-muted  border-border cursor-not-allowed text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">{t.courseIdReadonlyHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-title">{t.courseTitle}</Label>
            <Input
              id="course-title"
              value={editCourseForm.title}
              className="bg-muted  border-border"
              onChange={(e) =>
                setEditCourseForm({
                  ...editCourseForm,
                  title: e.target.value,
                })
              }
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-credits">{t.credits}</Label>
            <Input
              id="course-credits"
              type="number"
              min={0}
              value={editCourseForm.credits}
              className="bg-muted  border-border"
              onChange={(e) =>
                setEditCourseForm({
                  ...editCourseForm,
                  credits: parseInt(e.target.value, 10),
                })
              }
            />
            {errors.credits && (
              <p className="text-xs text-destructive">{errors.credits}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-category">{t.category}</Label>
            <Select
              value={editCourseForm.parent || ""}
              onValueChange={(value) =>
                setEditCourseForm({ ...editCourseForm, parent: value })
              }
            >
              <SelectTrigger
                id="course-category"
                className="bg-muted  border-border"
              >
                <SelectValue placeholder={t.categoryPlaceholder} />
              </SelectTrigger>
              <SelectContent className="bg-muted  border-border max-h-[300px]">
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
          <Label htmlFor="course-status">{t.status}</Label>
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
              className="bg-muted  border-border"
            >
              <SelectValue placeholder={t.statusPlaceholder} />
            </SelectTrigger>
            <SelectContent className="bg-muted  border-border">
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

        <div className="space-y-2">
          <Label htmlFor="course-semester">{t.semester}</Label>
          <Select
            value={editCourseForm.semester ?? ""}
            onValueChange={(value) =>
              setEditCourseForm({ ...editCourseForm, semester: value })
            }
          >
            <SelectTrigger
              id="course-semester"
              className="bg-muted  border-border"
            >
              <SelectValue placeholder={t.semesterPlaceholder} />
            </SelectTrigger>
            <SelectContent className="bg-muted  border-border">
              {semesterData.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-instructor">{t.instructor}</Label>
          <Input
            id="course-instructor"
            value={editCourseForm.instructor || ""}
            className="bg-muted  border-border"
            onChange={(e) =>
              setEditCourseForm({
                ...editCourseForm,
                instructor: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-description">{t.courseDescription}</Label>
          <Textarea
            id="course-description"
            value={editCourseForm.description || ""}
            className="bg-muted  border-border min-h-[100px]"
            onChange={(e) =>
              setEditCourseForm({
                ...editCourseForm,
                description: e.target.value,
              })
            }
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
