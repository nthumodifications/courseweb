"use client";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
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
import { PlannerFolder } from "./PlannerFolder";
import PlannerItem from "./PlannerItem";
import { ProcessedFolder } from "./ProcessedFolder";

const GraduationPlanner = () => {
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const itemsCol = useRxCollection<ItemDocType>("items");

  const { result: foldersDocs = [], isFetching: foldersLoading } = useRxQuery(
    foldersCol?.find().sort("order"),
  );
  const { result: itemsDocs = [], isFetching: itemsLoading } = useRxQuery(
    itemsCol?.find().sort("order"),
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
    let counter = 0;
    for (const sem in courses) {
      const semCourses = getSemesterCourses(sem);
      for (const course of semCourses) {
        await itemsCol?.insert({
          id: course.raw_id,
          parent: null,
          title: course.name_zh,
          credits: course.credits,
          order: counter++,
        });
      }
    }
  };

  const clearItems = async () => {
    // remove all cols and items
    await foldersCol?.find().remove();
    await itemsCol?.find().remove();
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
            <Button variant="destructive" onClick={() => clearItems()}>
              Clear DB
            </Button>
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
