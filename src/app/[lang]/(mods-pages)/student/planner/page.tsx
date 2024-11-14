"use client";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useEffect, useMemo } from "react";
import { CSS } from "@dnd-kit/utilities";

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

const PlannerItem = ({ item }: { item: Item }) => {
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

type Folder = {
  id: string;
  title: string;
  parent: string | null;
  min: number;
  max: number;
  metric: "credits" | "courses";
  requireChildValidation: boolean;
  titlePlacement: string;
};

type Item = {
  id: string;
  title: string;
  parent: string;
  credits: number;
  type: string;
};

type ProcessedFolder = Folder & {
  credits: number;
  courses: number;
  children?: ProcessedFolder[];
  items?: Item[];
};

const GraduationPlanner = () => {
  const folders: Folder[] = [
    {
      id: "root",
      title: "電機資訊學院學士班 111學年度",
      parent: null,
      min: 128,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "top",
    },
    {
      id: "school_required",
      title: "校定必修",
      parent: "root",
      min: 30,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "chinese",
      title: "大學中文",
      parent: "school_required",
      min: 2,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "english",
      title: "英文領域",
      parent: "school_required",
      min: 8,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "general_education",
      title: "通識課程",
      parent: "school_required",
      min: 20,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "core_courses",
      title: "核心必修",
      parent: "general_education",
      min: 4,
      max: -1,
      metric: "courses",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "elective_courses",
      title: "選修科目",
      parent: "general_education",
      min: 8,
      max: 12,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "physical_education",
      title: "體育",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "service_learning",
      title: "服務學習",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "conduct",
      title: "操行",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "department_required",
      title: "班定必修",
      parent: "root",
      min: 43,
      max: 44,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "calculus",
      title: "微積分一、微積分二",
      parent: "department_required",
      min: 8,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "physics",
      title: "普通物理一、普通物理二",
      parent: "department_required",
      min: 6,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "physics_lab",
      title: "普通物理實驗一",
      parent: "department_required",
      min: 1,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "programming",
      title: "計算機程式設計",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "logic_design",
      title: "邏輯設計",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "discrete_math",
      title: "離散數學",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "differential_eq",
      title: "常微分方程",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "linear_algebra",
      title: "線性代數",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "probability",
      title: "機率",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "signals_systems",
      title: "訊號與系統",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "project_one",
      title: "實作專題一或系統整合實作一",
      parent: "department_required",
      min: 1,
      max: 2,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "project_two",
      title: "實作專題二或系統整合實作二",
      parent: "department_required",
      min: 2,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "lab_courses",
      title: "實驗",
      parent: "department_required",
      min: 4,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
    },
    {
      id: "core_electives",
      title: "核心選修",
      parent: "root",
      min: 15,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "professional_electives",
      title: "專業選修",
      parent: "root",
      min: 27,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "second_major",
      title: "他系第二專長",
      parent: "root",
      min: 26,
      max: 33,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
    {
      id: "other_electives",
      title: "其餘選修",
      parent: "root",
      min: 6,
      max: 14,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
    },
  ];

  const items: Item[] = [
    {
      id: "11310ABCD12340",
      title: "CS 2026",
      parent: "other_electives",
      credits: 12,
      type: "course",
    },
  ];

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
    const activeId = event.active.id;
    const overId = event.over?.id;
    // update activeId's parent to overId
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="w-full">
        {folderTree.map((folder) => (
          <PlannerFolder key={folder.id} folder={folder} />
        ))}
      </div>
    </DndContext>
  );
};

const PlannerPage = () => {
  return <GraduationPlanner />;
};

export default PlannerPage;
