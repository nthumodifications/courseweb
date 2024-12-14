"use client";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

export function ItemContainer(props: {
  id: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-1 h-full w-full",
        isOver && "bg-green-400/20",
      )}
      ref={setNodeRef}
    >
      {props.children}
    </div>
  );
}
