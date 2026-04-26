import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { RawCourseID, Semester } from "@/types/courses";
import { useMemo } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { Button } from "@courseweb/ui";
import { useLocalStorage } from "usehooks-ts";
import { toast } from "@courseweb/ui";
import { lastSemester } from "@courseweb/shared";
import { courseEvents } from "@/lib/trackingEvents";

const SelectCourseButton = ({ courseId }: { courseId: RawCourseID }) => {
  const { isCourseSelected, addCourse, deleteCourse } = useUserTimetable();
  const [favourites, setFavourites] = useLocalStorage<string[]>(
    "course_favourites",
    [],
  );

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
        <Button variant="ghost" onClick={handleToggleFavourite} size="sm">
          {isInFavourites ? (
            <Heart className="text-red-500 fill-red-500 w-4 h-4" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
        </Button>
      )}
      {isCourseSelected(courseId) ? (
        <Button variant={"destructive"} onClick={handleRemoveCourse} size="sm">
          <Minus className="w-4 h-4" /> {dict.course.item.remove_from_semester}
        </Button>
      ) : (
        <Button variant="outline" onClick={handleAddCourse} size="sm">
          <Plus className="w-4 h-4" /> {dict.course.item.add_to_semester}
        </Button>
      )}
    </div>
  );
};

export default SelectCourseButton;
