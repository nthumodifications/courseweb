import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { FolderDocType, ItemDocType, PlannerDataDocType } from "../../rxdb";
import {
  comparePlannerSemesters,
  formatPlannerSemester,
  formatPlannerText,
  getCategoryColorClass,
  getPlannerItemCategory,
  isPlannerItemPending,
  PlannerCourseRow,
  PlannerViewProps,
  RequirementSummary,
} from "./shared";
import { effectiveStatus, normalizeSemesterId } from "../../lib/progress";

interface SemesterBoardViewProps extends PlannerViewProps {
  planner: PlannerDataDocType | null;
  termIds: string[];
  onOpenSemesterManagement: () => void;
}

function TermCard({
  semesterId,
  items,
  now,
  folders,
  semesters,
  onOpenAddCourse,
  onViewDetails,
  onEdit,
  onDelete,
  onMoveCategory,
  onChangeSemester,
  onSetFailed,
}: {
  semesterId: string;
  items: ItemDocType[];
  now: string;
  folders: FolderDocType[];
  semesters: SemesterBoardViewProps["semesters"];
  onOpenAddCourse: SemesterBoardViewProps["onOpenAddCourse"];
  onViewDetails: SemesterBoardViewProps["onViewDetails"];
  onEdit: SemesterBoardViewProps["onEdit"];
  onDelete: SemesterBoardViewProps["onDelete"];
  onMoveCategory: SemesterBoardViewProps["onMoveCategory"];
  onChangeSemester: SemesterBoardViewProps["onChangeSemester"];
  onSetFailed: SemesterBoardViewProps["onSetFailed"];
}) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const isCurrent =
    normalizeSemesterId(semesterId) === normalizeSemesterId(now);
  const isPast = comparePlannerSemesters(semesterId, now) < 0;
  const { setNodeRef, isOver } = useDroppable({
    id: `planner-term-${semesterId}`,
    data: { type: "semester", semesterId },
  });
  const credits = items
    .filter((item) => effectiveStatus(item, now) !== "failed")
    .reduce((sum, item) => sum + item.credits, 0);

  return (
    <section
      ref={setNodeRef}
      className={`min-w-0 flex-1 rounded-lg border bg-background ${isCurrent ? "border-primary ring-1 ring-primary/30" : isOver ? "border-primary/70 bg-primary/5" : "border-border"} ${isPast ? "bg-muted/20" : ""}`}
    >
      <header className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border px-2 py-2">
        <span className="font-medium">{formatPlannerSemester(semesterId)}</span>
        {isCurrent && (
          <span className="rounded-sm bg-primary/10 px-1.5 py-1 text-xs font-medium text-primary">
            {t.currentTerm}
          </span>
        )}
        {isPast && (
          <span className="text-xs text-muted-foreground">{t.pastTerm}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatPlannerText(t.credits, { count: credits })}
        </span>
      </header>
      <div className="px-2 py-1.5">
        {items.map((item) => (
          <PlannerCourseRow
            key={item.uuid}
            item={item}
            now={now}
            semesters={semesters}
            folders={folders}
            categoryFolder={getPlannerItemCategory(item, folders)}
            onOpenDetails={onViewDetails}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveCategory={onMoveCategory}
            onChangeSemester={onChangeSemester}
            onSetFailed={onSetFailed}
          />
        ))}
        {!isPast && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-8 px-1 text-primary"
            onClick={() => onOpenAddCourse(undefined, semesterId)}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t.addCourse}
          </Button>
        )}
        {items.length === 0 && isPast && (
          <p className="py-3 text-xs text-muted-foreground">{t.noCourses}</p>
        )}
      </div>
    </section>
  );
}

function UnscheduledCourse({
  item,
  ...props
}: {
  item: ItemDocType;
} & Pick<
  SemesterBoardViewProps,
  | "now"
  | "folders"
  | "semesters"
  | "onViewDetails"
  | "onEdit"
  | "onDelete"
  | "onMoveCategory"
  | "onChangeSemester"
  | "onSetFailed"
>) {
  const category = getPlannerItemCategory(item, props.folders);
  return (
    <div className="rounded-md bg-muted/50 px-2">
      <PlannerCourseRow
        item={item}
        now={props.now}
        semesters={props.semesters}
        folders={props.folders}
        categoryFolder={category}
        showSemester
        onOpenDetails={props.onViewDetails}
        onViewDetails={props.onViewDetails}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
        onMoveCategory={props.onMoveCategory}
        onChangeSemester={props.onChangeSemester}
        onSetFailed={props.onSetFailed}
      />
    </div>
  );
}

export function SemesterBoardView(props: SemesterBoardViewProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    {},
  );
  const rootFolders = props.folders
    .filter(
      (folder) => folder.parent === "planner-1" && folder.id !== "_unsorted",
    )
    .sort((left, right) => left.order - right.order);
  const visibleItems = props.pendingOnly
    ? props.items.filter(isPlannerItemPending)
    : props.items;
  const unscheduledItems = props.items
    .filter((item) => !item.semester && item.status !== "failed")
    .sort((left, right) => left.order - right.order);
  const enrollmentYear = Number(props.planner?.enrollmentYear ?? 0);
  const termsByYear = new Map<number, string[]>();
  for (const term of props.termIds) {
    const termYear = Number(normalizeSemesterId(term).slice(0, 3));
    const yearNumber = termYear - enrollmentYear + 1;
    if (yearNumber < 1) continue;
    const terms = termsByYear.get(yearNumber) ?? [];
    terms.push(term);
    termsByYear.set(yearNumber, terms);
  }

  const yearNumbers = [...termsByYear.keys()].sort(
    (left, right) => left - right,
  );
  const getYearLabel = (yearNumber: number) =>
    t.yearLabels[Math.min(yearNumber - 1, t.yearLabels.length - 1)];
  const renderPendingRail = (mobile: boolean) => (
    <aside
      className={`${mobile ? "mb-2 border-b border-border pb-3 lg:hidden" : "hidden w-60 shrink-0 border-l border-border p-4 lg:block"}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-medium">{t.unscheduled}</h2>
        <span className="text-xs text-muted-foreground">
          {unscheduledItems.length}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t.dragHint}</p>
      <div className="space-y-1.5">
        {unscheduledItems.map((item) => (
          <UnscheduledCourse key={item.uuid} item={item} {...props} />
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 px-1 text-primary"
        onClick={() => props.onOpenAddCourse()}
      >
        <Plus className="mr-1 h-4 w-4" />
        {t.searchCourses}
      </Button>
    </aside>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-border px-4 py-2 md:px-6">
        <div className="flex flex-wrap gap-2">
          {rootFolders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
            >
              <span
                className={`h-2 w-2 rounded-full ${getCategoryColorClass(folder)}`}
              />
              <span className="font-medium">{folder.title}</span>
              <RequirementSummary
                folder={folder}
                progress={props.progress.get(folder.id)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 items-start">
        <div className="min-w-0 flex-1 px-4 py-3 md:px-6">
          {renderPendingRail(true)}
          <div className="space-y-3">
            {yearNumbers.map((yearNumber) => {
              const ids = (termsByYear.get(yearNumber) ?? []).sort(
                comparePlannerSemesters,
              );
              const isPastYear = ids.every(
                (term) => comparePlannerSemesters(term, props.now) < 0,
              );
              const isCollapsed =
                isPastYear && expandedYears[yearNumber] !== true;
              const yearItems = props.items.filter((item) =>
                ids.some(
                  (term) =>
                    item.semester &&
                    normalizeSemesterId(item.semester) ===
                      normalizeSemesterId(term),
                ),
              );
              const yearCredits = yearItems
                .filter((item) => effectiveStatus(item, props.now) !== "failed")
                .reduce((sum, item) => sum + item.credits, 0);
              const failedCount = yearItems.filter(
                (item) => effectiveStatus(item, props.now) === "failed",
              ).length;
              const label = getYearLabel(yearNumber);

              if (isCollapsed) {
                return (
                  <div key={yearNumber} className="flex items-center gap-3">
                    <span className="hidden w-10 shrink-0 text-xs font-medium text-muted-foreground md:block">
                      {label}
                    </span>
                    <button
                      type="button"
                      className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/50 px-3 text-left"
                      onClick={() =>
                        setExpandedYears((previous) => ({
                          ...previous,
                          [yearNumber]: true,
                        }))
                      }
                    >
                      <span className="font-medium">
                        {ids.map(formatPlannerSemester).join(" • ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPlannerText(t.yearSummary, {
                          credits: yearCredits,
                          courses: yearItems.length,
                        })}
                        {failedCount > 0 && (
                          <span className="text-destructive">
                            {` • ${formatPlannerText(t.failedCount, { count: failedCount })}`}
                          </span>
                        )}
                      </span>
                      <span className="ml-auto text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>
                  </div>
                );
              }

              return (
                <div key={yearNumber} className="flex items-start gap-3">
                  <div className="hidden w-10 shrink-0 pt-2 text-xs font-medium text-muted-foreground md:block">
                    {label}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isPastYear && expandedYears[yearNumber] === true && (
                      <button
                        type="button"
                        className="mb-2 flex min-h-9 w-full items-center gap-2 rounded-lg bg-muted/50 px-3 text-left text-sm"
                        onClick={() =>
                          setExpandedYears((previous) => ({
                            ...previous,
                            [yearNumber]: false,
                          }))
                        }
                      >
                        <span className="font-medium">
                          {ids.map(formatPlannerSemester).join(" • ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatPlannerText(t.yearSummary, {
                            credits: yearCredits,
                            courses: yearItems.length,
                          })}
                        </span>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
                      {ids.map((semesterId) => (
                        <TermCard
                          key={semesterId}
                          semesterId={semesterId}
                          items={visibleItems.filter(
                            (item) =>
                              item.semester &&
                              normalizeSemesterId(item.semester) ===
                                normalizeSemesterId(semesterId),
                          )}
                          now={props.now}
                          folders={props.folders}
                          semesters={props.semesters}
                          onOpenAddCourse={props.onOpenAddCourse}
                          onViewDetails={props.onViewDetails}
                          onEdit={props.onEdit}
                          onDelete={props.onDelete}
                          onMoveCategory={props.onMoveCategory}
                          onChangeSemester={props.onChangeSemester}
                          onSetFailed={props.onSetFailed}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {yearNumbers.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <p>{dict.planner.semester.emptyDescription}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={props.onOpenSemesterManagement}
                >
                  {dict.planner.remake.manageSemesters}
                </Button>
              </div>
            )}
          </div>
        </div>
        {renderPendingRail(false)}
      </div>
    </div>
  );
}
