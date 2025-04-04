import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";
import { CourseListItem } from "./course-list-item";
import { CourseGridItem } from "./course-grid-item";

interface CourseListProps {
  viewMode: "list" | "grid";
  courses: ItemDocType[];
  selectedCourse: ItemDocType | null;
  selectedCourses: Record<string, boolean>;
  folders: FolderDocType[];
  semesters: SemesterDocType[];
  onCourseClick: (course: ItemDocType) => void;
  onCourseSelect: (uuid: string, isShiftKey: boolean) => void;
  onViewDetails: (course: ItemDocType) => void;
  onEdit: (course: ItemDocType) => void;
  onStatusChange: (uuid: string, status: CourseStatus) => void;
  onSemesterChange: (uuid: string, semester: string) => void;
  onDeleteCourse: (course: ItemDocType) => void;
}

export function CourseList({
  viewMode,
  courses,
  selectedCourse,
  selectedCourses,
  folders,
  semesters,
  onCourseClick,
  onCourseSelect,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  onDeleteCourse,
}: CourseListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-13rem)]">
      {viewMode === "list" ? (
        <div className="space-y-2 p-2">
          {courses.map((course, index) => (
            <CourseListItem
              key={index}
              course={course}
              isSelected={selectedCourse?.uuid === course.uuid}
              isMultiSelected={!!selectedCourses[course.uuid]}
              onClick={() => onCourseClick(course)}
              onSelect={(e) => onCourseSelect(course.uuid, e.shiftKey)}
              onViewDetails={() => onViewDetails(course)}
              onEdit={() => onEdit(course)}
              onStatusChange={(status) => onStatusChange(course.uuid, status)}
              onSemesterChange={(semester) =>
                onSemesterChange(course.uuid, semester)
              }
              semesters={semesters}
              folders={folders}
              onDeleteCourse={() => onDeleteCourse(course)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2">
          {courses.map((course, index) => (
            <CourseGridItem
              key={index}
              course={course}
              folders={folders}
              isSelected={selectedCourse?.uuid === course.uuid}
              isMultiSelected={!!selectedCourses[course.uuid]}
              onClick={() => onCourseClick(course)}
              onSelect={(e) => onCourseSelect(course.uuid, e.shiftKey)}
              onViewDetails={() => onViewDetails(course)}
              onEdit={() => onEdit(course)}
              onStatusChange={(status) => onStatusChange(course.uuid, status)}
              onSemesterChange={(semester) =>
                onSemesterChange(course.uuid, semester)
              }
              semesters={semesters}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
