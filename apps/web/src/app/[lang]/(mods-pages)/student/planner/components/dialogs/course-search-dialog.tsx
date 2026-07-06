import {
  FolderDocType,
  ItemDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { MinimalCourse } from "@/types/courses";
import CourseSearchContainer from "../../course-picker/container";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();
  const t = dict.planner.dialogs.search;
  const folderTitle =
    folderData.find((f) => f.id === selectedFolder)?.title || "";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={selectedFolder ? `${t.addToFolderPrefix}${folderTitle}` : t.title}
      description={t.description}
      contentClassName="sm:max-w-5xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col"
    >
      <CourseSearchContainer
        onAdd={onAddCourse}
        onRemove={onRemoveCourse}
        items={courseData}
      />
    </ResponsiveDialog>
  );
}
