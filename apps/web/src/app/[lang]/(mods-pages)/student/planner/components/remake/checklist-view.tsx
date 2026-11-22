import { Button } from "@courseweb/ui";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { FolderDocType, ItemDocType } from "../../rxdb";
import { getFolderColorDotClass } from "../../lib/folder-colors";
import {
  comparePlannerSemesters,
  formatPlannerText,
  PlannerCourseRow,
  PlannerViewProps,
  RequirementSummary,
} from "./shared";

const sortItems = (items: ItemDocType[]) =>
  [...items].sort((left, right) => {
    if (left.semester && right.semester) {
      return comparePlannerSemesters(left.semester, right.semester);
    }
    if (left.semester) return -1;
    if (right.semester) return 1;
    return left.order - right.order;
  });

export function ChecklistView(props: PlannerViewProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const rootFolders = props.folders
    .filter(
      (folder) => folder.parent === "planner-1" && folder.id !== "_unsorted",
    )
    .sort((left, right) => left.order - right.order);
  const visibleItems = props.pendingOnly
    ? props.items.filter(
        (item) =>
          (item.parent === "_unsorted" || !item.semester) &&
          item.status !== "failed",
      )
    : props.items;
  const firstUnscheduledId = visibleItems.find(
    (item) => !item.semester && item.status !== "failed",
  )?.uuid;
  const childrenOf = (parentId: string) =>
    props.folders
      .filter((folder) => folder.parent === parentId)
      .sort((left, right) => left.order - right.order);
  const itemsFor = (folderId: string) =>
    sortItems(
      visibleItems.filter(
        (item) =>
          item.parent === folderId ||
          (folderId === "_unsorted" && item.parent === "planner-1"),
      ),
    );

  const scrollToCategory = (folderId: string) => {
    document
      .getElementById(`planner-category-${folderId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderFolderContents = (
    folder: FolderDocType,
    isRoot: boolean,
  ): ReactNode => {
    const childFolders = childrenOf(folder.id);
    const directItems = itemsFor(folder.id);
    return (
      <div key={folder.id} className={isRoot ? "" : "mt-2"}>
        {!isRoot && (
          <div className="flex min-h-8 flex-wrap items-center gap-2 px-1 py-1">
            <span className="font-medium text-sm">{folder.title}</span>
            <RequirementSummary
              folder={folder}
              progress={props.progress.get(folder.id)}
              onOpenFolderManagement={props.onOpenFolderManagement}
            />
          </div>
        )}
        {directItems.length > 0 ? (
          <div>
            {directItems.map((item) => (
              <PlannerCourseRow
                key={item.uuid}
                item={item}
                now={props.now}
                semesters={props.semesters}
                folders={props.folders}
                showSemester
                showCode
                enableDrag={false}
                rowId={
                  item.uuid === firstUnscheduledId
                    ? "planner-unscheduled"
                    : undefined
                }
                onOpenDetails={props.onViewDetails}
                onViewDetails={props.onViewDetails}
                onEdit={props.onEdit}
                onDelete={props.onDelete}
                onMoveCategory={props.onMoveCategory}
                onChangeSemester={props.onChangeSemester}
                onSetFailed={props.onSetFailed}
              />
            ))}
          </div>
        ) : null}
        {childFolders.map((child) => renderFolderContents(child, false))}
        {childFolders.length === 0 && directItems.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {t.noCourses}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {rootFolders.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-4 py-2 lg:hidden">
          {rootFolders.map((folder) => (
            <div
              key={folder.id}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-border px-2"
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-sm"
                onClick={() => scrollToCategory(folder.id)}
              >
                <span
                  className={`h-2 w-2 rounded-full ${getFolderColorDotClass(folder.color)}`}
                />
                <span className="whitespace-nowrap">{folder.title}</span>
              </button>
              {props.progress.get(folder.id)?.unset && (
                <RequirementSummary
                  folder={folder}
                  progress={props.progress.get(folder.id)}
                  onOpenFolderManagement={props.onOpenFolderManagement}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-r border-border lg:block">
          <nav className="space-y-1 p-3">
            {rootFolders.map((folder) => {
              const progress = props.progress.get(folder.id);
              const remaining = progress?.remaining ?? 0;
              return (
                <div
                  key={folder.id}
                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => scrollToCategory(folder.id)}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${getFolderColorDotClass(folder.color)}`}
                    />
                    <span className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-snug">
                      {folder.title}
                    </span>
                  </button>
                  {progress?.unset ? (
                    <RequirementSummary
                      folder={folder}
                      progress={progress}
                      onOpenFolderManagement={props.onOpenFolderManagement}
                    />
                  ) : (
                    <span
                      className={`shrink-0 text-xs ${remaining ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      {remaining
                        ? formatPlannerText(t.remainingShort, {
                            count: remaining,
                          })
                        : progress?.satisfied
                          ? t.satisfied
                          : t.plannedCoverage}
                    </span>
                  )}
                </div>
              );
            })}
            {rootFolders.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                {t.noCategories}
              </p>
            )}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
          {rootFolders.map((folder) => {
            const progress = props.progress.get(folder.id);
            const covered =
              (progress?.done ?? 0) +
              (progress?.inProgress ?? 0) +
              (progress?.planned ?? 0);
            const childFolders = childrenOf(folder.id);
            const directItems = itemsFor(folder.id);
            return (
              <section
                key={folder.id}
                id={`planner-category-${folder.id}`}
                className="mb-6 scroll-mt-4"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-1 py-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${getFolderColorDotClass(folder.color)}`}
                  />
                  <h2 className="text-base font-bold">{folder.title}</h2>
                  <RequirementSummary
                    folder={folder}
                    progress={progress}
                    onOpenFolderManagement={props.onOpenFolderManagement}
                  />
                </div>
                {renderFolderContents(folder, true)}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 px-1 text-primary"
                  onClick={() => props.onOpenAddCourse(folder.id)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {formatPlannerText(t.addCategoryCourses, {
                    category: folder.title,
                  })}
                </Button>
                <span className="sr-only">
                  {formatPlannerText(t.requirement, {
                    covered,
                    range: `${folder.min}–${folder.max}`,
                    unit:
                      folder.metric === "courses"
                        ? dict.planner.sidebar.coursesUnit
                        : dict.course.credits,
                  })}
                </span>
              </section>
            );
          })}
          {visibleItems.some(
            (item) =>
              item.parent === "_unsorted" || item.parent === "planner-1",
          ) && (
            <section id="planner-unsorted" className="mb-6 scroll-mt-4">
              <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border px-1 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                <h2 className="text-base font-bold">
                  {t.uncategorizedCourses}
                </h2>
              </div>
              {itemsFor("_unsorted").map((item) => (
                <PlannerCourseRow
                  key={item.uuid}
                  item={item}
                  now={props.now}
                  semesters={props.semesters}
                  folders={props.folders}
                  showSemester
                  showCode
                  enableDrag={false}
                  rowId={
                    item.uuid === firstUnscheduledId
                      ? "planner-unscheduled"
                      : undefined
                  }
                  onOpenDetails={props.onViewDetails}
                  onViewDetails={props.onViewDetails}
                  onEdit={props.onEdit}
                  onDelete={props.onDelete}
                  onMoveCategory={props.onMoveCategory}
                  onChangeSemester={props.onChangeSemester}
                  onSetFailed={props.onSetFailed}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
