"use client";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { RawCourseID, Semester } from "@/types/courses";
import { useMemo } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "usehooks-ts";
import { toast } from "../ui/use-toast";
import { lastSemester } from "@/const/semester";

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

  return (
    <div className="flex flex-row gap-2 red-500">
      {isFavouritable && (
        <Button variant="outline" size="icon" onClick={handleToggleFavourite}>
          {isInFavourites ? (
            <Heart className="text-red-500 fill-red-500 w-4 h-4" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
        </Button>
      )}
      {isCourseSelected(courseId) ? (
        <Button variant={"destructive"} onClick={() => deleteCourse(courseId)}>
          <Minus className="w-4 h-4" /> {dict.course.item.remove_from_semester}
        </Button>
      ) : (
        <Button onClick={() => addCourse(courseId)}>
          <Plus className="w-4 h-4" /> {dict.course.item.add_to_semester}
        </Button>
      )}
    </div>
  );
};

export default SelectCourseButton;
