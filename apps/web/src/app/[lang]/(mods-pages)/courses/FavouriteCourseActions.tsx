import { Button } from "@courseweb/ui";
import { Check, Heart, Plus } from "lucide-react";

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
    <div className="flex flex-row items-center gap-1">
      <Button
        className="h-8 w-8"
        variant="ghost"
        size="icon"
        aria-label={labels.unfavorite}
        title={labels.unfavorite}
        onClick={onUnfavorite}
      >
        <Heart className="h-4 w-4 fill-primary text-primary" />
      </Button>
      {isSelected ? (
        <Button
          className="h-8 w-8 bg-muted text-primary"
          variant="ghost"
          size="icon"
          aria-label={labels.remove}
          title={labels.remove}
          onClick={() => onRemove(courseId)}
        >
          <Check className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          className="h-8 w-8 bg-muted"
          variant="ghost"
          size="icon"
          aria-label={labels.addToTimetable}
          title={labels.addToTimetable}
          onClick={() => onAdd(courseId)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
