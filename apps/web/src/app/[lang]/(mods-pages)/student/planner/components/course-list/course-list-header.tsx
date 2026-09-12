import { Button } from "@courseweb/ui";
import { FolderDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { Plus, Search } from "lucide-react";
import { CreateCourseDialog } from "../dialogs/create-course-dialog";
import { CourseStatus } from "../../types";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();
  const folderTitle =
    folderData.find((f) => f.id === selectedFolder)?.title || "";

  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <div>
        <h2 className="text-lg font-bold">{folderTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {selectedFolder != undefined
            ? dict.planner.courseList.courseCount.replace(
                "{count}",
                String(courseCount),
              )
            : dict.planner.courseList.allCourses}
        </p>
      </div>
      {selectedFolder != undefined && !hasChildren && (
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => setCreateCourseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {dict.planner.courseList.addCourse}
          </Button>

          <CreateCourseDialog
            open={createCourseOpen}
            onOpenChange={setCreateCourseOpen}
            selectedFolder={selectedFolder}
            onCreateCourse={onCreateCourse}
          />

          <Button variant="outline" size="sm" onClick={onOpenCourseSearch}>
            <Search className="h-4 w-4 mr-2" />
            {dict.planner.courseList.searchCourses}
          </Button>
        </div>
      )}
    </div>
  );
}
