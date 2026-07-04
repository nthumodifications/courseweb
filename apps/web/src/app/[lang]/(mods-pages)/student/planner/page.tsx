import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { v4 as uuidv4 } from "uuid";
import { useRxCollection } from "rxdb-hooks";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import useDictionary from "@/dictionaries/useDictionary";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { FolderTree, BookOpen, CalendarDays } from "lucide-react";

// Import data functions
import { ensureUnsortedFolder, getFolders } from "./data/folders";
import {
  updateCourseItem,
  updateCourseStatus,
  updateCourseSemester,
} from "./data/courses";
import { getSemesters } from "./data/semesters";
import {
  getPlannerData,
  calculateCompletedCredits,
  calculateInProgressCredits,
  calculatePlannedCredits,
  calculateProgressPercentage,
} from "./data/planner";

// Import types
import {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "./rxdb";
import { CourseStatus } from "./types";
import { MinimalCourse } from "@/types/courses";

// Import components
import { FolderNavigation } from "./components/sidebar/folder-navigation";
import { CourseList } from "./components/course-list";
import { CourseListHeader } from "./components/course-list/course-list-header";
import { CourseListEmpty } from "./components/course-list/course-list-empty";
import { SemesterHeader } from "./components/semester/semester-header";
import { SemesterPlanning } from "./SemesterPlanning";
import { FolderManagement } from "./folder-management";
import { SemesterManagement } from "./semester-management";
import { PlannerSettings } from "./planner-settings";
import { CourseDetailsDialog } from "./components/dialogs/course-details-dialog";
import { CourseEditDialog } from "./components/dialogs/course-edit-dialog";
import { BulkActionsMenu } from "./components/bulk-actions/bulk-actions-menu";
import { CourseSearchDialog } from "./components/dialogs/course-search-dialog";
import { CreateCourseDialog } from "./components/dialogs/create-course-dialog";

function GraduationPlanner() {
  const dict = useDictionary();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileView, setMobileView] = useState<
    "folders" | "courses" | "semester"
  >("folders");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");

  const [folderData, setFolderData] = useState<FolderDocType[]>([]);
  const [courseData, setCourseData] = useState<ItemDocType[]>([]);
  const [semesterData, setSemesterData] = useState<SemesterDocType[]>([]);
  const [plannerInfo, setPlannerInfo] = useState<PlannerDataDocType | null>(
    null,
  );
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  const [currentSemester, setCurrentSemester] = useState<string>();
  const [selectedCourse, setSelectedCourse] = useState<ItemDocType | null>(
    null,
  );
  const [selectedFolder, setSelectedFolder] = useState<string>();
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [createCourseOpen, setCreateCourseOpen] = useState(false);

  // Management dialogs
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [semesterManagementOpen, setSemesterManagementOpen] = useState(false);
  const [plannerSettingsOpen, setPlannerSettingsOpen] = useState(false);

  // Progress stats
  const [completedCredits, setCompletedCredits] = useState(0);
  const [inProgressCredits, setInProgressCredits] = useState(0);
  const [plannedCredits, setPlannedCredits] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Multi-selection
  const [selectedCourses, setSelectedCourses] = useState<
    Record<string, boolean>
  >({});
  const [lastSelectedCourseUuid, setLastSelectedCourseUuid] = useState<
    string | null
  >(null);

  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  // RxDB collections
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const coursesCol = useRxCollection<ItemDocType>("items");
  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semestersCol = useRxCollection<SemesterDocType>("semesters");

  useEffect(() => {
    if (!coursesCol) return;
    if (!plannerCol) return;

    const updatePlannerStats = async () => {
      // recalculate progress when courses change
      const courseData = await coursesCol!.find().exec();
      const completed = await calculateCompletedCredits(courseData);
      const inProgress = await calculateInProgressCredits(courseData);
      const planned = await calculatePlannedCredits(courseData);
      const percentage = await calculateProgressPercentage(
        plannerCol!,
        completed,
      );
      setCompletedCredits(completed);
      setInProgressCredits(inProgress);
      setPlannedCredits(planned);
      setProgressPercentage(percentage);
    };
    updatePlannerStats();
    const unsub = coursesCol?.$.subscribe(updatePlannerStats);
    return () => {
      unsub?.unsubscribe();
    };
  }, [coursesCol, plannerCol]);

  // Load initial data
  useEffect(() => {
    if (!foldersCol || !coursesCol || !plannerCol || !semestersCol) return;

    // Set up subscriptions to collections
    const foldersSub = foldersCol.find().$.subscribe(async (folders) => {
      await ensureUnsortedFolder(foldersCol);
      const folderData = folders.map((doc) => doc.toMutableJSON());
      setFolderData(folderData);

      // Initialize expanded folders if needed
      const expanded: Record<string, boolean> = {};
      folderData.forEach((folder) => {
        // Preserve existing expansion state or use folder's default
        expanded[folder.id] =
          expandedFolders[folder.id] !== undefined
            ? expandedFolders[folder.id]
            : folder.expanded || false;
      });
      setExpandedFolders(expanded);
    });

    const coursesSub = coursesCol.find().$.subscribe(async (courses) => {
      const courseData = courses.map((doc) => doc.toMutableJSON());
      setCourseData(courseData);
    });

    const semestersSub = semestersCol.find().$.subscribe((semesters) => {
      setSemesterData(semesters.map((doc) => doc.toMutableJSON()));
    });

    const plannerSub = plannerCol.find().$.subscribe(async (planners) => {
      const planner = planners.length > 0 ? planners[0].toMutableJSON() : null;
      if (planner == null) {
        setPlannerSettingsOpen(true);
      }
      setPlannerInfo(planner);
    });

    // Clean up subscriptions when component unmounts
    return () => {
      foldersSub.unsubscribe();
      coursesSub.unsubscribe();
      semestersSub.unsubscribe();
      plannerSub.unsubscribe();
    };
  }, [foldersCol, coursesCol, plannerCol, semestersCol]);

  // Toggle folder expansion (local UI state only — not persisted)
  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Get child folders
  const getChildFoldersFromState = (parentId: string | null) => {
    return folderData
      .filter((folder) => folder.parent === parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Filter courses by folder
  const getCoursesByFolder = (folderId: string | undefined) => {
    if (!folderId) return [];
    // Get direct courses in this folder
    let courses = courseData.filter((course) => course.parent === folderId);

    // If this is a parent folder, also include courses from child folders
    const childFolders = getChildFoldersFromState(folderId);
    if (childFolders.length > 0) {
      childFolders.forEach((childFolder) => {
        courses = [...courses, ...getCoursesByFolder(childFolder.id)];
      });
    }

    return courses;
  };

  // Filter courses by folder, then further by the selected status filter
  const getFilteredCoursesByFolder = (folderId: string | undefined) => {
    const courses = getCoursesByFolder(folderId);
    if (statusFilter === "all") return courses;
    return courses.filter((course) => course.status === statusFilter);
  };

  // Get courses by semester
  const getCoursesBySemester = (semester: string) => {
    return courseData.filter((course) => course.semester === semester);
  };

  // Calculate total credits by semester
  const getTotalCreditsBySemester = (semester: string) => {
    return getCoursesBySemester(semester).reduce(
      (total, course) => total + course.credits,
      0,
    );
  };

  // Calculate folder completion
  const getFolderCompletion = (folderId: string) => {
    const folder = folderData.find((f) => f.id === folderId);
    if (!folder) return { completed: 0, inProgress: 0, pending: 0, total: 0 };

    // Get courses in this folder and child folders
    const folderCourses = getCoursesByFolder(folderId);

    // Track both counts and credits in a single pass
    const stats = folderCourses.reduce(
      (acc, course) => {
        // Increment the count for the appropriate status
        if (!course.status) return acc;

        // Type-safe access with type assertion
        const status = course.status as CourseStatus;

        // Use a type-safe mapping
        if (status === "completed") {
          acc.counts.completed += 1;
          acc.credits.completed += course.credits;
        } else if (status === "in-progress") {
          acc.counts["in-progress"] += 1;
          acc.credits["in-progress"] += course.credits;
        } else if (status === "planned") {
          acc.counts.planned += 1;
          acc.credits.planned += course.credits;
        }

        return acc;
      },
      {
        counts: { completed: 0, "in-progress": 0, planned: 0 },
        credits: { completed: 0, "in-progress": 0, planned: 0 },
      },
    );

    // Based on folder metric, return the appropriate values
    const useCredits = folder.metric === "credits";
    const values = useCredits ? stats.credits : stats.counts;

    // The denominator should reflect the actual target: `max` when a max
    // requirement is configured, otherwise `min`. A target of 0 means "no
    // requirement configured" — callers must treat that as "not applicable",
    // not "already complete".
    const total = folder.max && folder.max > 0 ? folder.max : folder.min;

    return {
      completed: values["completed"],
      inProgress: values["in-progress"],
      pending: values["planned"],
      total,
    };
  };

  // Update course status
  const handleUpdateCourseStatus = async (
    uuid: string,
    newStatus: CourseStatus,
  ) => {
    const updatedCourse = await updateCourseStatus(
      coursesCol!,
      uuid,
      newStatus,
    );
  };

  // Update course semester
  const handleUpdateCourseSemester = async (
    uuid: string,
    newSemester: string | undefined,
  ) => {
    await updateCourseSemester(coursesCol!, uuid, newSemester);
  };

  // Update course
  const handleUpdateCourse = async (updatedCourse: ItemDocType) => {
    const result = await updateCourseItem(coursesCol!, updatedCourse);
    setEditCourseOpen(false);
  };

  // Handle course selection
  const handleCourseSelect = (uuid: string, isShiftKey: boolean) => {
    if (isShiftKey && lastSelectedCourseUuid) {
      // Get all courses in the current view
      const currentCourses = selectedFolder
        ? getCoursesByFolder(selectedFolder)
        : courseData;

      // Find indices of the last selected and current course
      const lastIndex = currentCourses.findIndex(
        (course) => course.uuid === lastSelectedCourseUuid,
      );
      const currentIndex = currentCourses.findIndex(
        (course) => course.uuid === uuid,
      );

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Determine start and end indices
        const startIdx = Math.min(lastIndex, currentIndex);
        const endIdx = Math.max(lastIndex, currentIndex);

        // Select all courses between start and end
        const newSelectedCourses = { ...selectedCourses };
        for (let i = startIdx; i <= endIdx; i++) {
          newSelectedCourses[currentCourses[i].uuid] = true;
        }
        setSelectedCourses(newSelectedCourses);
      }
    } else {
      // Toggle selection for a single course
      setSelectedCourses((prev) => {
        const newSelection = { ...prev };
        if (newSelection[uuid]) {
          delete newSelection[uuid];
        } else {
          newSelection[uuid] = true;
        }
        return newSelection;
      });
    }

    // Update last selected course
    setLastSelectedCourseUuid(uuid);
  };

  // Data update handlers
  const handleFoldersUpdated = async () => {
    const updatedFolders = await getFolders(foldersCol!);
    setFolderData(updatedFolders);
  };

  const handleSemestersUpdated = async () => {
    const updatedSemesters = await getSemesters(semestersCol!);
    setSemesterData(updatedSemesters);
  };

  const handlePlannerUpdated = async () => {
    const updatedPlanner = await getPlannerData(plannerCol!);
    setPlannerInfo(updatedPlanner ?? null);
  };

  // Course operations
  const handleCourseAdded = async (
    newCourse: MinimalCourse,
    keepSemester?: boolean,
  ) => {
    const order =
      courseData.length > 0
        ? Math.max(...courseData.map((c) => c.order)) + 1
        : 0;

    const course = await coursesCol!.insert({
      uuid: uuidv4(),
      id: newCourse.raw_id.slice(5),
      raw_id: newCourse.raw_id,
      title: newCourse.name_zh,
      credits: newCourse.credits,
      parent: selectedFolder || "planner-1",
      status: "planned",
      order: order,
      dependson: [],
      semester: keepSemester ? newCourse.semester : undefined,
    });
  };

  const handleCourseRemoved = async (course: MinimalCourse) => {
    const courseToRemove = await coursesCol!
      .findOne({ selector: { raw_id: course.raw_id } })
      .exec();

    if (courseToRemove) {
      await courseToRemove.remove();
    } else {
      // course not found by raw_id, find by name
      const courseToRemoveByName = await coursesCol!
        .findOne({ selector: { title: course.name_zh } })
        .exec();

      if (courseToRemoveByName) {
        await courseToRemoveByName.remove();
      } else {
        console.error("Course not found for removal");
      }
    }
  };

  const handleItemRemove = async (item: ItemDocType) => {
    const courseToRemove = await coursesCol!
      .findOne({ selector: { uuid: item.uuid } })
      .exec();

    if (courseToRemove) {
      await courseToRemove.remove();
    }
  };

  // Handle manual course creation
  const handleCreateCourse = async (newCourse: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string;
    order: number;
    dependson: string[];
  }): Promise<void> => {
    const order =
      courseData.length > 0
        ? Math.max(...courseData.map((c) => c.order)) + 1
        : 0;

    const courseToInsert = {
      ...newCourse,
      order,
    };

    try {
      await coursesCol!.insert(courseToInsert);
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  // Clear selections
  const clearSelections = () => {
    setSelectedCourses({});
  };

  // Get selected course count
  const getSelectedCount = () => Object.keys(selectedCourses).length;

  // Whether the bulk action menu should be visible - derived directly from
  // selection state during render rather than mirrored into its own state.
  const showBulkMenu = getSelectedCount() > 0;

  // Bulk actions
  const handleBulkStatusChange = async (status: CourseStatus) => {
    const selectedIds = Object.keys(selectedCourses);
    for (const courseId of selectedIds) {
      await handleUpdateCourseStatus(courseId, status);
    }
    clearSelections();
  };

  const handleBulkSemesterChange = async (semesterId: string) => {
    const selectedIds = Object.keys(selectedCourses);
    for (const courseId of selectedIds) {
      await handleUpdateCourseSemester(courseId, semesterId);
    }
    clearSelections();
  };

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(selectedCourses);
    for (const courseId of selectedIds) {
      const courseToDelete = courseData.find((c) => c.uuid === courseId);
      if (courseToDelete) {
        await handleItemRemove(courseToDelete);
      }
    }
    clearSelections();
  };

  // Get all leaf folders (folders with no children)
  const getLeafFolders = () => {
    const folderWithChildren = new Set(
      folderData.map((folder) => folder.parent).filter(Boolean),
    );
    return folderData.filter((folder) => !folderWithChildren.has(folder.id));
  };

  // Determine empty state type
  const getEmptyStateType = () => {
    if (!selectedFolder) return "noFolderSelected";

    const childFolders = getChildFoldersFromState(selectedFolder);
    if (
      childFolders.length > 0 &&
      getCoursesByFolder(selectedFolder).length === 0
    ) {
      return "hasChildFolders";
    }

    if (
      childFolders.length === 0 &&
      getCoursesByFolder(selectedFolder).length === 0
    ) {
      return "noCoursesInFolder";
    }

    return null;
  };

  // dnd-kit drag end handler - single source of truth for all drag
  // interactions across the folder sidebar, course list, and semester pane.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // Dropped outside any valid target - explicit no-op, nothing is
    // unscheduled or deleted (unlike the old HTML5 dropEffect check).
    if (!over) return;

    const activeData = active.data.current as
      | { type?: string; course?: ItemDocType }
      | undefined;
    const overData = over.data.current as
      | { type?: string; semesterId?: string; folderId?: string }
      | undefined;

    if (activeData?.type !== "course" || !activeData.course) return;

    if (overData?.type === "semester" && overData.semesterId !== undefined) {
      handleUpdateCourseSemester(activeData.course.uuid, overData.semesterId);
    } else if (overData?.type === "folder" && overData.folderId !== undefined) {
      updateCourseItem(coursesCol!, {
        ...activeData.course,
        parent: overData.folderId,
      });
    }
  };

  const showFolders = isDesktop || mobileView === "folders";
  const showCourses = isDesktop || mobileView === "courses";
  const showSemester = isDesktop || mobileView === "semester";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex overflow-hidden -mt-4 md:-mb-0 md:-ml-2 h-[calc(100vh-var(--header-height))]">
        {/* Left Sidebar - Folder Navigation */}
        {showFolders && (
          <FolderNavigation
            plannerInfo={plannerInfo}
            completedCredits={completedCredits}
            inProgressCredits={inProgressCredits}
            plannedCredits={plannedCredits}
            progressPercentage={progressPercentage}
            folderData={folderData}
            courseData={courseData}
            expandedFolders={expandedFolders}
            selectedFolder={selectedFolder}
            onToggleFolder={handleToggleFolder}
            onSelectFolder={setSelectedFolder}
            getFolderCompletion={getFolderCompletion}
            getChildFolders={getChildFoldersFromState}
            onOpenFolderManagement={() => setFolderManagementOpen(true)}
            onOpenPlannerSettings={() => setPlannerSettingsOpen(true)}
          />
        )}

        {/* Middle Pane - Course List */}
        {showCourses && (
          <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col min-h-0 lg:border-r lg:border-border">
            <CourseListHeader
              selectedFolder={selectedFolder}
              folderData={folderData}
              courseCount={
                selectedFolder ? getCoursesByFolder(selectedFolder).length : 0
              }
              hasChildren={
                selectedFolder
                  ? getChildFoldersFromState(selectedFolder).length > 0
                  : false
              }
              onOpenCourseSearch={() => setCourseSearchOpen(true)}
              createCourseOpen={createCourseOpen}
              setCreateCourseOpen={setCreateCourseOpen}
              onCreateCourse={handleCreateCourse}
            />

            <Tabs
              value={viewMode}
              className="flex-1 flex flex-col min-h-0"
              onValueChange={(value) => setViewMode(value as "list" | "grid")}
            >
              <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
                <TabsList className="border-border">
                  <TabsTrigger value="list">
                    {dict.planner.courseList.viewModeList}
                  </TabsTrigger>
                  <TabsTrigger value="grid">
                    {dict.planner.courseList.viewModeGrid}
                  </TabsTrigger>
                </TabsList>

                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as CourseStatus | "all")
                  }
                >
                  <SelectTrigger className="w-[180px] border-border">
                    <SelectValue
                      placeholder={dict.planner.courseList.statusFilterLabel}
                    />
                  </SelectTrigger>
                  <SelectContent className="border-border">
                    <SelectItem value="all">
                      {dict.planner.courseList.statusFilterAll}
                    </SelectItem>
                    <SelectItem value="completed">
                      {dict.planner.status.completed}
                    </SelectItem>
                    <SelectItem value="in-progress">
                      {dict.planner.status.inProgress}
                    </SelectItem>
                    <SelectItem value="planned">
                      {dict.planner.status.planned}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Empty States */}
              {getEmptyStateType() && (
                <CourseListEmpty
                  type={getEmptyStateType() as any}
                  courseData={courseData}
                  selectedFolder={selectedFolder}
                  childFolders={
                    selectedFolder
                      ? getChildFoldersFromState(selectedFolder)
                      : []
                  }
                  onSelectFolder={setSelectedFolder}
                  onOpenFolderManagement={() => setFolderManagementOpen(true)}
                  onOpenSemesterManagement={() =>
                    setSemesterManagementOpen(true)
                  }
                  onOpenCourseSearch={() => setCourseSearchOpen(true)}
                  createCourseOpen={createCourseOpen}
                  setCreateCourseOpen={setCreateCourseOpen}
                  onCreateCourse={handleCreateCourse}
                />
              )}

              {/* Course List/Grid */}
              {selectedFolder &&
                getFilteredCoursesByFolder(selectedFolder).length > 0 && (
                  <TabsContent value={viewMode} className="m-0 flex-1 min-h-0">
                    <CourseList
                      viewMode={viewMode}
                      courses={getFilteredCoursesByFolder(selectedFolder)}
                      selectedCourse={selectedCourse}
                      selectedCourses={selectedCourses}
                      folders={folderData}
                      semesters={semesterData}
                      onCourseClick={setSelectedCourse}
                      onCourseSelect={handleCourseSelect}
                      onViewDetails={(course) => {
                        setSelectedCourse(course);
                        setCourseDetailsOpen(true);
                      }}
                      onEdit={(course) => {
                        setSelectedCourse(course);
                        setEditCourseOpen(true);
                      }}
                      onStatusChange={handleUpdateCourseStatus}
                      onSemesterChange={handleUpdateCourseSemester}
                      onDeleteCourse={handleItemRemove}
                    />
                  </TabsContent>
                )}
            </Tabs>
          </div>
        )}

        {/* Right Pane - Semester Planning */}
        {showSemester && (
          <div className="w-full lg:w-96 lg:shrink-0 lg:max-w-[28rem] flex flex-col min-h-0">
            <SemesterHeader
              onOpenSemesterManagement={() => setSemesterManagementOpen(true)}
            />

            <SemesterPlanning
              folders={folderData}
              semesters={semesterData}
              currentSemester={currentSemester}
              setCurrentSemester={setCurrentSemester}
              getCoursesBySemester={getCoursesBySemester}
              getTotalCreditsBySemester={getTotalCreditsBySemester}
              onViewDetails={(course) => {
                setSelectedCourse(course);
                setCourseDetailsOpen(true);
              }}
              onEdit={(course) => {
                setSelectedCourse(course);
                setEditCourseOpen(true);
              }}
              onDelete={handleItemRemove}
              onStatusChange={handleUpdateCourseStatus}
              onSemesterChange={handleUpdateCourseSemester}
              onCreateCourse={handleCreateCourse}
            />
          </div>
        )}

        {/* Mobile/tablet pane switcher - sits directly above the global
            BottomNav (which itself disappears at md/768px). Visible for the
            whole <1024px range required by the responsive spec; the bottom
            offset collapses to 0 once the global nav is gone at md+. */}
        {!isDesktop && (
          <div className="fixed inset-x-0 bottom-[5rem] md:bottom-0 lg:hidden z-40 bg-background border-t border-border grid grid-cols-3">
            <button
              type="button"
              className={`flex flex-col items-center justify-center gap-1 py-2 min-h-[44px] ${
                mobileView === "folders" ? "text-primary" : "text-neutral-400"
              }`}
              onClick={() => setMobileView("folders")}
            >
              <FolderTree className="h-5 w-5" />
              <span className="text-xs font-medium">
                {dict.planner.mobileNav.folders}
              </span>
            </button>
            <button
              type="button"
              className={`flex flex-col items-center justify-center gap-1 py-2 min-h-[44px] ${
                mobileView === "courses" ? "text-primary" : "text-neutral-400"
              }`}
              onClick={() => setMobileView("courses")}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-medium">
                {dict.planner.mobileNav.courses}
              </span>
            </button>
            <button
              type="button"
              className={`flex flex-col items-center justify-center gap-1 py-2 min-h-[44px] ${
                mobileView === "semester" ? "text-primary" : "text-neutral-400"
              }`}
              onClick={() => setMobileView("semester")}
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-medium">
                {dict.planner.mobileNav.semesters}
              </span>
            </button>
          </div>
        )}

        {/* Dialogs */}
        {selectedCourse && (
          <>
            <CourseDetailsDialog
              open={courseDetailsOpen}
              onOpenChange={setCourseDetailsOpen}
              selectedCourse={selectedCourse}
              folderData={folderData}
              semesterData={semesterData}
              onEdit={() => {
                setCourseDetailsOpen(false);
                setEditCourseOpen(true);
              }}
            />

            <CourseEditDialog
              open={editCourseOpen}
              onOpenChange={setEditCourseOpen}
              selectedCourse={selectedCourse}
              semesterData={semesterData}
              leafFolders={getLeafFolders()}
              onSave={handleUpdateCourse}
            />
          </>
        )}

        {/* Course Search Dialog */}
        <CourseSearchDialog
          open={courseSearchOpen}
          onOpenChange={setCourseSearchOpen}
          selectedFolder={selectedFolder}
          folderData={folderData}
          onAddCourse={handleCourseAdded}
          onRemoveCourse={handleCourseRemoved}
          courseData={courseData}
        />

        {/* Management Dialogs */}
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

        {/* Bulk Action Menu */}
        {showBulkMenu && (
          <BulkActionsMenu
            selectedCount={getSelectedCount()}
            semesterData={semesterData}
            onStatusChange={handleBulkStatusChange}
            onSemesterChange={handleBulkSemesterChange}
            onDelete={handleBulkDelete}
            onClearSelections={clearSelections}
          />
        )}
      </div>
    </DndContext>
  );
}

export default GraduationPlanner;
