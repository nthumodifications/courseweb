import { Button } from "@courseweb/ui";
import type { ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { decodeCourseText } from "@/lib/course-text";
import useDictionary from "@/dictionaries/useDictionary";
import { FolderDocType } from "../../rxdb";
import {
  formatPlannerSemester,
  getCategoryColorClass,
  PlannerViewProps,
  RequirementSummary,
  splitCourseTitle,
} from "./shared";
import { effectiveStatus, normalizeSemesterId } from "../../lib/progress";

interface MatrixViewProps extends PlannerViewProps {
  termIds: string[];
}

export function MatrixView(props: MatrixViewProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const isPhone = useMediaQuery("(max-width: 767px)");
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
  const unsortedFolder = props.folders.find(
    (folder) => folder.id === "_unsorted",
  );
  const matrixFolders = [
    ...rootFolders,
    ...(unsortedFolder &&
    visibleItems.some(
      (item) => item.parent === "_unsorted" || item.parent === "planner-1",
    )
      ? [unsortedFolder]
      : []),
  ];
  const childrenOf = (parentId: string) =>
    props.folders
      .filter((folder) => folder.parent === parentId)
      .sort((left, right) => left.order - right.order);
  const descendantIds = (folderId: string) => {
    const result = new Set([folderId]);
    const visit = (parentId: string) => {
      for (const child of childrenOf(parentId)) {
        if (result.has(child.id)) continue;
        result.add(child.id);
        visit(child.id);
      }
    };
    visit(folderId);
    return result;
  };
  const folderItems = (folderId: string) => {
    const ids = descendantIds(folderId);
    return visibleItems.filter(
      (item) =>
        (item.parent && ids.has(item.parent)) ||
        (folderId === "_unsorted" && item.parent === "planner-1"),
    );
  };
  const totalForTerm = (termId: string) =>
    props.items
      .filter(
        (item) =>
          item.semester &&
          normalizeSemesterId(item.semester) === normalizeSemesterId(termId) &&
          effectiveStatus(item, props.now) !== "failed",
      )
      .reduce((sum, item) => sum + item.credits, 0);

  const renderMatrixLine = (folder: FolderDocType, isSubfolder: boolean) => {
    const items =
      folder.id === "_unsorted"
        ? visibleItems.filter(
            (item) =>
              item.parent === "_unsorted" || item.parent === "planner-1",
          )
        : visibleItems.filter((item) => item.parent === folder.id);
    const progress = props.progress.get(folder.id);
    const rowStyle = {
      gridTemplateColumns: `250px repeat(${props.termIds.length}, 100px) 110px`,
    };
    return (
      <div
        key={folder.id}
        className="grid min-h-[58px] border-b border-border"
        style={rowStyle}
      >
        <div
          className={`sticky left-0 z-[1] flex min-w-0 flex-col justify-center bg-background px-3 py-2 ${progress?.remaining ? "shadow-[inset_3px_0_0_hsl(var(--destructive))]" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isSubfolder ? (
              <span className="w-2 shrink-0" />
            ) : (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(folder)}`}
              />
            )}
            <span
              className={`min-w-0 truncate ${isSubfolder ? "text-sm" : "font-medium"}`}
            >
              {folder.id === "_unsorted"
                ? t.uncategorizedCourses
                : folder.title}
            </span>
          </div>
          <div className="pl-4">
            {folder.id === "_unsorted" ? (
              <span className="text-xs text-muted-foreground">
                {items.length}
              </span>
            ) : (
              <RequirementSummary folder={folder} progress={progress} />
            )}
          </div>
        </div>
        {props.termIds.map((termId) => {
          const current =
            normalizeSemesterId(termId) === normalizeSemesterId(props.now);
          const termItems = items.filter(
            (item) =>
              item.semester &&
              normalizeSemesterId(item.semester) ===
                normalizeSemesterId(termId),
          );
          return (
            <div
              key={termId}
              className={`min-w-0 border-l border-border/60 px-1.5 py-1.5 ${current ? "bg-primary/[0.04]" : ""}`}
            >
              {termItems.map((item) => {
                const status = effectiveStatus(item, props.now);
                const title = splitCourseTitle(item.title);
                return (
                  <button
                    key={item.uuid}
                    type="button"
                    className={`mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-xs ${status === "failed" ? "bg-destructive/10 text-destructive line-through" : status === "planned" ? "border border-dashed border-border bg-background" : "bg-muted/50 hover:bg-muted"}`}
                    title={decodeCourseText(item.title)}
                    onClick={() => props.onViewDetails(item)}
                  >
                    {title.primary}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="min-w-0 border-l border-border/60 px-1.5 py-1.5">
          {items
            .filter((item) => !item.semester)
            .map((item) => {
              const status = effectiveStatus(item, props.now);
              const title = splitCourseTitle(item.title);
              return (
                <button
                  key={item.uuid}
                  type="button"
                  className={`mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-xs ${status === "failed" ? "bg-destructive/10 text-destructive line-through" : "bg-destructive/10 text-destructive"}`}
                  title={decodeCourseText(item.title)}
                  onClick={() => props.onViewDetails(item)}
                >
                  {title.primary}
                </button>
              );
            })}
        </div>
      </div>
    );
  };

  const mobileStrip = (folder: FolderDocType) => {
    const items = folderItems(folder.id);
    return (
      <div className="mt-1.5 grid grid-flow-col auto-cols-fr gap-1 overflow-x-auto">
        {props.termIds.map((termId) => {
          const count = items.filter(
            (item) =>
              item.semester &&
              normalizeSemesterId(item.semester) ===
                normalizeSemesterId(termId),
          ).length;
          const current =
            normalizeSemesterId(termId) === normalizeSemesterId(props.now);
          return (
            <button
              key={termId}
              type="button"
              className={`flex h-6 min-w-8 items-center justify-center rounded text-xs ${count ? (current ? "bg-primary/60 text-primary-foreground" : "bg-primary text-primary-foreground") : "bg-muted"}`}
              title={formatPlannerSemester(termId)}
              aria-label={`${formatPlannerSemester(termId)}: ${count}`}
              onClick={() => {
                const firstItem = items.find(
                  (item) =>
                    item.semester &&
                    normalizeSemesterId(item.semester) ===
                      normalizeSemesterId(termId),
                );
                if (firstItem) props.onViewDetails(firstItem);
                else props.onOpenAddCourse(folder.id, termId);
              }}
            >
              {count || ""}
            </button>
          );
        })}
      </div>
    );
  };

  if (isPhone) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto px-4 pt-2">
          <div className="grid min-w-[360px] grid-flow-col auto-cols-fr gap-1">
            {props.termIds.map((termId) => (
              <span
                key={termId}
                className={`text-center text-[10px] ${normalizeSemesterId(termId) === normalizeSemesterId(props.now) ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                {formatPlannerSemester(termId)}
              </span>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {matrixFolders.map((folder) => {
            const progress = props.progress.get(folder.id);
            return (
              <section key={folder.id} className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(folder)}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {folder.id === "_unsorted"
                      ? t.uncategorizedCourses
                      : folder.title}
                  </span>
                  {folder.id === "_unsorted" ? (
                    <span className="text-xs text-muted-foreground">
                      {folderItems(folder.id).length}
                    </span>
                  ) : (
                    <RequirementSummary folder={folder} progress={progress} />
                  )}
                </div>
                {mobileStrip(folder)}
              </section>
            );
          })}
        </div>
        <div className="px-4 py-3">
          <Button
            type="button"
            size="sm"
            onClick={() => props.onOpenAddCourse()}
          >
            {t.addCourse}
          </Button>
        </div>
      </div>
    );
  }

  const rowsFor = (
    folder: FolderDocType,
    isSubfolder: boolean,
  ): ReactNode[] => [
    renderMatrixLine(folder, isSubfolder),
    ...childrenOf(folder.id).flatMap((child) => rowsFor(child, true)),
  ];
  const matrixRows = matrixFolders.flatMap((folder) => rowsFor(folder, false));

  return (
    <div className="min-h-0 flex-1 overflow-hidden px-4 md:px-6">
      <div className="h-full overflow-auto overscroll-contain">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-10 grid h-10 border-b border-border bg-background"
            style={{
              gridTemplateColumns: `250px repeat(${props.termIds.length}, 100px) 110px`,
            }}
          >
            <div className="sticky left-0 z-20 flex items-center bg-background px-3 text-xs font-medium text-muted-foreground">
              {t.categoryLabel}
            </div>
            {props.termIds.map((termId) => {
              const current =
                normalizeSemesterId(termId) === normalizeSemesterId(props.now);
              return (
                <div
                  key={termId}
                  className={`flex items-center border-l border-border/60 px-2 text-xs font-medium ${current ? "bg-primary/[0.04] text-primary" : ""}`}
                >
                  {formatPlannerSemester(termId)}
                  {current && (
                    <span className="ml-1 text-[10px]">{t.currentTerm}</span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center border-l border-border/60 px-2 text-xs font-medium text-muted-foreground">
              {t.noneTerm}
            </div>
          </div>
          {matrixRows}
          <div
            className="sticky bottom-0 z-10 grid h-10 border-t border-border bg-muted"
            style={{
              gridTemplateColumns: `250px repeat(${props.termIds.length}, 100px) 110px`,
            }}
          >
            <div className="sticky left-0 z-20 flex items-center bg-muted px-3 text-xs font-medium">
              {t.emptyTermTotal}
            </div>
            {props.termIds.map((termId) => {
              const credits = totalForTerm(termId);
              return (
                <div
                  key={termId}
                  className={`flex items-center border-l border-border/60 px-2 text-xs ${credits === 0 ? "text-muted-foreground" : "font-medium"}`}
                >
                  {credits}
                </div>
              );
            })}
            <div className="border-l border-border/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
