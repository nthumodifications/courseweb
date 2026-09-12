import { Button } from "@courseweb/ui";
import { FolderDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { Badge } from "@courseweb/ui";
import {
  ChevronRight,
  FolderTree,
  CalendarDays,
  Search,
  Plus,
} from "lucide-react";
import { CreateCourseDialog } from "../dialogs/create-course-dialog";
import { getFolderColorDotClass } from "../../lib/folder-colors";
import { getStatusIcon } from "../../lib/status";
import useDictionary from "@/dictionaries/useDictionary";

interface CourseListEmptyProps {
  type: "noFolderSelected" | "hasChildFolders" | "noCoursesInFolder";
  courseData: any[];
  selectedFolder?: string | null;
  childFolders?: FolderDocType[];
  onSelectFolder?: (folderId: string) => void;
  onOpenFolderManagement?: () => void;
  onOpenSemesterManagement?: () => void;
  onOpenCourseSearch?: () => void;
  createCourseOpen: boolean;
  setCreateCourseOpen: (open: boolean) => void;
  onCreateCourse: (newCourse: any) => Promise<void>;
}

export function CourseListEmpty({
  type,
  courseData,
  selectedFolder,
  childFolders = [],
  onSelectFolder,
  onOpenFolderManagement,
  onOpenSemesterManagement,
  onOpenCourseSearch,
  createCourseOpen,
  setCreateCourseOpen,
  onCreateCourse,
}: CourseListEmptyProps) {
  const dict = useDictionary();
  const t = dict.planner.courseList.empty;

  // No folder selected - Show all courses or getting started instructions
  if (type === "noFolderSelected") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        {courseData.length > 0 ? (
          <div className="text-center">
            <h3 className="text-xl font-bold">{t.selectFolderTitle}</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              {t.selectFolderDescription}
            </p>
          </div>
        ) : (
          <div className="max-w-lg text-center">
            <h3 className="text-xl font-bold mb-6">{t.getStartedTitle}</h3>
            <div className="space-y-6 text-left">
              <div className="bg-muted  p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t.step1Title}</h4>
                  <p className="text-muted-foreground mb-2 text-sm">
                    {t.step1Description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenFolderManagement}
                  >
                    <FolderTree className="h-4 w-4 mr-2" />
                    {t.manageFolders}
                  </Button>
                </div>
              </div>

              <div className="bg-muted  p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t.step2Title}</h4>
                  <p className="text-muted-foreground mb-2 text-sm">
                    {t.step2Description}
                  </p>
                  <p className="text-muted-foreground mb-2 text-xs">{t.step2Hint}</p>
                  <div className="flex space-x-2 mb-1">
                    <Badge className="bg-success/10  text-success  border-success flex items-center gap-1">
                      {getStatusIcon("completed", "h-3 w-3")}
                      {dict.planner.status.completed}
                    </Badge>
                    <Badge className="bg-info/10  text-info  border-info flex items-center gap-1">
                      {getStatusIcon("in-progress", "h-3 w-3")}
                      {dict.planner.status.inProgress}
                    </Badge>
                    <Badge className="bg-muted  text-foreground  border-border  flex items-center gap-1">
                      {getStatusIcon("planned", "h-3 w-3")}
                      {dict.planner.status.planned}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-muted  p-4 rounded-lg flex items-start">
                <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t.step3Title}</h4>
                  <p className="text-muted-foreground mb-2 text-sm">
                    {t.step3Description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenSemesterManagement}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {t.manageSemesters}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Folder selected but not a leaf node and has no courses
  if (type === "hasChildFolders") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        <div className="max-w-md text-center">
          <FolderTree className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">{t.selectSubfolderTitle}</h3>
          <p className="text-muted-foreground mb-4">
            {t.selectSubfolderDescription}
          </p>
          <div className="bg-muted  p-3 rounded-lg text-left mb-4">
            <p className="text-sm">{t.availableSubfolders}</p>
            <div className="mt-2 space-y-1">
              {childFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => onSelectFolder?.(folder.id)}
                >
                  {childFolders.some((f) => f.parent === folder.id) ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mr-2" />
                  ) : (
                    <div className="w-4 h-4 mr-2" />
                  )}
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${getFolderColorDotClass(folder.color)}`}
                  ></div>
                  <span>{folder.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Leaf folder selected but has no courses
  if (type === "noCoursesInFolder") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
        <div className="max-w-md text-center">
          <div className="h-12 w-12 mx-auto mb-2 text-muted-foreground flex items-center justify-center">
            <ChevronRight className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t.noCoursesTitle}</h3>
          <p className="text-muted-foreground mb-4">{t.noCoursesDescription}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button size="default" onClick={() => setCreateCourseOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {dict.planner.courseList.addCourse}
            </Button>

            <CreateCourseDialog
              open={createCourseOpen}
              onOpenChange={setCreateCourseOpen}
              selectedFolder={selectedFolder}
              onCreateCourse={onCreateCourse}
            />

            <Button
              variant="outline"
              size="default"
              onClick={onOpenCourseSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              {dict.planner.courseList.searchCourses}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
