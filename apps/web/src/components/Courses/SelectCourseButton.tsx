import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { RawCourseID, Semester } from "@/types/courses";
import { useMemo } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { Button } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { lastSemester } from "@courseweb/shared";
import { courseEvents } from "@/lib/trackingEvents";

const SelectCourseButton = ({
  courseId,
  compact = false,
}: {
  courseId: RawCourseID;
  compact?: boolean;
}) => {
  const {
    isCourseSelected,
    addCourse,
    deleteCourse,
    favourites,
    setFavourites,
  } = useUserTimetable();

  const dict = useDictionary();
  const courseSemester = courseId.slice(0, 5) as Semester;

  const isFavouritable = courseSemester == lastSemester.id;

  const isInFavourites = favourites.includes(courseId);
  const handleToggleFavourite = () => {
    if (isInFavourites) {
      setFavourites(favourites.filter((fav) => fav != courseId));
    } else {
      setFavourites([...favourites, courseId]);
    }
  };

  const handleAddCourse = () => {
    addCourse(courseId);
    courseEvents.addToTimetable(courseId, courseId, "add");
  };

  const handleRemoveCourse = () => {
    deleteCourse(courseId);
    courseEvents.addToTimetable(courseId, courseId, "remove");
  };

  return (
    <div className="flex flex-row gap-1">
      {isFavouritable && (
        <Button
          variant="ghost"
          onClick={handleToggleFavourite}
          size={compact ? "default" : "sm"}
          className={compact ? "w-10 px-0 sm:w-auto sm:px-4" : undefined}
          aria-label={dict.course.details.favourites}
          title={dict.course.details.favourites}
        >
          {isInFavourites ? (
            <Heart className="text-destructive fill-destructive w-4 h-4" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
        </Button>
      )}
      {isCourseSelected(courseId) ? (
        <Button
          variant="destructive"
          onClick={handleRemoveCourse}
          size={compact ? "default" : "sm"}
          className={compact ? "w-10 px-0 sm:w-auto sm:px-4" : undefined}
          aria-label={dict.course.item.remove_from_semester}
          title={dict.course.item.remove_from_semester}
        >
          <Minus className="w-4 h-4" />
          <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
            {dict.course.item.remove_from_semester}
          </span>
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={handleAddCourse}
          size={compact ? "default" : "sm"}
          className={compact ? "w-10 px-0 sm:w-auto sm:px-4" : undefined}
          aria-label={dict.course.item.add_to_semester}
          title={dict.course.item.add_to_semester}
        >
          <Plus className="w-4 h-4" />
          <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
            {dict.course.item.add_to_semester}
          </span>
        </Button>
      )}
    </div>
  );
};

export default SelectCourseButton;
