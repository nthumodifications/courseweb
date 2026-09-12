import { Button } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Edit, Eye } from "lucide-react";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import {
  getStatusBadgeClass,
  getStatusIcon,
  getStatusLabel,
} from "@/app/[lang]/(mods-pages)/student/planner/lib/status";
import useDictionary from "@/dictionaries/useDictionary";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";

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
  const { openCourse } = useCourseLink();
  const dict = useDictionary();
  const t = dict.planner.dialogs.details;
  // The RxDB item schema stores `status` as a loose `string | null` (no enum
  // in the JSON schema), while the shared status helpers expect the
  // `CourseStatus` union used everywhere else in the planner.
  const status = selectedCourse.status as CourseStatus | null | undefined;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={selectedCourse.title}
      description={`${selectedCourse.id} • ${selectedCourse.credits} ${dict.course.credits}`}
      contentClassName="sm:max-w-3xl max-h-[85vh] overflow-y-auto"
      footer={
        <>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            {t.editCourse}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {dict.planner.common.close}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-muted  p-2 rounded-md">
              <p className="text-xs text-muted-foreground">{t.category}</p>
              <p className="font-medium">
                {folderData.find((f) => f.id === selectedCourse.parent)
                  ?.title || selectedCourse.parent}
              </p>
            </div>
            <div className="bg-muted  p-2 rounded-md">
              <p className="text-xs text-muted-foreground">{t.semester}</p>
              <p className="font-medium">
                {selectedCourse.semester
                  ? semesterData.find((s) => s.id === selectedCourse.semester)
                      ?.name || selectedCourse.semester
                  : t.unassigned}
              </p>
            </div>
            <div className="bg-muted  p-2 rounded-md">
              <p className="text-xs text-muted-foreground">{t.status}</p>
              <Badge
                className={`${getStatusBadgeClass(status)} mt-1 flex items-center gap-1 w-fit`}
              >
                {getStatusIcon(status)}
                {getStatusLabel(status, dict.planner.status)}
              </Badge>
            </div>
            {selectedCourse.raw_id && (
              <div className="bg-muted  p-2 rounded-md">
                <p className="text-xs text-muted-foreground">{t.courseId}</p>
                <p className="font-medium">{selectedCourse.raw_id}</p>
              </div>
            )}
          </div>

          {/* Prominent link to actual course */}
          {selectedCourse.raw_id && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => openCourse(selectedCourse.raw_id!)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t.viewFullCourse}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">{t.additionalInfo}</h3>
            <div className="space-y-2">
              <div className="bg-muted  p-2 rounded-md">
                <p className="text-xs text-muted-foreground">{t.instructor}</p>
                <p className="font-medium">
                  {selectedCourse.instructor || t.unassigned}
                </p>
              </div>
              <div className="bg-muted  p-2 rounded-md">
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedCourse.description || t.noDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
