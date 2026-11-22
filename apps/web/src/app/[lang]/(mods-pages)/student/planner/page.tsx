import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  CircleHelp,
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
import { PlannerSetupWizard } from "./components/setup/planner-setup-wizard";
import { PlannerTour } from "./components/setup/planner-tour";
import { TimetableImportDialog } from "./components/setup/timetable-import-dialog";

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
    <div
      data-tour="progress"
      className="border-b border-border px-4 py-2 md:px-6"
    >
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
          <span className="ml-auto text-xs font-medium text-red-500">
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
  onStartSetup,
}: {
  onImportTemplate: () => void;
  onOpenAddCourse: () => void;
  onStartSetup: () => void;
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
          <Button type="button" variant="outline" onClick={onStartSetup}>
            {t.startSetup}
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
  const [timetableImportOpen, setTimetableImportOpen] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [setupPreferenceReady, setSetupPreferenceReady] = useState(false);
  const [plannerDataReady, setPlannerDataReady] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourPending, setTourPending] = useState(false);
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
    try {
      setSetupDismissed(
        window.localStorage.getItem("planner:setup-dismissed") === "true",
      );
    } catch {
      setSetupDismissed(false);
    }
    setSetupPreferenceReady(true);
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
      if (
        !nextFolders.some((folder) => folder.id === "_unsorted") &&
        nextFolders.some((folder) => folder.id !== "planner-1")
      ) {
        void ensureUnsortedFolder(foldersCol);
      }
    });
    const coursesSubscription = coursesCol.find().$.subscribe((courses) => {
      setCourseData(courses.map((course) => course.toMutableJSON()));
      if (courses.length > 0) void ensureUnsortedFolder(foldersCol);
    });
    const semestersSubscription = semestersCol
      .find()
      .$.subscribe((semesters) => {
        setSemesterData(semesters.map((semester) => semester.toMutableJSON()));
      });
    const plannerSubscription = plannerCol.find().$.subscribe((planners) => {
      const planner = planners[0]?.toMutableJSON() ?? null;
      setPlannerInfo(planner);
    });

    setPlannerDataReady(true);

    return () => {
      foldersSubscription.unsubscribe();
      coursesSubscription.unsubscribe();
      semestersSubscription.unsubscribe();
      plannerSubscription.unsubscribe();
    };
  }, [coursesCol, foldersCol, plannerCol, semestersCol]);

  const dismissSetup = useCallback(() => {
    setSetupDismissed(true);
    try {
      window.localStorage.setItem("planner:setup-dismissed", "true");
    } catch {
      // The dismissed state is kept for this page session.
    }
  }, []);

  const finishSetup = useCallback((nextView: PlannerView) => {
    setView(nextView);
    setSetupDismissed(true);
    let tourWasCompleted = false;
    try {
      window.localStorage.setItem("planner:setup-dismissed", "true");
      tourWasCompleted =
        window.localStorage.getItem("planner:tour-done") === "true";
    } catch {
      // Continue with the in-memory setup and tour state.
    }
    if (!tourWasCompleted) setTourPending(true);
  }, []);

  useEffect(() => {
    if (!tourPending || !plannerInfo) return;
    const frame = window.requestAnimationFrame(() => {
      setTourPending(false);
      setTourActive(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [courseData, folderData, plannerInfo, tourPending]);

  const finishTour = useCallback(() => {
    setTourActive(false);
    try {
      window.localStorage.setItem("planner:tour-done", "true");
    } catch {
      // The tour remains dismissible for this page session.
    }
  }, []);

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
  const showSetupWizard =
    plannerDataReady &&
    setupPreferenceReady &&
    hasEmptyPlanner &&
    !setupDismissed;

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
  const scrollToPendingTarget = (kind: "unscheduled" | "unsorted") => {
    setPendingOnly(true);
    if (view === "matrix" && kind === "unscheduled") {
      const matrix = document.getElementById("planner-matrix-scroll");
      matrix?.scrollTo({ left: matrix.scrollWidth, behavior: "smooth" });
      return;
    }

    const isWideBoard = window.matchMedia("(min-width: 1024px)").matches;
    const targetId =
      view === "checklist"
        ? kind === "unscheduled"
          ? "planner-unscheduled"
          : "planner-unsorted"
        : view === "matrix"
          ? "planner-unsorted"
          : kind === "unscheduled"
            ? isWideBoard
              ? "planner-unscheduled"
              : "planner-unscheduled-mobile"
            : "planner-unsorted";
    requestAnimationFrame(() => {
      const target =
        document.getElementById(targetId) ??
        (view === "board"
          ? document.getElementById(
              isWideBoard
                ? "planner-unscheduled"
                : "planner-unscheduled-mobile",
            )
          : null);
      target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });
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
  const subtitleParts = [
    plannerInfo?.department,
    plannerInfo?.enrollmentYear
      ? formatPlannerText(t.subtitleEnrollment, {
          enrollmentYear: plannerInfo.enrollmentYear,
        })
      : undefined,
    plannerInfo?.graduationYear
      ? formatPlannerText(t.subtitleGraduation, {
          graduationYear: plannerInfo.graduationYear,
        })
      : undefined,
  ].filter(Boolean);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="-mt-4 flex h-[calc(100vh-var(--header-height))] min-h-0 w-full flex-col overflow-hidden">
        <header
          style={{ display: showSetupWizard ? "none" : undefined }}
          className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-3 md:px-6"
        >
          <div className="flex min-w-0 items-start justify-between gap-2 md:block">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold md:text-xl">
                {plannerInfo?.title || t.titleFallback}
              </h1>
              {subtitleParts.length > 0 && (
                <p className="whitespace-normal text-xs text-muted-foreground sm:text-sm">
                  {subtitleParts.join(` ${t.subtitleSeparator} `)}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 md:hidden"
                  aria-label={t.settingsAriaLabel}
                  title={t.settingsMenu}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTimetableImportOpen(true)}>
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {t.importFromTimetable}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTourActive(true)}>
                  <CircleHelp className="mr-2 h-4 w-4" />
                  {t.useTutorial}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          <div className="flex w-full min-w-0 items-center gap-2 md:w-auto md:flex-nowrap">
            <Tabs
              data-tour="views"
              className="min-w-0 flex-1 md:flex-none"
              value={view}
              onValueChange={(value) => setView(value as PlannerView)}
            >
              <TabsList className="h-10 w-full md:w-auto">
                <TabsTrigger
                  value="checklist"
                  className="h-8 flex-1 gap-1.5 px-2 md:flex-initial md:px-3"
                >
                  <ListChecks className="h-4 w-4" />
                  <span>{t.viewChecklist}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="board"
                  className="h-8 flex-1 gap-1.5 px-2 md:flex-initial md:px-3"
                >
                  <CalendarRange className="h-4 w-4" />
                  <span>{t.viewBoard}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="matrix"
                  className="h-8 flex-1 gap-1.5 px-2 md:flex-initial md:px-3"
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
              className="h-9 shrink-0 px-3 md:h-10"
              onClick={() => openAddCourse()}
              data-tour="add-course"
            >
              <Plus className="h-4 w-4 md:mr-1.5" />
              <span className="md:hidden">{t.addCourseCompact}</span>
              <span className="hidden md:inline">{t.addCourse}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="hidden h-10 w-10 md:inline-flex"
                  aria-label={t.settingsAriaLabel}
                  title={t.settingsMenu}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTimetableImportOpen(true)}>
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {t.importFromTimetable}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTourActive(true)}>
                  <CircleHelp className="mr-2 h-4 w-4" />
                  {t.useTutorial}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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

        {!hasEmptyPlanner && (
          <PlannerProgressStrip
            done={overall.done}
            inProgress={overall.inProgress}
            planned={overall.planned}
            required={overall.required}
            remaining={overall.remaining}
          />
        )}

        {pendingCount > 0 && (
          <div className="shrink-0 px-4 pt-2 md:px-6">
            <div
              data-tour="pending"
              className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap rounded-md bg-muted/40 px-2 py-1.5 text-xs"
            >
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="shrink-0 font-medium text-muted-foreground">
                {formatPlannerText(t.pendingNotice, { count: pendingCount })}
              </span>
              {unscheduledCount > 0 && (
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => scrollToPendingTarget("unscheduled")}
                >
                  {formatPlannerText(t.pendingUnscheduled, {
                    count: unscheduledCount,
                  })}
                </button>
              )}
              {unscheduledCount > 0 && unsortedCount > 0 && (
                <span className="text-muted-foreground/60">
                  {t.subtitleSeparator}
                </span>
              )}
              {unsortedCount > 0 && (
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => scrollToPendingTarget("unsorted")}
                >
                  {formatPlannerText(t.pendingUnsorted, {
                    count: unsortedCount,
                  })}
                </button>
              )}
              {pendingOnly && (
                <button
                  type="button"
                  className="ml-auto shrink-0 font-medium text-primary"
                  onClick={() => setPendingOnly(false)}
                >
                  {t.clearPendingFilter}
                </button>
              )}
            </div>
          </div>
        )}

        <main
          ref={contentRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {showSetupWizard ? (
            <PlannerSetupWizard
              currentSemesterId={normalizedNow}
              onDismiss={dismissSetup}
              onComplete={finishSetup}
            />
          ) : hasEmptyPlanner ? (
            <EmptyPlanner
              onImportTemplate={() => setFolderManagementOpen(true)}
              onOpenAddCourse={() => openAddCourse()}
              onStartSetup={() => {
                setSetupDismissed(false);
                try {
                  window.localStorage.removeItem("planner:setup-dismissed");
                } catch {
                  // The wizard can still open for this page session.
                }
              }}
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
        <TimetableImportDialog
          open={timetableImportOpen}
          onOpenChange={setTimetableImportOpen}
          planner={plannerInfo}
          folders={folderData}
          items={courseData}
          currentSemesterId={normalizedNow}
        />
        <PlannerTour
          open={tourActive}
          showProgress={!hasEmptyPlanner}
          showPending={pendingCount > 0}
          onDone={finishTour}
        />
      </div>
    </DndContext>
  );
}

export default GraduationPlanner;
