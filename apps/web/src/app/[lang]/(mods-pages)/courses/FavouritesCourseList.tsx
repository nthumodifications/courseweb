import { GripVertical, Plus, Heart, Minus } from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useSearchParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { useMemo } from "react";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse } from "@/types/courses";
import { Button, EmptyState, ErrorState } from "@courseweb/ui";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useQuery } from "@tanstack/react-query";
import supabase from "@/config/supabase";
import { CourseDefinition } from "@/config/supabase";
import client from "@/config/api";

const TimetableCourseListItem = ({ course }: { course: MinimalCourse }) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const [searchParams] = useSearchParams();
  const { openCourse } = useCourseLink();

  const {
    addCourse,
    deleteCourse,
    isCourseSelected,
    favourites,
    setFavourites,
  } = useUserTimetable();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: course.raw_id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const unfavourite = () => {
    setFavourites(favourites.filter((fav) => fav != course.raw_id));
  };

  return (
    <div
      className="flex min-w-0 flex-row items-center gap-2 py-4"
      ref={setNodeRef}
      style={style}
    >
      <GripVertical
        className="h-4 w-4 shrink-0 text-muted-foreground"
        {...attributes}
        {...listeners}
      />
      <div
        className="flex min-w-0 flex-1 cursor-pointer"
        onClick={() => openCourse(course.raw_id)}
      >
        <span className="text-sm">
          {course.department} {course.course}-{course.class} {course.name_zh} -{" "}
          {course.teacher_zh.join(",")}
        </span>
        <span className="text-xs">{course.name_en}</span>
        <div className="mt-1">
          {course.venues?.map((venue, index) => {
            const time = course.times![index];
            return (
              <div
                key={index}
                className="flex flex-row items-center gap-2 text-muted-foreground"
              >
                <span className="text-xs">{venue}</span>
                {hasTimes(course as MinimalCourse) ? (
                  <span className="text-xs">{time}</span>
                ) : (
                  <span className="text-xs text-destructive">
                    {dict.course.details.missing_time}
                  </span>
                )}
              </div>
            );
          }) || (
            <span className="text-muted-foreground text-xs">
              {dict.course.details.no_venues}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 items-start">
        <div className="flex flex-row items-center space-x-1">
          <span className="text-base">{course.credits}</span>
          <span className="text-xs text-muted-foreground">{dict.course.credits}</span>
        </div>
        <div className="flex flex-row">
          <Button
            className="rounded-r-none"
            variant="outline"
            size="icon"
            onClick={() => unfavourite()}
          >
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
          </Button>
          {isCourseSelected(course.raw_id) ? (
            <Button
              className="rounded-l-none"
              variant="destructive"
              size="icon"
              onClick={() => deleteCourse(course.raw_id)}
            >
              <Minus className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="rounded-l-none"
              variant="outline"
              size="icon"
              onClick={() => addCourse(course.raw_id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const FavouritesCourseList = ({}: {}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const { favourites, setFavourites } = useUserTimetable();

  const { data: courses = [], error, refetch } = useQuery({
    queryKey: ["courses", [...favourites].sort()],
    queryFn: async () => {
      if (favourites.length == 0) return [] as CourseDefinition[];
      const res = await client.course.$get({
        query: { courses: [...favourites].sort() },
      });
      if (!res.ok) throw new Error("Failed to load favourite courses");

      const data = await res.json();
      if (!data) throw new Error("No data");
      return data as CourseDefinition[];
    },
  });

  const displayCourseData = useMemo(() => {
    // Create a copy of the array and ensure it's an array before sorting
    return Array.isArray(courses)
      ? [...courses].sort(
          (a, b) => favourites.indexOf(a.raw_id) - favourites.indexOf(b.raw_id),
        )
      : [];
  }, [courses, favourites]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setFavourites((favourites) => {
        const oldIndex = favourites.indexOf(active.id as string);
        const newIndex = favourites.indexOf(over.id as string);

        return arrayMove(favourites, oldIndex, newIndex);
      });
      // const courseCopy = [...favourites];
      // const oldIndex = courseCopy.indexOf(active.id as string);
      // const newIndex = courseCopy.indexOf(over.id as string);
      // const newCourseCopy = arrayMove(courseCopy, oldIndex, newIndex);
      // setFavourites(newCourseCopy);
    }
  }

  if (error) {
    return (
      <ErrorState
        title={dict.common.load_error}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {dict.common.try_again}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border px-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={displayCourseData.map((course) => course.raw_id)}
            strategy={verticalListSortingStrategy}
          >
            {displayCourseData.map((course, index) => (
              <TimetableCourseListItem
                key={index}
                course={course as MinimalCourse}
              />
            ))}
          </SortableContext>
        </DndContext>
        {displayCourseData.length == 0 && (
          <EmptyState title={dict.course.details.no_favourites} />
        )}
      </div>
    </div>
  );
};
export default FavouritesCourseList;
