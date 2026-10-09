import { GripVertical, Plus, Heart, Minus } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";
import { useMemo } from "react";
import { Button, EmptyState, ErrorState } from "@courseweb/ui";
import CourseListItem from "@/components/Courses/CourseListItem";
import CourseListItemSkeleton from "@/components/Courses/CourseListItemSkeleton";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useQuery } from "@tanstack/react-query";
import type { CourseDefinition } from "@/config/supabase";
import client from "@/config/api";
import { getFavouriteCourseItems } from "./favouriteCourseItems";
import type { FavouriteCourseItem } from "./favouriteCourseItems";

const FavouriteCourseActions = ({ courseId }: { courseId: string }) => {
  const {
    addCourse,
    deleteCourse,
    isCourseSelected,
    favourites,
    setFavourites,
  } = useUserTimetable();

  const unfavourite = () => {
    setFavourites(favourites.filter((fav) => fav != courseId));
  };

  return (
    <div className="flex flex-row">
      <Button
        className="rounded-r-none"
        variant="outline"
        size="icon"
        onClick={() => unfavourite()}
      >
        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
      </Button>
      {isCourseSelected(courseId) ? (
        <Button
          className="rounded-l-none"
          variant="destructive"
          size="icon"
          onClick={() => deleteCourse(courseId)}
        >
          <Minus className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          className="rounded-l-none"
          variant="outline"
          size="icon"
          onClick={() => addCourse(courseId)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

const FavouriteCourseListItem = ({
  item,
}: {
  item: FavouriteCourseItem<CourseDefinition>;
}) => {
  const course = "course" in item ? item.course : null;
  const courseId = "course" in item ? item.course.raw_id : item.raw_id;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: courseId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CourseListItem
        course={course}
        missingCourseId={!course ? courseId : undefined}
        leading={
          <GripVertical
            className="h-4 w-4 shrink-0 text-muted-foreground"
            {...attributes}
            {...listeners}
          />
        }
        actions={<FavouriteCourseActions courseId={courseId} />}
      />
    </div>
  );
};

export const FavouritesCourseList = ({}: {}) => {
  const dict = useDictionary();
  const { favourites, setFavourites } = useUserTimetable();

  const {
    data: courses = [],
    error,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["courses", [...favourites].sort((a, b) => a.localeCompare(b))],
    queryFn: async () => {
      if (favourites.length == 0) return [] as CourseDefinition[];
      const res = await client.course.$get({
        query: {
          courses: [...favourites].sort((a, b) => a.localeCompare(b)),
        },
      });
      if (!res.ok) throw new Error("Failed to load favourite courses");

      const data = await res.json();
      if (!data) throw new Error("No data");
      return data as CourseDefinition[];
    },
  });

  const displayCourseData = useMemo(() => {
    if (isLoading) return [];
    return getFavouriteCourseItems(favourites, courses);
  }, [courses, favourites, isLoading]);

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
        {isLoading && <CourseListItemSkeleton />}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={displayCourseData.map((item) =>
              "course" in item ? item.course.raw_id : item.raw_id,
            )}
            strategy={verticalListSortingStrategy}
          >
            {displayCourseData.map((item) => (
              <FavouriteCourseListItem
                key={"course" in item ? item.course.raw_id : item.raw_id}
                item={item}
              />
            ))}
          </SortableContext>
        </DndContext>
        {!isLoading && favourites.length == 0 && (
          <EmptyState title={dict.course.details.no_favourites} />
        )}
      </div>
    </div>
  );
};
export default FavouritesCourseList;
