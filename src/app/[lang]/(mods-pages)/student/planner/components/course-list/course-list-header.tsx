import { Button } from "@/components/ui/button";
import { FolderDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { Filter, Plus, Search } from "lucide-react";
import { CreateCourseDialog } from "../dialogs/create-course-dialog";
import { CourseStatus } from "../../types";

interface CourseListHeaderProps {
  selectedFolder: string | null | undefined;
  folderData: FolderDocType[];
  courseCount: number;
  hasChildren: boolean;
  onOpenCourseSearch: () => void;
  createCourseOpen: boolean;
  setCreateCourseOpen: (open: boolean) => void;
  onCreateCourse: (newCourse: any) => Promise<void>;
}

export function CourseListHeader({
  selectedFolder,
  folderData,
  courseCount,
  hasChildren,
  onOpenCourseSearch,
  createCourseOpen,
  setCreateCourseOpen,
  onCreateCourse,
}: CourseListHeaderProps) {
  const folderTitle =
    folderData.find((f) => f.id === selectedFolder)?.title || "";

  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <div>
        <h2 className="text-lg font-bold">{folderTitle}</h2>
        <p className="text-sm text-neutral-400">
          {selectedFolder != undefined ? `${courseCount} 門課程` : "全部課程"}
        </p>
      </div>
      {selectedFolder != undefined && !hasChildren && (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            篩選
          </Button>

          <CreateCourseDialog
            open={createCourseOpen}
            onOpenChange={setCreateCourseOpen}
            selectedFolder={selectedFolder}
            onCreateCourse={onCreateCourse}
            buttonSize="sm"
            buttonVariant="default"
          />

          <Button variant="outline" size="sm" onClick={onOpenCourseSearch}>
            <Search className="h-4 w-4 mr-2" />
            搜尋課程
          </Button>
        </div>
      )}
    </div>
  );
}
