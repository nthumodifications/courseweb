import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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

const MATRIX_LABEL_COLUMN_WIDTH = 250;
const MATRIX_TERM_COLUMN_WIDTH = 128;
const MATRIX_END_PADDING = 16;

export function MatrixView(props: MatrixViewProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const isPhone = useMediaQuery("(max-width: 767px)");
  const [expandedMobileFolders, setExpandedMobileFolders] = useState<
    Record<string, boolean>
  >({});
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
      gridTemplateColumns: `${MATRIX_LABEL_COLUMN_WIDTH}px repeat(${props.termIds.length}, ${MATRIX_TERM_COLUMN_WIDTH}px) ${MATRIX_TERM_COLUMN_WIDTH}px`,
      width:
        MATRIX_LABEL_COLUMN_WIDTH +
        (props.termIds.length + 1) * MATRIX_TERM_COLUMN_WIDTH,
    };
    return (
      <div
        key={folder.id}
        className="grid min-h-[58px] border-b border-border"
        style={rowStyle}
      >
        <div
          id={folder.id === "_unsorted" ? "planner-unsorted" : undefined}
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
              <RequirementSummary
                folder={folder}
                progress={progress}
                onOpenFolderManagement={props.onOpenFolderManagement}
              />
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
              className={`min-w-0 border-l border-border/60 px-1.5 py-1.5 ${current ? "bg-primary/10" : ""}`}
            >
              {termItems.map((item) => {
                const status = effectiveStatus(item, props.now);
                const title = splitCourseTitle(item.title);
                return (
                  <button
                    key={item.uuid}
                    type="button"
                    className={`mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-xs ${status === "failed" ? "border border-red-500/30 bg-red-500/10 text-red-500 line-through" : status === "planned" ? "border border-dashed border-primary/40 bg-primary/5" : "bg-muted/50 hover:bg-muted"}`}
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
        <div
          id={
            folder.id === "_unsorted" ? "planner-matrix-unscheduled" : undefined
          }
          className="min-w-0 border-l border-border/60 px-1.5 py-1.5"
        >
          {items
            .filter((item) => !item.semester)
            .map((item) => {
              const status = effectiveStatus(item, props.now);
              const title = splitCourseTitle(item.title);
              return (
                <button
                  key={item.uuid}
                  type="button"
                  className={`mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-xs ${status === "failed" ? "border border-red-500/30 bg-red-500/10 text-red-500 line-through" : "border border-dashed border-border bg-muted/20 text-foreground"}`}
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
      <div
        className="mt-1.5 grid min-w-0 gap-1"
        style={{
          gridTemplateColumns: `repeat(${props.termIds.length + 1}, minmax(0, 1fr))`,
        }}
      >
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
              className={`flex h-6 min-w-0 items-center justify-center rounded text-xs ${count ? (current ? "bg-primary/60 text-primary-foreground" : "bg-primary text-primary-foreground") : "bg-muted"}`}
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
        <button
          type="button"
          className={`flex h-6 min-w-0 items-center justify-center rounded text-xs ${items.some((item) => !item.semester) ? "border border-dashed border-border bg-muted/20 text-muted-foreground" : "bg-muted text-muted-foreground"}`}
          title={t.noneTerm}
          aria-label={`${t.noneTerm}: ${items.filter((item) => !item.semester).length}`}
          onClick={() =>
            setExpandedMobileFolders((previous) => ({
              ...previous,
              [folder.id]: true,
            }))
          }
        >
          {items.filter((item) => !item.semester).length || ""}
        </button>
      </div>
    );
  };

  const mobileCourseGroups = (folder: FolderDocType) => {
    const items = folderItems(folder.id);
    const groups = props.termIds
      .map((termId) => ({
        termId,
        courses: items.filter(
          (item) =>
            item.semester &&
            normalizeSemesterId(item.semester) === normalizeSemesterId(termId),
        ),
      }))
      .filter((group) => group.courses.length > 0);
    const unscheduled = items.filter((item) => !item.semester);
    return (
      <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
        {groups.map(({ termId, courses }) => (
          <div key={termId} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              {formatPlannerSemester(termId)}
            </div>
            {courses.map((item) => {
              const title = splitCourseTitle(item.title);
              return (
                <button
                  key={item.uuid}
                  type="button"
                  className={`block w-full rounded px-2 py-1 text-left text-sm ${effectiveStatus(item, props.now) === "failed" ? "bg-red-500/10 text-red-500" : "hover:bg-muted"}`}
                  title={decodeCourseText(item.title)}
                  onClick={() => props.onViewDetails(item)}
                >
                  <span className="font-medium">{title.primary}</span>
                  {title.secondary && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {title.secondary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {unscheduled.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              {t.noneTerm}
            </div>
            {unscheduled.map((item) => {
              const title = splitCourseTitle(item.title);
              const status = effectiveStatus(item, props.now);
              return (
                <button
                  key={item.uuid}
                  type="button"
                  className={`block w-full rounded px-2 py-1 text-left text-sm ${status === "failed" ? "bg-red-500/10 text-red-500" : "border border-dashed border-border bg-muted/20 hover:bg-muted/40"}`}
                  title={decodeCourseText(item.title)}
                  onClick={() => props.onViewDetails(item)}
                >
                  <span className="font-medium">{title.primary}</span>
                  {title.secondary && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {title.secondary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isPhone) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div id="planner-matrix-scroll" className="px-4 pt-2">
          <div
            className="grid min-w-0 gap-1"
            style={{
              gridTemplateColumns: `repeat(${props.termIds.length + 1}, minmax(0, 1fr))`,
            }}
          >
            {props.termIds.map((termId) => (
              <span
                key={termId}
                className={`min-w-0 whitespace-nowrap text-center text-[9px] ${normalizeSemesterId(termId) === normalizeSemesterId(props.now) ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                {formatPlannerSemester(termId)}
              </span>
            ))}
            <span className="min-w-0 whitespace-nowrap text-center text-[9px] text-muted-foreground">
              {t.noneTerm}
            </span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {matrixFolders.map((folder) => {
            const progress = props.progress.get(folder.id);
            return (
              <section
                key={folder.id}
                id={folder.id === "_unsorted" ? "planner-unsorted" : undefined}
                className="px-4 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={expandedMobileFolders[folder.id] === true}
                    onClick={() =>
                      setExpandedMobileFolders((previous) => ({
                        ...previous,
                        [folder.id]: !previous[folder.id],
                      }))
                    }
                  >
                    {expandedMobileFolders[folder.id] ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(folder)}`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {folder.id === "_unsorted"
                        ? t.uncategorizedCourses
                        : folder.title}
                    </span>
                    {folder.id === "_unsorted" && (
                      <span className="text-xs text-muted-foreground">
                        {folderItems(folder.id).length}
                      </span>
                    )}
                  </button>
                  {folder.id !== "_unsorted" && (
                    <RequirementSummary
                      folder={folder}
                      progress={progress}
                      onOpenFolderManagement={props.onOpenFolderManagement}
                    />
                  )}
                </div>
                {mobileStrip(folder)}
                {expandedMobileFolders[folder.id] && mobileCourseGroups(folder)}
              </section>
            );
          })}
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
      <div
        id="planner-matrix-scroll"
        className="h-full overflow-auto overscroll-contain"
      >
        <div
          className="min-w-max"
          style={{
            width:
              MATRIX_LABEL_COLUMN_WIDTH +
              (props.termIds.length + 1) * MATRIX_TERM_COLUMN_WIDTH +
              MATRIX_END_PADDING,
          }}
        >
          <div
            className="sticky top-0 z-10 grid h-10 border-b border-border bg-background"
            style={{
              gridTemplateColumns: `${MATRIX_LABEL_COLUMN_WIDTH}px repeat(${props.termIds.length}, ${MATRIX_TERM_COLUMN_WIDTH}px) ${MATRIX_TERM_COLUMN_WIDTH}px`,
              width:
                MATRIX_LABEL_COLUMN_WIDTH +
                (props.termIds.length + 1) * MATRIX_TERM_COLUMN_WIDTH,
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
                  className={`flex items-center border-l border-border/60 px-2 text-xs font-medium ${current ? "bg-primary/10 text-primary" : ""}`}
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
              gridTemplateColumns: `${MATRIX_LABEL_COLUMN_WIDTH}px repeat(${props.termIds.length}, ${MATRIX_TERM_COLUMN_WIDTH}px) ${MATRIX_TERM_COLUMN_WIDTH}px`,
              width:
                MATRIX_LABEL_COLUMN_WIDTH +
                (props.termIds.length + 1) * MATRIX_TERM_COLUMN_WIDTH,
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
                  className={`flex items-center border-l border-border/60 px-2 text-xs ${credits === 0 ? "font-medium text-red-500" : "font-medium"}`}
                >
                  {credits}
                </div>
              );
            })}
            <div className="border-l border-border/60" />
          </div>
          <div aria-hidden="true" className="h-10" />
        </div>
      </div>
    </div>
  );
}
