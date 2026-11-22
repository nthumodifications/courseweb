import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@courseweb/ui";
import { v4 as uuidv4 } from "uuid";
import { useRxCollection } from "rxdb-hooks";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  CalendarRange,
  FolderCog,
  Grid2X2,
  ListChecks,
  Plus,
  Settings2,
  TriangleAlert,
  FileText,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useDefaultSemesterId } from "@/hooks/useSemesters";
import { toPrettySemester } from "@/helpers/semester";
import type { CourseSyllabusView } from "@/config/supabase";
import type { CourseStatus } from "./types";
import {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "./rxdb";
import { ensureUnsortedFolder, getFolders } from "./data/folders";
import { getSemesters } from "./data/semesters";
import { getPlannerData } from "./data/planner";
import { updateCourseItem, updateCourseSemester } from "./data/courses";
import {
  effectiveStatus,
  deriveFolderProgress,
  deriveOverallProgress,
} from "./lib/progress";
import { formatPlannerText } from "./components/remake/shared";
import { ChecklistView } from "./components/remake/checklist-view";
import { SemesterBoardView } from "./components/remake/semester-board-view";
import { MatrixView } from "./components/remake/matrix-view";
import { FolderManagement } from "./folder-management";
import { SemesterManagement } from "./semester-management";
import { PlannerSettings } from "./planner-settings";
import { CourseDetailsDialog } from "./components/dialogs/course-details-dialog";
import { CourseEditDialog } from "./components/dialogs/course-edit-dialog";
import { PlannerAddCourseDialog } from "./components/dialogs/planner-add-course-dialog";

type PlannerView = "checklist" | "board" | "matrix";

const normalizeTermId = (id: string) => {
  const match = id.match(/^(\d{3})-([1-3])$/);
  return match ? `${match[1]}${match[2]}0` : id;
};

function PlannerProgressStrip({
  done,
  inProgress,
  planned,
  required,
  remaining,
}: {
  done: number;
  inProgress: number;
  planned: number;
  required: number;
  remaining: number;
}) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const percentage = (value: number) =>
    required > 0 ? Math.min(100, Math.max(0, (value / required) * 100)) : 0;

  return (
    <div className="border-b border-border px-4 py-2 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 text-sm font-bold">
          {formatPlannerText(t.requiredProgress, { done, required })}
        </span>
        <div
          className="flex h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={formatPlannerText(t.requiredProgress, { done, required })}
        >
          <span
            className="h-full bg-primary"
            style={{ width: `${percentage(done)}%` }}
          />
          <span
            className="h-full bg-primary/55"
            style={{ width: `${percentage(inProgress)}%` }}
          />
          <span
            className="h-full"
            style={{
              width: `${percentage(planned)}%`,
              backgroundImage:
                "repeating-linear-gradient(135deg, hsl(var(--primary) / .35) 0 4px, transparent 4px 7px)",
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatPlannerText(t.doneLegend, { count: done })}</span>
          <span>
            {formatPlannerText(t.inProgressLegend, { count: inProgress })}
          </span>
          <span>{formatPlannerText(t.plannedLegend, { count: planned })}</span>
        </div>
        {remaining > 0 && (
          <span className="ml-auto text-xs font-medium text-destructive">
            {formatPlannerText(t.remainingPlan, { count: remaining })}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyPlanner({
  onImportTemplate,
  onOpenAddCourse,
}: {
  onImportTemplate: () => void;
  onOpenAddCourse: () => void;
}) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-lg space-y-4 text-center">
        <h2 className="text-xl font-bold">{t.emptyTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.emptyDescription}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={onImportTemplate}>
            <FolderCog className="mr-2 h-4 w-4" />
            {t.importTemplate}
          </Button>
          <Button type="button" onClick={onOpenAddCourse}>
            <Plus className="mr-2 h-4 w-4" />
            {t.addCourse}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GraduationPlanner() {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const currentSemesterId = useDefaultSemesterId();
  const [view, setView] = useState<PlannerView>("checklist");
  const [viewPreferenceReady, setViewPreferenceReady] = useState(false);
  const [folderData, setFolderData] = useState<FolderDocType[]>([]);
  const [courseData, setCourseData] = useState<ItemDocType[]>([]);
  const [semesterData, setSemesterData] = useState<SemesterDocType[]>([]);
  const [plannerInfo, setPlannerInfo] = useState<PlannerDataDocType | null>(
    null,
  );
  const [selectedCourse, setSelectedCourse] = useState<ItemDocType | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addFolderTarget, setAddFolderTarget] = useState<string | undefined>();
  const [addSemesterTarget, setAddSemesterTarget] = useState<
    string | undefined
  >();
  const [pendingOnly, setPendingOnly] = useState(false);
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [semesterManagementOpen, setSemesterManagementOpen] = useState(false);
  const [plannerSettingsOpen, setPlannerSettingsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const foldersCol = useRxCollection<FolderDocType>("folders");
  const coursesCol = useRxCollection<ItemDocType>("items");
  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semestersCol = useRxCollection<SemesterDocType>("semesters");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("planner:view");
      if (stored === "board" || stored === "matrix") setView(stored);
    } catch {
      // Keep the default checklist view when storage is unavailable.
    }
    setViewPreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!viewPreferenceReady) return;
    try {
      window.localStorage.setItem("planner:view", view);
    } catch {
      // Keep the selected view for this page session when storage is unavailable.
    }
  }, [view, viewPreferenceReady]);

  useEffect(() => {
    if (!foldersCol || !coursesCol || !plannerCol || !semestersCol) return;

    const foldersSubscription = foldersCol.find().$.subscribe((folders) => {
      const nextFolders = folders.map((folder) => folder.toMutableJSON());
      setFolderData(nextFolders);
      if (!nextFolders.some((folder) => folder.id === "_unsorted")) {
        void ensureUnsortedFolder(foldersCol);
      }
    });
    const coursesSubscription = coursesCol.find().$.subscribe((courses) => {
      setCourseData(courses.map((course) => course.toMutableJSON()));
    });
    const semestersSubscription = semestersCol
      .find()
      .$.subscribe((semesters) => {
        setSemesterData(semesters.map((semester) => semester.toMutableJSON()));
      });
    const plannerSubscription = plannerCol.find().$.subscribe((planners) => {
      const planner = planners[0]?.toMutableJSON() ?? null;
      setPlannerInfo(planner);
      if (!planner) setPlannerSettingsOpen(true);
    });

    return () => {
      foldersSubscription.unsubscribe();
      coursesSubscription.unsubscribe();
      semestersSubscription.unsubscribe();
      plannerSubscription.unsubscribe();
    };
  }, [coursesCol, foldersCol, plannerCol, semestersCol]);

  const handleFoldersUpdated = async () => {
    if (foldersCol) setFolderData(await getFolders(foldersCol));
  };
  const handleSemestersUpdated = async () => {
    if (semestersCol) setSemesterData(await getSemesters(semestersCol));
  };
  const handlePlannerUpdated = async () => {
    if (plannerCol) setPlannerInfo((await getPlannerData(plannerCol)) ?? null);
  };

  const normalizedNow = normalizeTermId(currentSemesterId);
  const includedTermIds = plannerInfo?.includedSemesters ?? [];
  const termIds = useMemo(() => {
    const actualIdByNormalized = new Map<string, string>();
    for (const semester of semesterData) {
      actualIdByNormalized.set(normalizeTermId(semester.id), semester.id);
    }
    const ordered: string[] = [];
    const seen = new Set<string>();
    const append = (id: string) => {
      const normalized = normalizeTermId(id);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      ordered.push(actualIdByNormalized.get(normalized) ?? normalized);
    };
    for (const id of includedTermIds) append(id);
    for (const semester of [...semesterData].sort((left, right) => {
      const orderDifference =
        (left.order ?? Number.MAX_SAFE_INTEGER) -
        (right.order ?? Number.MAX_SAFE_INTEGER);
      return (
        orderDifference ||
        normalizeTermId(left.id).localeCompare(normalizeTermId(right.id))
      );
    })) {
      append(semester.id);
    }
    return ordered;
  }, [includedTermIds, semesterData]);

  const availableSemesters = useMemo(() => {
    const result = [...semesterData];
    const known = new Set(
      result.map((semester) => normalizeTermId(semester.id)),
    );
    for (const termId of [...termIds, currentSemesterId]) {
      const normalized = normalizeTermId(termId);
      if (known.has(normalized)) continue;
      known.add(normalized);
      result.push({
        id: normalized,
        name: toPrettySemester(normalized),
        status: "planned",
        year: normalized.slice(0, 3),
        term: normalized.slice(3, 4),
        startDate: null,
        endDate: null,
        isActive: true,
        order: null,
      } as SemesterDocType);
    }
    return result.sort((left, right) =>
      normalizeTermId(left.id).localeCompare(normalizeTermId(right.id)),
    );
  }, [currentSemesterId, semesterData, termIds]);

  const requiredCredits = plannerInfo?.requiredCredits ?? 128;
  const overall = deriveOverallProgress(
    courseData,
    normalizedNow,
    requiredCredits,
  );
  const folderProgress = deriveFolderProgress(
    folderData.filter((folder) => folder.id !== "_unsorted"),
    courseData,
    normalizedNow,
  );
  const unscheduledCount = courseData.filter(
    (item) => !item.semester && item.status !== "failed",
  ).length;
  const unsortedCount = courseData.filter(
    (item) => item.parent === "_unsorted",
  ).length;
  const pendingCount = unscheduledCount + unsortedCount;
  const hasEmptyPlanner =
    courseData.length === 0 &&
    !folderData.some(
      (folder) => folder.id !== "planner-1" && folder.id !== "_unsorted",
    );

  const openAddCourse = (folderId?: string, semesterId?: string) => {
    setAddFolderTarget(folderId);
    setAddSemesterTarget(semesterId);
    setAddCourseOpen(true);
  };

  const updateCourse = async (
    item: ItemDocType,
    updates: Partial<ItemDocType>,
  ) => {
    if (!coursesCol) return;
    await updateCourseItem(coursesCol, { ...item, ...updates });
  };

  const handleMoveCategory = (item: ItemDocType, folderId: string) =>
    updateCourse(item, { parent: folderId });
  const handleChangeSemester = (item: ItemDocType, semesterId?: string) =>
    coursesCol
      ? updateCourseSemester(coursesCol, item.uuid, semesterId)
      : Promise.resolve(undefined);
  const handleSetFailed = (item: ItemDocType, failed: boolean) =>
    updateCourse(item, { status: failed ? "failed" : null });
  const handleDelete = async (item: ItemDocType) => {
    const doc = await coursesCol
      ?.findOne({ selector: { uuid: item.uuid } })
      .exec();
    if (doc) await doc.remove();
  };
  const openDetails = (item: ItemDocType) => {
    setSelectedCourse(item);
    setDetailsOpen(true);
  };
  const openEdit = (item: ItemDocType) => {
    setSelectedCourse(item);
    setEditOpen(true);
  };
  const handleCourseSave = async (item: ItemDocType) => {
    await updateCourse(item, { ...item });
    setEditOpen(false);
  };

  const handleAddSearchCourse = async (
    course: CourseSyllabusView,
    folderId: string,
    semesterId?: string,
  ) => {
    if (!coursesCol) return;
    const rawId = course.raw_id ?? "";
    const code = /^\d{5}/.test(rawId)
      ? rawId.slice(5).trim()
      : `${course.department ?? ""} ${course.course ?? ""}${course.class ?? ""}`.trim();
    const title = [course.name_zh, course.name_en].filter(Boolean).join(" ");
    const order = courseData.length
      ? Math.max(...courseData.map((item) => item.order)) + 1
      : 0;
    await coursesCol.insert({
      uuid: uuidv4(),
      id: code,
      raw_id: rawId || null,
      title,
      credits: course.credits ?? 0,
      parent: folderId === "planner-1" ? "_unsorted" : folderId || "_unsorted",
      status: "planned",
      order,
      dependson: [],
      semester: semesterId || undefined,
    });
  };

  const handleCreateCourse = async (course: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
    semester?: string;
  }) => {
    if (!coursesCol) return;
    const order = courseData.length
      ? Math.max(...courseData.map((item) => item.order)) + 1
      : 0;
    await coursesCol.insert({
      ...course,
      order,
      parent:
        course.parent === "planner-1"
          ? "_unsorted"
          : (course.parent ?? "_unsorted"),
      semester: course.semester || undefined,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | { type?: string; course?: ItemDocType }
      | undefined;
    const overData = over.data.current as
      | { type?: string; semesterId?: string }
      | undefined;
    if (
      activeData?.type === "course" &&
      activeData.course &&
      overData?.type === "semester" &&
      overData.semesterId
    ) {
      void updateCourseSemester(
        coursesCol!,
        activeData.course.uuid,
        overData.semesterId,
      );
    }
  };

  const viewProps = {
    folders: folderData,
    items: courseData,
    semesters: availableSemesters,
    now: normalizedNow,
    overall,
    progress: folderProgress,
    pendingOnly,
    onOpenAddCourse: openAddCourse,
    onViewDetails: openDetails,
    onEdit: openEdit,
    onDelete: handleDelete,
    onMoveCategory: handleMoveCategory,
    onChangeSemester: handleChangeSemester,
    onSetFailed: handleSetFailed,
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="-mt-4 flex h-[calc(100vh-var(--header-height))] min-h-0 w-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold md:text-xl">
              {plannerInfo?.title || t.titleFallback}
            </h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {formatPlannerText(t.subtitle, {
                department: plannerInfo?.department ?? "",
                enrollmentYear: plannerInfo?.enrollmentYear ?? "",
                graduationYear: plannerInfo?.graduationYear ?? "",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as PlannerView)}
            >
              <TabsList className="h-10 w-full sm:w-auto">
                <TabsTrigger
                  value="checklist"
                  className="h-8 gap-1.5 px-2 sm:px-3"
                >
                  <ListChecks className="h-4 w-4" />
                  <span>{t.viewChecklist}</span>
                </TabsTrigger>
                <TabsTrigger value="board" className="h-8 gap-1.5 px-2 sm:px-3">
                  <CalendarRange className="h-4 w-4" />
                  <span>{t.viewBoard}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="matrix"
                  className="h-8 gap-1.5 px-2 sm:px-3"
                >
                  <Grid2X2 className="h-4 w-4" />
                  <span>{t.viewMatrix}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden h-10 lg:inline-flex"
              asChild
            >
              <a
                href="https://registra.site.nthu.edu.tw/p/412-1211-1826.php?Lang=zh-tw"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                {dict.planner.sidebar.creditsPdfLink}
              </a>
            </Button>
            <Button
              type="button"
              className="h-10"
              onClick={() => openAddCourse()}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t.addCourse}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  aria-label={t.settingsAriaLabel}
                  title={t.settingsMenu}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFolderManagementOpen(true)}>
                  <FolderCog className="mr-2 h-4 w-4" />
                  {t.manageCategories}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSemesterManagementOpen(true)}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {t.manageSemesters}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlannerSettingsOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  {t.plannerSettings}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <PlannerProgressStrip
          done={overall.done}
          inProgress={overall.inProgress}
          planned={overall.planned}
          required={overall.required}
          remaining={overall.remaining}
        />

        {pendingCount > 0 && (
          <div className="shrink-0 px-4 pt-3 md:px-6">
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left hover:bg-muted"
              onClick={() => {
                setPendingOnly((previous) => !previous);
                contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <TriangleAlert className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">
                {formatPlannerText(t.pendingNotice, { count: pendingCount })}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatPlannerText(t.pendingDescription, {
                  unscheduled: unscheduledCount,
                  unsorted: unsortedCount,
                })}
              </span>
              {pendingOnly && (
                <span className="ml-auto text-xs font-medium text-primary">
                  {t.clearPendingFilter}
                </span>
              )}
            </button>
          </div>
        )}

        <main
          ref={contentRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {hasEmptyPlanner ? (
            <EmptyPlanner
              onImportTemplate={() => setFolderManagementOpen(true)}
              onOpenAddCourse={() => openAddCourse()}
            />
          ) : view === "checklist" ? (
            <ChecklistView {...viewProps} />
          ) : view === "board" ? (
            <SemesterBoardView
              {...viewProps}
              planner={plannerInfo}
              termIds={termIds}
              onOpenSemesterManagement={() => setSemesterManagementOpen(true)}
            />
          ) : (
            <MatrixView {...viewProps} termIds={termIds} />
          )}
        </main>

        <PlannerAddCourseDialog
          open={addCourseOpen}
          onOpenChange={setAddCourseOpen}
          folders={folderData}
          items={courseData}
          semesters={availableSemesters}
          now={normalizedNow}
          initialFolderId={addFolderTarget}
          initialSemesterId={addSemesterTarget}
          onAddCourse={handleAddSearchCourse}
          onCreateCourse={handleCreateCourse}
        />

        {selectedCourse && (
          <>
            <CourseDetailsDialog
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              selectedCourse={selectedCourse}
              folderData={folderData}
              semesterData={availableSemesters}
              displayStatus={effectiveStatus(selectedCourse, normalizedNow)}
              onEdit={() => {
                setDetailsOpen(false);
                setEditOpen(true);
              }}
            />
            <CourseEditDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              selectedCourse={selectedCourse}
              semesterData={availableSemesters}
              leafFolders={folderData.filter(
                (folder) =>
                  folder.id !== "_unsorted" &&
                  !folderData.some(
                    (candidate) => candidate.parent === folder.id,
                  ),
              )}
              onSave={handleCourseSave}
            />
          </>
        )}

        <FolderManagement
          isOpen={folderManagementOpen}
          onClose={() => setFolderManagementOpen(false)}
          onFoldersUpdated={handleFoldersUpdated}
        />
        <SemesterManagement
          isOpen={semesterManagementOpen}
          onClose={() => setSemesterManagementOpen(false)}
          onSemestersUpdated={handleSemestersUpdated}
        />
        <PlannerSettings
          isOpen={plannerSettingsOpen}
          onClose={() => setPlannerSettingsOpen(false)}
          onSettingsUpdated={handlePlannerUpdated}
        />
      </div>
    </DndContext>
  );
}

export default GraduationPlanner;
