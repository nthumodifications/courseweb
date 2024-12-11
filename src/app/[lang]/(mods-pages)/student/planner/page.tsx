"use client";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useRxCollection, useRxQuery } from "rxdb-hooks";
import { FolderDocType, ItemDocType, loadDummyData } from "@/config/rxdb";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Droppable(props: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
  });
  const style = {
    backgroundColor: isOver ? "lightblue" : "transparent",
  };

  return (
    <div
      className="flex flex-col gap-3 h-full w-full"
      ref={setNodeRef}
      style={style}
    >
      {props.children}
    </div>
  );
}

const PlannerItem = ({ item }: { item: ItemDocType }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: item,
  });
  const style = {
    // Outputs `translate3d(x, y, 0)`
    transform: CSS.Translate.toString(transform),
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {item.title}
    </div>
  );
};

const PlannerFolder = ({ folder }: { folder: ProcessedFolder }) => {
  return (
    <div
      className={cn(
        "flex w-full border border-border divide-border",
        folder.titlePlacement == "top"
          ? "flex-col divide-y"
          : "flex-row divide-x",
      )}
    >
      <div className="flex flex-col p-1">
        <div className="text-sm">{folder.title}</div>
        <div className="text-xs">
          {/* green color circle if fullfilled, else red */}
          <div
            className={cn(
              "w-2 h-2 rounded-full inline-block",
              folder.credits >= folder.min &&
                (folder.credits <= folder.max || folder.max == -1)
                ? "bg-green-500"
                : "bg-red-500",
            )}
          ></div>{" "}
          {folder.credits} / {folder.min} -{" "}
          {folder.max == -1 ? "∞" : folder.max}
        </div>
      </div>
      <div className="flex flex-col flex-1">
        {folder.children?.map((child) => (
          <PlannerFolder key={child.id} folder={child} />
        ))}
        {!folder.children && (
          <Droppable id={folder.id}>
            {folder.items?.map((item) => (
              <PlannerItem key={item.id} item={item} />
            ))}
          </Droppable>
        )}
      </div>
    </div>
  );
};

type ProcessedFolder = FolderDocType & {
  credits: number;
  courses: number;
  children?: ProcessedFolder[];
  items?: ItemDocType[];
};

const GraduationPlanner = () => {
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const itemsCol = useRxCollection<ItemDocType>("items");

  const { result: foldersDocs = [], isFetching: foldersLoading } = useRxQuery(
    foldersCol?.find(),
  );
  const { result: itemsDocs = [], isFetching: itemsLoading } = useRxQuery(
    itemsCol?.find(),
  );

  const folders = useMemo(
    () => foldersDocs.map((doc) => doc.toJSON()),
    [foldersDocs],
  );
  const items = useMemo(
    () => itemsDocs.map((doc) => doc.toJSON()),
    [itemsDocs],
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (foldersLoading || itemsLoading) return;
    setLoading(false);
  }, [foldersLoading, itemsLoading]);

  useEffect(() => {
    if (!foldersCol || !itemsCol) return;
    loadDummyData({ foldersCol, itemsCol });
  }, [foldersCol, itemsCol]);

  // Build the folder item tree and calculate the credits/courses in each folder
  const buildFolderTree = () => {
    const findFolder = (id: string | null) => {
      const childFolders = folders.filter((folder) => folder.parent === id);
      return childFolders.map((child) => {
        const deeperChildFolders = findFolder(child.id) as ProcessedFolder[];
        if (deeperChildFolders.length == 0) {
          // leaf folder, tabulate the credits/courses
          const childItems = items.filter((item) => item.parent === child.id);
          const credits = childItems.reduce(
            (acc, item) => acc + item.credits,
            0,
          );
          const courses = childItems.length;
          return {
            ...child,
            credits,
            courses,
            valid:
              child.min <= (child.metric == "credits" ? credits : courses) &&
              (child.max == -1 || child.metric == "credits"
                ? credits <= child.max
                : courses <= child.max),
            items: childItems,
          } as ProcessedFolder;
        } else {
          // non-leaf folder, tabulate the credits/courses of its children
          const credits = deeperChildFolders.reduce(
            (acc, folder) => acc + folder.credits,
            0,
          );
          const courses = deeperChildFolders.reduce(
            (acc, folder) => acc + folder.courses,
            0,
          );
          return {
            ...child,
            credits,
            courses,
            valid:
              child.min <= (child.metric == "credits" ? credits : courses) &&
              (child.max == -1 || child.metric == "credits"
                ? credits <= child.max
                : courses <= child.max),
            children: deeperChildFolders,
          } as ProcessedFolder;
        }
      });
    };

    const root = findFolder(null);
    return root;
  };

  const folderTree = useMemo(() => buildFolderTree(), [folders, items]);

  function handleDragEnd(event: DragEndEvent) {
    // move item to folder
    console.log(event);
    const activeId = event.active.id as string;
    const overId = event.over?.id ?? null;
    // set item's parent to overId
    itemsCol?.findOne(activeId).update({ $set: { parent: overId } });
  }

  const { getSemesterCourses, courses } = useUserTimetable();

  const importItems = async () => {
    // get user courses and import them as items
    for (const sem in courses) {
      const semCourses = getSemesterCourses(sem);
      for (const course of semCourses) {
        await itemsCol?.insert({
          id: course.raw_id,
          parent: null,
          title: course.name_zh,
          credits: course.credits,
        });
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <ScrollArea className="h-full">
            {folderTree.map((folder) => (
              <PlannerFolder key={folder.id} folder={folder} />
            ))}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div className="w-full h-full flex flex-col">
            <h3>Items</h3>
            <Button onClick={() => importItems()}>Import items</Button>
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3">
                {items
                  .filter((item) => item.parent == null)
                  .map((item) => (
                    <PlannerItem key={item.id} item={item} />
                  ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DndContext>
  );
};

const PlannerPage = () => {
  return <GraduationPlanner />;
};

export default PlannerPage;
