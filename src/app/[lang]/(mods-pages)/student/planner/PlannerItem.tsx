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
    transform: CSS.Translate.toString(transform),
  };
  const itemsCol = useRxCollection<ItemDocType>("items");
  const deleteSelf = () => {
    itemsCol?.findOne(item.id).remove();
  };

  return (
    // eslint
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="p-1 rounded-sm bg-border m-0.5">
        <div className="flex flex-col gap-1" {...listeners}>
          <div className="text-sm">{item.title} </div>
          <div className="text-xs">{item.credits} Credits</div>
        </div>
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
      </div>
    </div>
  );
};

export default PlannerItem;
