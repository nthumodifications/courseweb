import { Button } from "@courseweb/ui";
import { Heart, Minus, Plus } from "lucide-react";

interface FavouriteCourseActionsProps {
  courseId: string;
  isSelected: boolean;
  labels: {
    addToTimetable: string;
    remove: string;
    unfavorite: string;
  };
  onAdd: (courseId: string) => void;
  onRemove: (courseId: string) => void;
  onUnfavorite: () => void;
}

export const FavouriteCourseActions = ({
  courseId,
  isSelected,
  labels,
  onAdd,
  onRemove,
  onUnfavorite,
}: FavouriteCourseActionsProps) => {
  return (
    <div className="flex flex-row">
      <Button
        className="rounded-r-none"
        variant="outline"
        size="icon"
        aria-label={labels.unfavorite}
        onClick={onUnfavorite}
      >
        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
      </Button>
      {isSelected ? (
        <Button
          className="rounded-l-none"
          variant="destructive"
          size="icon"
          aria-label={labels.remove}
          onClick={() => onRemove(courseId)}
        >
          <Minus className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          className="rounded-l-none"
          variant="outline"
          size="icon"
          aria-label={labels.addToTimetable}
          onClick={() => onAdd(courseId)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
