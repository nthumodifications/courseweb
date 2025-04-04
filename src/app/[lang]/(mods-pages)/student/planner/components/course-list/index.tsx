import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderDocType,
  ItemDocType,
  SemesterDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";
import { CourseListItem } from "./course-list-item";
import { CourseGridItem } from "./course-grid-item";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";

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
  onCoursesReordered?: (courses: { uuid: string; order: number }[]) => void;
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
  onCoursesReordered,
}: CourseListProps) {
  // Sort courses by order property
  const [sortedCourses, setSortedCourses] = useState<ItemDocType[]>([]);

  useEffect(() => {
    // Sort courses by order when the courses array changes
    const sorted = [...courses].sort((a, b) => a.order - b.order);
    setSortedCourses(sorted);
  }, [courses]);

  // Create an array of IDs for SortableContext
  const itemIds = sortedCourses.map((course) => `course-${course.uuid}`);

  return (
    <ScrollArea className="h-[calc(100vh-13rem)]">
      <SortableContext
        items={itemIds}
        strategy={
          viewMode === "list"
            ? verticalListSortingStrategy
            : horizontalListSortingStrategy
        }
      >
        {viewMode === "list" ? (
          <div className="space-y-2 p-2">
            {sortedCourses.map((course, index) => (
              <CourseListItem
                key={course.uuid}
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
            {sortedCourses.map((course, index) => (
              <CourseGridItem
                key={course.uuid}
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
      </SortableContext>
    </ScrollArea>
  );
}
