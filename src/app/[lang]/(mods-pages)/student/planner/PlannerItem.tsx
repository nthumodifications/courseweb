import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRxCollection } from "rxdb-hooks";
import { ItemDocType } from "@/config/rxdb";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PlannerItem = ({ item }: { item: ItemDocType }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: item,
  });
  const style = {
    // Outputs `translate3d(x, y, 0)`
    transform: CSS.Translate.toString(transform),
  };
  const itemsCol = useRxCollection<ItemDocType>("items");
  const deleteSelf = () => {
    itemsCol?.findOne(item.id).remove();
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Badge variant="outline">
        <span {...listeners}>{item.title} </span>
        {item.parent == null && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <X className="w-3 h-3 ml-2" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete this item from the planner.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSelf}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Badge>
    </div>
  );
};

export default PlannerItem;
