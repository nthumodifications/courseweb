import React, { PropsWithChildren } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CourseListItem } from "./course-list/course-list-item";
import { ItemDocType, FolderDocType, SemesterDocType } from "../rxdb";
import { CourseStatus } from "../types";

interface DragDropContextProviderProps extends PropsWithChildren {
  onDragEnd: (
    course: ItemDocType,
    destination: string | null,
    destinationType: "folder" | "semester",
  ) => void;
  onCoursesReordered?: (courses: { uuid: string; order: number }[]) => void;
  semesters: SemesterDocType[];
  folders: FolderDocType[];
  courses: ItemDocType[];
}

export function DragDropContextProvider({
  children,
  onDragEnd,
  onCoursesReordered,
  semesters,
  folders,
  courses,
}: DragDropContextProviderProps) {
  const [activeDragItem, setActiveDragItem] =
    React.useState<ItemDocType | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 5 pixels before activating
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveDragItem(active.data.current as ItemDocType);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active.data.current) {
      setActiveDragItem(null);
      return;
    }

    const course = active.data.current as ItemDocType;

    // Handle sortable reordering
    if (
      over &&
      active.id !== over.id &&
      active.id.toString().startsWith("course-") &&
      over.id.toString().startsWith("course-")
    ) {
      const activeId = active.id.toString().replace("course-", "");
      const overId = over.id.toString().replace("course-", "");

      const oldIndex = courses.findIndex((c) => c.uuid === activeId);
      const newIndex = courses.findIndex((c) => c.uuid === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedCourses = arrayMove(courses, oldIndex, newIndex);

        // Create a new array of courses with updated order values
        const updatedCourses = reorderedCourses.map((course, index) => ({
          uuid: course.uuid,
          order: index,
        }));

        // Call the handler to persist the changes
        if (onCoursesReordered) {
          onCoursesReordered(updatedCourses);
        }
      }

      setActiveDragItem(null);
      return;
    }

    // Handle dropping on folders/semesters
    if (!over) {
      // Not dropped on a valid target
      onDragEnd(course, null, "semester");
      setActiveDragItem(null);
      return;
    }

    if (over.data.current) {
      const targetData = over.data.current as any;

      // More explicit handling of target types
      if (targetData.type === "semester" && targetData.semesterId) {
        onDragEnd(course, targetData.semesterId, "semester");
      } else if (
        targetData.type === "folder" &&
        targetData.folderId &&
        targetData.isLeaf
      ) {
        onDragEnd(course, targetData.folderId, "folder");
      }
    }

    setActiveDragItem(null);
  };

  // Dummy values for the overlay - these won't be used for actual functionality
  const dummyHandlers = {
    onViewDetails: () => {},
    onEdit: () => {},
    onStatusChange: (status: CourseStatus) => {},
    onSemesterChange: (semester: string) => {},
    onSelect: (e: React.MouseEvent) => {},
    onClick: () => {},
    onDeleteCourse: () => {},
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}

      <DragOverlay>
        {activeDragItem ? (
          <div style={{ opacity: 0.8 }}>
            <CourseListItem
              course={activeDragItem}
              isSelected={false}
              isMultiSelected={false}
              folders={folders}
              semesters={semesters}
              {...dummyHandlers}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
