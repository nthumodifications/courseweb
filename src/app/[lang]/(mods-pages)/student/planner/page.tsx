"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import { useRxCollection } from "rxdb-hooks";
import { useRouter } from "next/navigation";

// Import data functions
import {
  ensureUnsortedFolder,
  getFolders,
  toggleFolderExpansion,
} from "./data/folders";
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
} from "@/config/rxdb";
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
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const router = useRouter();

  // RxDB collections
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const coursesCol = useRxCollection<ItemDocType>("items");
  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semestersCol = useRxCollection<SemesterDocType>("semesters");

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

      // Recalculate progress when courses change
      const completed = await calculateCompletedCredits(courseData);
      const inProgress = await calculateInProgressCredits(courseData);
      const planned = await calculatePlannedCredits(courseData);

      setCompletedCredits(completed);
      setInProgressCredits(inProgress);
      setPlannedCredits(planned);

      if (plannerCol) {
        const percentage = await calculateProgressPercentage(
          plannerCol,
          completed,
        );
        setProgressPercentage(percentage);
      }
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

  // Toggle folder expansion
  const handleToggleFolder = async (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));

    await toggleFolderExpansion(foldersCol!, folderId);
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

    console.log(folderId, folderCourses);

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

    return {
      completed: values["completed"],
      inProgress: values["in-progress"],
      pending: values["planned"],
      total: folder.min,
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
    if (updatedCourse) {
      // Recalculate progress
      const updatedCourses = courseData.map((course) =>
        course.uuid === uuid ? { ...course, status: newStatus } : course,
      );
      const completed = await calculateCompletedCredits(updatedCourses);
      const inProgress = await calculateInProgressCredits(updatedCourses);
      const planned = await calculatePlannedCredits(updatedCourses);

      setCompletedCredits(completed);
      setInProgressCredits(inProgress);
      setPlannedCredits(planned);

      setProgressPercentage(
        await calculateProgressPercentage(plannerCol!, completed),
      );
    }
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

    // Recalculate progress if status changed
    if (selectedCourse && selectedCourse.status !== updatedCourse.status) {
      const updatedCourses = courseData.map((course) =>
        course.uuid === updatedCourse.uuid ? updatedCourse : course,
      );
      const completed = await calculateCompletedCredits(updatedCourses);
      const inProgress = await calculateInProgressCredits(updatedCourses);
      const planned = await calculatePlannedCredits(updatedCourses);

      setCompletedCredits(completed);
      setInProgressCredits(inProgress);
      setPlannedCredits(planned);

      setProgressPercentage(
        await calculateProgressPercentage(plannerCol!, completed),
      );
    }
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
    setShowBulkMenu(false);
  };

  // Get selected course count
  const getSelectedCount = () => Object.keys(selectedCourses).length;

  // Effect to show/hide bulk menu based on selections
  useEffect(() => {
    setShowBulkMenu(getSelectedCount() > 0);
  }, [selectedCourses]);

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Folder Navigation */}
      <FolderNavigation
        plannerInfo={plannerInfo}
        completedCredits={completedCredits}
        inProgressCredits={inProgressCredits}
        plannedCredits={plannedCredits}
        progressPercentage={progressPercentage}
        folderData={folderData}
        expandedFolders={expandedFolders}
        selectedFolder={selectedFolder}
        onToggleFolder={handleToggleFolder}
        onSelectFolder={setSelectedFolder}
        getFolderCompletion={getFolderCompletion}
        getChildFolders={getChildFoldersFromState}
        onOpenFolderManagement={() => setFolderManagementOpen(true)}
        onOpenPlannerSettings={() => setPlannerSettingsOpen(true)}
      />

      {/* Middle Pane - Course List */}
      <div className="flex-1 flex flex-col border-r border-border">
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

        <div className="p-2 border-b border-border flex items-center justify-between">
          <Tabs
            defaultValue={viewMode}
            className="w-full"
            onValueChange={(value) => setViewMode(value as "list" | "grid")}
          >
            <div className="flex justify-between items-center">
              <TabsList className="border-border">
                <TabsTrigger value="list">列表</TabsTrigger>
                <TabsTrigger value="grid">網格</TabsTrigger>
              </TabsList>

              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] border-border">
                  <SelectValue placeholder="課程狀態" />
                </SelectTrigger>
                <SelectContent className="border-border">
                  <SelectItem value="all">全部課程</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="planned">計劃中</SelectItem>
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
                  selectedFolder ? getChildFoldersFromState(selectedFolder) : []
                }
                onSelectFolder={setSelectedFolder}
                onOpenFolderManagement={() => setFolderManagementOpen(true)}
                onOpenSemesterManagement={() => setSemesterManagementOpen(true)}
                onOpenCourseSearch={() => setCourseSearchOpen(true)}
                createCourseOpen={createCourseOpen}
                setCreateCourseOpen={setCreateCourseOpen}
                onCreateCourse={handleCreateCourse}
              />
            )}

            {/* Course List/Grid */}
            {selectedFolder &&
              getCoursesByFolder(selectedFolder).length > 0 && (
                <TabsContent value={viewMode} className="m-0">
                  <CourseList
                    viewMode={viewMode}
                    courses={getCoursesByFolder(selectedFolder)}
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
      </div>

      {/* Right Pane - Semester Planning */}
      <div className="w-96 flex flex-col">
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
        />
      </div>

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
  );
}

export default GraduationPlanner;
