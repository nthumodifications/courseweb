"use client";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  GraduationCap,
  Settings,
  Search,
  Filter,
  Check,
  X,
  Users,
  MoreHorizontal,
  FileText,
  Edit,
  Eye,
  Trash2,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  FolderTree,
  CalendarDays,
  Cog,
  SquareCheckBig,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { getFolders, toggleFolderExpansion } from "./data/folders";
import {
  getCourseItems,
  updateCourseItem,
  updateCourseStatus,
  updateCourseSemester,
} from "./data/courses";
import { getSemesters } from "./data/semesters";
import {
  getPlannerData,
  calculateCompletedCredits,
  calculateProgressPercentage,
} from "./data/planner";
import { FolderManagement } from "./folder-management";
import { SemesterManagement } from "./semester-management";
import { PlannerSettings } from "./planner-settings";
import {
  FolderDocType,
  ItemDocType,
  loadDummyData,
  PlannerDataDocType,
  SemesterDocType,
} from "@/config/rxdb";
import { useRxCollection } from "rxdb-hooks";
import { CourseStatus } from "./types";
import { SemesterPlanning } from "./SemesterPlanning";
import CourseSearchContainer from "./course-picker/container";
import { MinimalCourse } from "@/types/courses";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation"; // Add router import

export default function GraduationPlanner() {
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
  const [editCourseForm, setEditCourseForm] = useState<ItemDocType>(); // Add form state
  const router = useRouter(); // Add router instance

  // Management dialogs
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [semesterManagementOpen, setSemesterManagementOpen] = useState(false);
  const [plannerSettingsOpen, setPlannerSettingsOpen] = useState(false);

  // Progress stats
  const [completedCredits, setCompletedCredits] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  const foldersCol = useRxCollection<FolderDocType>("folders");
  const coursesCol = useRxCollection<ItemDocType>("items");
  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semestersCol = useRxCollection<SemesterDocType>("semesters");

  const [selectedCourses, setSelectedCourses] = useState<
    Record<string, boolean>
  >({});
  const [lastSelectedCourseUuid, setLastSelectedCourseUuid] = useState<
    string | null
  >(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!foldersCol || !coursesCol || !plannerCol || !semestersCol) return;

    // Set up subscriptions to collections
    const foldersSub = foldersCol.find().$.subscribe(async (folders) => {
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
      setCompletedCredits(completed);
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
  const toggleFolder = async (folderId: string) => {
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

  // Update course status
  const handleUpdateCourseStatus = async (
    uuid: string,
    newStatus: CourseStatus,
  ) => {
    // TODO: write to db
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
      setCompletedCredits(completed);
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
    const updatedCourse = await updateCourseSemester(
      coursesCol!,
      uuid,
      newSemester,
    );
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
      setCompletedCredits(completed);
      setProgressPercentage(
        await calculateProgressPercentage(plannerCol!, completed),
      );
    }
  };

  // Calculate folder completion
  const getFolderCompletion = (folderId: string) => {
    const folder = folderData.find((f) => f.id === folderId);
    if (!folder) return { completed: 0, inProgress: 0, total: 0 };

    // Get courses in this folder and child folders
    const folderCourses = getCoursesByFolder(folderId);

    // Calculate completed credits/courses
    let completed = 0;
    if (folder.metric === "credits") {
      completed = folderCourses
        .filter((course) => course.status === "completed")
        .reduce((sum, course) => sum + course.credits, 0);
    } else {
      completed = folderCourses.filter(
        (course) => course.status === "completed",
      ).length;
    }

    // Calculate inprogress credits/courses
    let inProgress = 0;
    if (folder.metric === "credits") {
      inProgress = folderCourses
        .filter((course) => course.status === "in-progress")
        .reduce((sum, course) => sum + course.credits, 0);
    } else {
      inProgress = folderCourses.filter(
        (course) => course.status === "in-progress",
      ).length;
    }

    return { completed, inProgress, total: folder.min };
  };

  // Handle data updates
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

    // Recalculate progress percentage
    setProgressPercentage(
      await calculateProgressPercentage(plannerCol!, completedCredits),
    );
  };

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
      const removed = await courseToRemove.remove();
    } else {
      // course not found by raw_id, find by name
      const courseToRemoveByName = await coursesCol!
        .findOne({ selector: { title: course.name_zh } })
        .exec();
      if (courseToRemoveByName) {
        const removed = await courseToRemoveByName.remove();
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

  // Clear selections
  const clearSelections = () => {
    setSelectedCourses({});
    setShowBulkMenu(false);
  };

  // Get selected course count
  const getSelectedCount = () => Object.keys(selectedCourses).length;

  // Effect to show/hide bulk menu based on selections
  useEffect(() => {
    const selectedCount = getSelectedCount();
    setShowBulkMenu(selectedCount > 0);
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

  // Update course parent folder
  const handleUpdateCourseParent = async (
    courseUuid: string,
    newParent: string,
  ) => {
    const course = await coursesCol!
      .findOne({ selector: { uuid: courseUuid } })
      .exec();
    if (course) {
      await course.update({
        $set: {
          parent: newParent,
        },
      });
      return true;
    }
    return false;
  };

  // Get all leaf folders (folders with no children)
  const getLeafFolders = () => {
    const folderWithChildren = new Set(
      folderData.map((folder) => folder.parent).filter(Boolean),
    );
    return folderData.filter((folder) => !folderWithChildren.has(folder.id));
  };

  // Initialize edit form when selectedCourse changes
  useEffect(() => {
    if (selectedCourse) {
      setEditCourseForm({ ...selectedCourse });
    }
  }, [selectedCourse]);

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Left Sidebar - Requirements */}
      <div className="w-72 border-r border-neutral-700 flex flex-col">
        <div className="p-4 border-b border-neutral-700">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold">
              {plannerInfo?.title || "學分規劃"}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlannerSettingsOpen(true)}
            >
              <Cog className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-neutral-400">
            {plannerInfo?.department || ""} {plannerInfo?.enrollmentYear || ""}
            學年度
          </p>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="font-medium">
              {completedCredits} / {plannerInfo?.requiredCredits || 128}
            </span>
            <span className="text-neutral-400 ml-2">∞</span>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-2" />
        </div>

        <div className="p-2 border-b border-neutral-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="搜尋課程或要求"
              className="pl-10 bg-neutral-800 border-neutral-700 text-white"
            />
          </div>
        </div>

        <div className="p-2 border-b border-neutral-700 flex justify-between items-center">
          <h3 className="font-medium">畢業要求</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFolderManagementOpen(true)}
          >
            <FolderTree className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {getChildFoldersFromState("planner-1").map((folder) => (
              <FolderNavItem
                key={folder.id}
                folder={folder}
                folderData={folderData}
                expandedFolders={expandedFolders}
                selectedFolder={selectedFolder}
                onToggle={toggleFolder}
                onSelect={(id) => setSelectedFolder(id)}
                getFolderCompletion={getFolderCompletion}
                getChildFolders={getChildFoldersFromState}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-neutral-700 flex flex-col gap-2">
          <Button variant="outline" className="w-full">
            <GraduationCap className="h-4 w-4 mr-2" />
            畢業審查
          </Button>
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            查看畢業要求PDF
          </Button>
        </div>
      </div>

      {/* Middle Pane - Course List */}
      <div className="flex-1 flex flex-col border-r border-neutral-700">
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">
              {folderData.find((f) => f.id === selectedFolder)?.title || ""}
            </h2>
            <p className="text-sm text-neutral-400">
              {selectedFolder
                ? `${getCoursesByFolder(selectedFolder).length} 門課程`
                : "全部課程"}
            </p>
          </div>
          {selectedFolder &&
            getChildFoldersFromState(selectedFolder).length === 0 && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  篩選
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      建立新課程
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-neutral-900 border-neutral-700 text-white">
                    <DialogHeader>
                      <DialogTitle>建立新課程</DialogTitle>
                      <DialogDescription>
                        手動創建一個自定義課程
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="header-new-course-id">課程代碼</Label>
                        <Input
                          id="header-new-course-id"
                          className="bg-neutral-800 border-neutral-700 text-white"
                          placeholder="例如: CSIE1212"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="header-new-course-title">
                          課程名稱
                        </Label>
                        <Input
                          id="header-new-course-title"
                          className="bg-neutral-800 border-neutral-700 text-white"
                          placeholder="例如: 程式設計"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="header-new-course-credits">
                            學分數
                          </Label>
                          <Input
                            id="header-new-course-credits"
                            type="number"
                            defaultValue="3"
                            className="bg-neutral-800 border-neutral-700 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="header-new-course-status">狀態</Label>
                          <Select defaultValue="planned">
                            <SelectTrigger
                              id="header-new-course-status"
                              className="bg-neutral-800 border-neutral-700"
                            >
                              <SelectValue placeholder="選擇狀態" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700">
                              <SelectItem value="completed">已完成</SelectItem>
                              <SelectItem value="in-progress">
                                進行中
                              </SelectItem>
                              <SelectItem value="planned">計劃中</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">取消</Button>
                      <Button>建立課程</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      搜尋課程
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-neutral-900 border-neutral-700 text-white min-w-full h-full">
                    <DialogHeader>
                      <DialogTitle>搜尋課程</DialogTitle>
                      <DialogDescription className="text-neutral-400">
                        將課程新增到當前資料夾
                      </DialogDescription>
                    </DialogHeader>
                    <CourseSearchContainer
                      onAdd={handleCourseAdded}
                      onRemove={handleCourseRemoved}
                      items={courseData}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        取消
                      </Button>
                      <Button>新增所選課程</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
        </div>

        <div className="p-2 border-b border-neutral-700 flex items-center justify-between">
          <Tabs defaultValue="list" className="w-full">
            <div className="flex justify-between items-center">
              <TabsList className="bg-neutral-800 border-neutral-700">
                <TabsTrigger value="list">列表</TabsTrigger>
                <TabsTrigger value="grid">網格</TabsTrigger>
              </TabsList>

              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="課程狀態" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="all">全部課程</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="planned">計劃中</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* No folder selected - Show all courses or getting started instructions */}
            {!selectedFolder && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
                {courseData.length > 0 ? (
                  <TabsContent value="list" className="m-0 w-full">
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                      <div className="space-y-2 p-2">
                        {courseData.map((course, index) => (
                          <CourseListItem
                            key={index}
                            course={course}
                            isSelected={selectedCourse?.uuid === course.uuid}
                            isMultiSelected={!!selectedCourses[course.uuid]}
                            onClick={() => setSelectedCourse(course)}
                            onSelect={(e) =>
                              handleCourseSelect(course.uuid, e.shiftKey)
                            }
                            onViewDetails={() => {
                              setSelectedCourse(course);
                              setCourseDetailsOpen(true);
                            }}
                            onEdit={() => {
                              setSelectedCourse(course);
                              setEditCourseOpen(true);
                            }}
                            onStatusChange={(status) =>
                              handleUpdateCourseStatus(course.uuid, status)
                            }
                            onSemesterChange={(semester) =>
                              handleUpdateCourseSemester(course.uuid, semester)
                            }
                            semesters={semesterData}
                            folders={folderData}
                            onDeleteCourse={() => handleItemRemove(course)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ) : (
                  <div className="max-w-lg text-center">
                    <h3 className="text-xl font-bold mb-6">開始使用學分規劃</h3>
                    <div className="space-y-6 text-left">
                      <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                        <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">創建並選擇資料夾</h4>
                          <p className="text-neutral-400 mb-2 text-sm">
                            在左側面板建立您的畢業要求資料夾，或使用模板
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFolderManagementOpen(true)}
                          >
                            <FolderTree className="h-4 w-4 mr-2" />
                            管理資料夾
                          </Button>
                        </div>
                      </div>

                      <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                        <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">新增課程</h4>
                          <p className="text-neutral-400 mb-2 text-sm">
                            選擇資料夾後，點擊上方的「新增課程」按鈕
                          </p>
                          <p className="text-neutral-400 mb-2 text-xs">
                            提示：您可以設定課程狀態以追蹤進度
                          </p>
                          <div className="flex space-x-2 mb-1">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              已完成
                            </Badge>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                              <CircleDot className="h-3 w-3" />
                              進行中
                            </Badge>
                            <Badge className="bg-neutral-700 text-neutral-300 border-neutral-600 flex items-center gap-1">
                              <CircleDashed className="h-3 w-3" />
                              計劃中
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="bg-neutral-800/50 p-4 rounded-lg flex items-start">
                        <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">分配學期</h4>
                          <p className="text-neutral-400 mb-2 text-sm">
                            將課程分配到學期，以規劃您的學習路徑
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSemesterManagementOpen(true)}
                          >
                            <CalendarDays className="h-4 w-4 mr-2" />
                            管理學期
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Folder selected but not a leaf node and has no courses */}
            {selectedFolder &&
              getChildFoldersFromState(selectedFolder).length > 0 &&
              getCoursesByFolder(selectedFolder).length === 0 && (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
                  <div className="max-w-md text-center">
                    <FolderTree className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
                    <h3 className="text-xl font-bold mb-2">選擇子資料夾</h3>
                    <p className="text-neutral-400 mb-4">
                      請選擇左側面板的子資料夾來管理課程。
                      只有末端資料夾可以直接添加課程。
                    </p>
                    <div className="bg-neutral-800/50 p-3 rounded-lg text-left mb-4">
                      <p className="text-sm">可用子資料夾：</p>
                      <div className="mt-2 space-y-1">
                        {getChildFoldersFromState(selectedFolder).map(
                          (folder) => (
                            <div
                              key={folder.id}
                              className="flex items-center p-2 rounded-md hover:bg-neutral-700 cursor-pointer"
                              onClick={() => setSelectedFolder(folder.id)}
                            >
                              {getChildFoldersFromState(folder.id).length >
                              0 ? (
                                <ChevronRight className="h-4 w-4 text-neutral-400 mr-2" />
                              ) : (
                                <div className="w-4 h-4 mr-2" />
                              )}
                              <div
                                className={`w-2 h-2 rounded-full bg-${folder.color || "neutral"}-500 mr-2`}
                              ></div>
                              <span>{folder.title}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Leaf folder selected but has no courses */}
            {selectedFolder &&
              getChildFoldersFromState(selectedFolder).length === 0 &&
              getCoursesByFolder(selectedFolder).length === 0 && (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] p-8">
                  <div className="max-w-md text-center">
                    <Plus className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
                    <h3 className="text-xl font-bold mb-2">新增課程</h3>
                    <p className="text-neutral-400 mb-4">
                      這個資料夾還沒有課程。點擊右上角的按鈕來添加課程。
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="default">
                            <Plus className="h-4 w-4 mr-2" />
                            建立新課程
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900 border-neutral-700 text-white">
                          <DialogHeader>
                            <DialogTitle>建立新課程</DialogTitle>
                            <DialogDescription>
                              手動創建一個自定義課程
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-course-id">課程代碼</Label>
                              <Input
                                id="new-course-id"
                                className="bg-neutral-800 border-neutral-700 text-white"
                                placeholder="例如: CSIE1212"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-course-title">課程名稱</Label>
                              <Input
                                id="new-course-title"
                                className="bg-neutral-800 border-neutral-700 text-white"
                                placeholder="例如: 程式設計"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-course-credits">
                                  學分數
                                </Label>
                                <Input
                                  id="new-course-credits"
                                  type="number"
                                  defaultValue="3"
                                  className="bg-neutral-800 border-neutral-700 text-white"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="new-course-status">狀態</Label>
                                <Select defaultValue="planned">
                                  <SelectTrigger
                                    id="new-course-status"
                                    className="bg-neutral-800 border-neutral-700"
                                  >
                                    <SelectValue placeholder="選擇狀態" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-neutral-800 border-neutral-700">
                                    <SelectItem value="completed">
                                      已完成
                                    </SelectItem>
                                    <SelectItem value="in-progress">
                                      進行中
                                    </SelectItem>
                                    <SelectItem value="planned">
                                      計劃中
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">取消</Button>
                            <Button>建立課程</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="default">
                            <Search className="h-4 w-4 mr-2" />
                            搜尋課程
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900 border-neutral-700 text-white min-w-full h-full">
                          <DialogHeader>
                            <DialogTitle>
                              加入
                              {
                                folderData.find((f) => f.id === selectedFolder)
                                  ?.title
                              }
                            </DialogTitle>
                          </DialogHeader>
                          <CourseSearchContainer
                            onAdd={handleCourseAdded}
                            onRemove={handleCourseRemoved}
                            items={courseData}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {}}>
                              取消
                            </Button>
                            <Button>新增所選課程</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              )}

            {/* Courses list - only show when a folder is selected and has courses */}
            {selectedFolder &&
              getCoursesByFolder(selectedFolder).length > 0 && (
                <>
                  <TabsContent value="list" className="m-0">
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                      <div className="space-y-2 p-2">
                        {getCoursesByFolder(selectedFolder).map(
                          (course, index) => (
                            <CourseListItem
                              key={index}
                              course={course}
                              isSelected={selectedCourse?.uuid === course.uuid}
                              isMultiSelected={!!selectedCourses[course.uuid]}
                              onClick={() => setSelectedCourse(course)}
                              onSelect={(e) =>
                                handleCourseSelect(course.uuid, e.shiftKey)
                              }
                              onViewDetails={() => {
                                setSelectedCourse(course);
                                setCourseDetailsOpen(true);
                              }}
                              onEdit={() => {
                                setSelectedCourse(course);
                                setEditCourseOpen(true);
                              }}
                              onStatusChange={(status) =>
                                handleUpdateCourseStatus(course.uuid, status)
                              }
                              onSemesterChange={(semester) =>
                                handleUpdateCourseSemester(
                                  course.uuid,
                                  semester,
                                )
                              }
                              semesters={semesterData}
                              folders={folderData}
                              onDeleteCourse={() => handleItemRemove(course)}
                            />
                          ),
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="grid" className="m-0">
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                      <div className="grid grid-cols-2 gap-2 p-2">
                        {getCoursesByFolder(selectedFolder).map(
                          (course, index) => (
                            <CourseGridItem
                              key={index}
                              course={course}
                              isSelected={selectedCourse?.uuid === course.uuid}
                              isMultiSelected={!!selectedCourses[course.uuid]}
                              onClick={() => setSelectedCourse(course)}
                              onSelect={(e) =>
                                handleCourseSelect(course.uuid, e.shiftKey)
                              }
                              onViewDetails={() => {
                                setSelectedCourse(course);
                                setCourseDetailsOpen(true);
                              }}
                              onEdit={() => {
                                setSelectedCourse(course);
                                setEditCourseOpen(true);
                              }}
                              onStatusChange={(status) =>
                                handleUpdateCourseStatus(course.uuid, status)
                              }
                              onSemesterChange={(semester) =>
                                handleUpdateCourseSemester(
                                  course.uuid,
                                  semester,
                                )
                              }
                              semesters={semesterData}
                            />
                          ),
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </>
              )}
          </Tabs>
        </div>
      </div>

      {/* Right Pane - Semester Planning */}
      <div className="w-96 flex flex-col">
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">學期規劃</h2>
            <p className="text-sm text-neutral-400">規劃您的課程安排</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSemesterManagementOpen(true)}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>

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
          onStatusChange={handleUpdateCourseStatus}
          onSemesterChange={handleUpdateCourseSemester}
        />
      </div>

      {/* Course Details Dialog */}
      {selectedCourse && (
        <Dialog open={courseDetailsOpen} onOpenChange={setCourseDetailsOpen}>
          <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedCourse.title}
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                {selectedCourse.id} • {selectedCourse.credits}學分
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-neutral-400" />
                    授課教師
                  </h3>
                  <p className="text-neutral-300 bg-neutral-800 p-2 rounded-md">
                    {selectedCourse.instructor}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">課程簡介</h3>
                  <p className="text-neutral-300 bg-neutral-800 p-2 rounded-md">
                    {selectedCourse.description}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-800 p-2 rounded-md">
                    <p className="text-xs text-neutral-400">類別</p>
                    <p className="font-medium">
                      {folderData.find((f) => f.id === selectedCourse.parent)
                        ?.title || selectedCourse.parent}
                    </p>
                  </div>
                  <div className="bg-neutral-800 p-2 rounded-md">
                    <p className="text-xs text-neutral-400">學期</p>
                    <p className="font-medium">
                      {selectedCourse.semester
                        ? semesterData.find(
                            (s) => s.id === selectedCourse.semester,
                          )?.name || selectedCourse.semester
                        : "未分配"}
                    </p>
                  </div>
                  <div className="bg-neutral-800 p-2 rounded-md">
                    <p className="text-xs text-neutral-400">狀態</p>
                    <p className="font-medium">
                      {selectedCourse.status === "completed"
                        ? "已完成"
                        : selectedCourse.status === "in-progress"
                          ? "進行中"
                          : "計劃中"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">先修課程</h3>
                  {selectedCourse.dependson &&
                  selectedCourse.dependson.length > 0 ? (
                    <div className="space-y-1">
                      {selectedCourse.dependson.map((prereq, index) => (
                        <div
                          key={index}
                          className="bg-neutral-800 p-2 rounded-md flex items-center"
                        >
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span>{prereq}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-300 bg-neutral-800 p-2 rounded-md">
                      無先修課程要求
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-2">畢業要求滿足情況</h3>
                  <div className="space-y-1">
                    <div className="bg-neutral-800 p-2 rounded-md flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span>
                        滿足「
                        {folderData.find((f) => f.id === selectedCourse.parent)
                          ?.title || "未知"}
                        」要求
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add link to actual course if raw_id exists */}
                {selectedCourse.raw_id && (
                  <div>
                    <h3 className="font-medium mb-2">課程詳情</h3>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        router.push(`/zh/courses/${selectedCourse.raw_id}`)
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      查看課程詳情頁面
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCourseOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                編輯課程
              </Button>
              <Button onClick={() => setCourseDetailsOpen(false)}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Course Dialog */}
      {selectedCourse && editCourseForm && (
        <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
          <DialogContent className="bg-neutral-900 border-neutral-700 text-white">
            <DialogHeader>
              <DialogTitle>編輯課程</DialogTitle>
              <DialogDescription className="text-neutral-400">
                修改課程資訊
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-id">課程代碼</Label>
                  <Input
                    id="course-id"
                    defaultValue={editCourseForm.id}
                    className="bg-neutral-800 border-neutral-700 text-white"
                    onChange={(e) =>
                      setEditCourseForm({
                        ...editCourseForm,
                        id: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-title">課程名稱</Label>
                  <Input
                    id="course-title"
                    defaultValue={editCourseForm.title}
                    className="bg-neutral-800 border-neutral-700 text-white"
                    onChange={(e) =>
                      setEditCourseForm({
                        ...editCourseForm,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-credits">學分數</Label>
                  <Input
                    id="course-credits"
                    type="number"
                    defaultValue={editCourseForm.credits.toString()}
                    className="bg-neutral-800 border-neutral-700 text-white"
                    onChange={(e) =>
                      setEditCourseForm({
                        ...editCourseForm,
                        credits: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-category">課程類別</Label>
                  <Select
                    defaultValue={
                      editCourseForm.parent ? editCourseForm.parent : ""
                    }
                    onValueChange={(value) =>
                      setEditCourseForm({ ...editCourseForm, parent: value })
                    }
                  >
                    <SelectTrigger
                      id="course-category"
                      className="bg-neutral-800 border-neutral-700"
                    >
                      <SelectValue placeholder="選擇類別" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700 max-h-[300px]">
                      {getLeafFolders().map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-status">課程狀態</Label>
                <Select
                  defaultValue={editCourseForm.status}
                  onValueChange={(value) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      status: value as CourseStatus,
                    })
                  }
                >
                  <SelectTrigger
                    id="course-status"
                    className="bg-neutral-800 border-neutral-700"
                  >
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="in-progress">進行中</SelectItem>
                    <SelectItem value="planned">計劃中</SelectItem>
                    <SelectItem value="failed">未通過</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-semester">學期</Label>
                <Select
                  defaultValue={editCourseForm.semester}
                  onValueChange={(value) =>
                    setEditCourseForm({ ...editCourseForm, semester: value })
                  }
                >
                  <SelectTrigger
                    id="course-semester"
                    className="bg-neutral-800 border-neutral-700"
                  >
                    <SelectValue placeholder="選擇學期" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {semesterData.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-instructor">授課教師</Label>
                <Input
                  id="course-instructor"
                  defaultValue={editCourseForm.instructor || ""}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      instructor: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-description">課程簡介</Label>
                <Textarea
                  id="course-description"
                  defaultValue={editCourseForm.description || ""}
                  className="bg-neutral-800 border-neutral-700 text-white min-h-[100px]"
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditCourseOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  handleUpdateCourse(editCourseForm);
                }}
              >
                儲存變更
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg p-2 z-50 transition-all duration-200 flex items-center gap-2">
          <div className="flex items-center bg-neutral-900 px-3 py-1 rounded-md mr-2">
            <SquareCheckBig className="h-4 w-4 text-primary mr-1" />
            <span className="text-sm font-medium">
              {getSelectedCount()} 已選擇
            </span>
          </div>

          <div className="flex items-center gap-1 border-r border-neutral-700 pr-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleBulkStatusChange("completed")}
              title="標記為已完成"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleBulkStatusChange("in-progress")}
              title="標記為進行中"
            >
              <CircleDot className="h-4 w-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleBulkStatusChange("planned")}
              title="標記為計劃中"
            >
              <CircleDashed className="h-4 w-4 text-neutral-400" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Calendar className="h-4 w-4 mr-1" />
                <span>變更學期</span>
                <ChevronsUpDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-800 border-neutral-700">
              {semesterData.map((semester) => (
                <DropdownMenuItem
                  key={semester.id}
                  className="text-white hover:bg-neutral-700 cursor-pointer"
                  onClick={() => handleBulkSemesterChange(semester.id)}
                >
                  {semester.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="border-l border-neutral-700 pl-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-500 hover:text-red-400 hover:bg-red-900/20"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span>刪除</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 ml-1"
            onClick={clearSelections}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface FolderNavItemProps {
  folder: FolderDocType;
  folderData: FolderDocType[];
  expandedFolders: Record<string, boolean>;
  selectedFolder: string | undefined;
  onToggle: (folderId: string) => void;
  onSelect: (id: string) => void;
  getFolderCompletion: (folderId: string) => {
    completed: number;
    inProgress: number;
    total: number;
  };
  getChildFolders: (parentId: string | null) => FolderDocType[];
}

function FolderNavItem({
  folder,
  folderData,
  expandedFolders,
  selectedFolder,
  onToggle,
  onSelect,
  getFolderCompletion,
  getChildFolders,
}: FolderNavItemProps) {
  const { completed, inProgress, total } = getFolderCompletion(folder.id);
  const childFolders = getChildFolders(folder.id);
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedFolders[folder.id] || false;
  const isSelected = selectedFolder === folder.id;
  const [isDragOver, setIsDragOver] = useState(false);
  const isLeafFolder = !hasChildren;

  const getColorClass = () => {
    return completed >= total
      ? "bg-green-500"
      : completed + inProgress >= total
        ? "bg-blue-500"
        : "bg-red-500";
  };

  const getTextColor = () => {
    return completed >= total
      ? "text-green-500"
      : completed + inProgress >= total
        ? "text-blue-500"
        : "text-red-500";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isLeafFolder) {
      e.preventDefault();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (isLeafFolder) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const courseCol = useRxCollection<ItemDocType>("items");
  const handleDrop = (e: React.DragEvent) => {
    if (isLeafFolder) {
      e.preventDefault();
      setIsDragOver(false);

      try {
        const courseData = JSON.parse(
          e.dataTransfer.getData("text/plain"),
        ) as ItemDocType;
        if (courseData && courseData.uuid) {
          updateCourseItem(courseCol!, { ...courseData, parent: folder.id });
        }
      } catch (error) {
        console.error("Failed to parse dragged course data:", error);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center p-2 rounded-md ${isSelected ? "bg-neutral-800" : isDragOver && isLeafFolder ? "bg-primary/20 border border-primary/50" : "hover:bg-neutral-800/50"} cursor-pointer group ${isLeafFolder ? "transition-colors duration-200" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="mr-2 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggle(folder.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0" onClick={() => onSelect(folder.id)}>
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full ${getColorClass()} mr-2`}
            ></div>
            <h2 className="font-medium truncate">{folder.title}</h2>
          </div>
          <div className="flex items-center mt-1">
            <span className={`${getTextColor()} text-xs font-medium`}>
              {completed} / {total}{" "}
              {folder.min < folder.max
                ? `- ${folder.min}~${folder.max}`
                : folder.min == folder.max
                  ? ""
                  : `${folder.min}~∞`}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-6 space-y-1 mt-1">
          {childFolders.map((childFolder) => (
            <FolderNavItem
              key={childFolder.id}
              folder={childFolder}
              folderData={folderData}
              expandedFolders={expandedFolders}
              selectedFolder={selectedFolder}
              onToggle={onToggle}
              onSelect={onSelect}
              getFolderCompletion={getFolderCompletion}
              getChildFolders={getChildFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CourseListItemProps {
  course: ItemDocType;
  isSelected: boolean;
  isMultiSelected: boolean;
  onClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onStatusChange: (status: CourseStatus) => void;
  onSemesterChange: (semester: string) => void;
  semesters: SemesterDocType[];
  folders: FolderDocType[];
  onDeleteCourse: () => void;
}

function CourseListItem({
  course,
  isSelected,
  isMultiSelected,
  onClick,
  onSelect,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  semesters,
  folders,
  onDeleteCourse,
}: CourseListItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getStatusColor = () => {
    switch (course.status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in-progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-neutral-700 text-neutral-300 border-neutral-600";
    }
  };

  const getStatusText = () => {
    switch (course.status) {
      case "completed":
        return "已完成";
      case "in-progress":
        return "進行中";
      case "failed":
        return "未通過";
      default:
        return "計劃中";
    }
  };

  const getStatusIcon = () => {
    switch (course.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <CircleDashed className="h-4 w-4 text-neutral-400" />;
    }
  };

  const handleStatusChange = (status: CourseStatus) => {
    setDropdownOpen(false); // Close the dropdown after action
    onStatusChange(status);
  };

  const handleEdit = () => {
    setDropdownOpen(false); // Close the dropdown after action
    onEdit();
  };

  const handleDeleteCourse = () => {
    setDropdownOpen(false); // Close the dropdown after action
    onDeleteCourse();
  };

  const handleSemesterChange = (semester: string) => {
    setDropdownOpen(false); // Close the dropdown after action
    onSemesterChange(semester);
  };

  const getParentName = () => {
    const parentFolder = folders.find((folder) => folder.id === course.parent);
    return parentFolder ? parentFolder.title : "無";
  };

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`flex items-center p-2 rounded-md border ${isSelected ? "border-primary" : isMultiSelected ? "border-primary bg-primary/10" : "border-neutral-700"} 
        bg-neutral-800 cursor-pointer hover:border-primary transition-colors duration-200 group relative`}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(course));
      }}
    >
      {/* Selection checkbox - only shown on hover or when selected */}
      <div
        className={`absolute left-2 top-2 ${isMultiSelected || isHovering ? "opacity-100" : "opacity-0"} 
          transition-opacity duration-200 z-10`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center
          ${isMultiSelected ? "bg-primary border-primary" : "border-neutral-500 bg-neutral-800"}`}
        >
          {isMultiSelected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
      <div className="flex-1 min-w-0 pl-6">
        <div className="flex items-center flex-wrap gap-1 mb-1">
          <Badge variant="outline" className="text-xs">
            {course.id}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {course.credits}學分
          </Badge>
          <Badge
            className={`${getStatusColor()} text-xs flex items-center gap-1`}
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>
        <div className="font-medium truncate">{course.title}</div>
        <div className="flex items-center mt-1 text-xs text-neutral-400">
          <span>{getParentName()}</span>
          <span className="mx-1">•</span>
          {course.semester && (
            <span>
              {course.status === "completed"
                ? `已修於 ${course.semester}`
                : course.status === "in-progress"
                  ? `修習中 ${course.semester}`
                  : `計劃於 ${course.semester}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center ml-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-neutral-800 border-neutral-700">
            <DropdownMenuItem
              className="text-white hover:bg-neutral-700 cursor-pointer"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              編輯課程
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-700" />
            <DropdownMenuItem
              className="text-white hover:bg-neutral-700 cursor-pointer"
              onClick={() => handleStatusChange("completed")}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              標記為已完成
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-white hover:bg-neutral-700 cursor-pointer"
              onClick={() => handleStatusChange("in-progress")}
            >
              <CircleDot className="h-4 w-4 mr-2 text-blue-500" />
              標記為進行中
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-white hover:bg-neutral-700 cursor-pointer"
              onClick={() => handleStatusChange("planned")}
            >
              <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
              標記為計劃中
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-700" />
            <DropdownMenuItem className="text-white hover:bg-neutral-700 cursor-pointer">
              <Calendar className="h-4 w-4 mr-2" />
              更改學期
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-700" />
            <DropdownMenuItem
              className="text-red-400 hover:bg-neutral-700 cursor-pointer"
              onClick={handleDeleteCourse}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              移除課程
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface CourseGridItemProps {
  course: ItemDocType;
  isSelected: boolean;
  isMultiSelected: boolean;
  onClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onStatusChange: (status: CourseStatus) => void;
  onSemesterChange: (semester: string) => void;
  semesters: SemesterDocType[];
}

function CourseGridItem({
  course,
  isSelected,
  isMultiSelected,
  onClick,
  onSelect,
  onViewDetails,
  onEdit,
  onStatusChange,
  onSemesterChange,
  semesters,
}: CourseGridItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getStatusColor = () => {
    switch (course.status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in-progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-neutral-700 text-neutral-300 border-neutral-600";
    }
  };

  const getStatusText = () => {
    switch (course.status) {
      case "completed":
        return "已完成";
      case "in-progress":
        return "進行中";
      case "failed":
        return "未通過";
      default:
        return "計劃中";
    }
  };

  const getStatusIcon = () => {
    switch (course.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <CircleDashed className="h-4 w-4 text-neutral-400" />;
    }
  };

  const handleStatusChange = (status: CourseStatus) => {
    setDropdownOpen(false); // Close the dropdown after action
    onStatusChange(status);
  };

  const handleEdit = () => {
    setDropdownOpen(false); // Close the dropdown after action
    onEdit();
  };

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`p-3 rounded-md border ${isSelected ? "border-primary" : isMultiSelected ? "border-primary bg-primary/10" : "border-neutral-700"} 
        bg-neutral-800 cursor-pointer hover:border-primary transition-colors duration-200 h-32 flex flex-col group relative`}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(course));
      }}
    >
      {/* Selection checkbox - only shown on hover or when selected */}
      <div
        className={`absolute right-2 top-2 ${isMultiSelected || isHovering ? "opacity-100" : "opacity-0"} 
          transition-opacity duration-200 z-10`}
        onClick={(e) => {
          e.stopPropagation();

          e;
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center
          ${isMultiSelected ? "bg-primary border-primary" : "border-neutral-500 bg-neutral-800"}`}
        >
          {isMultiSelected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>

      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="text-xs">
          {course.id}
        </Badge>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-800 border-neutral-700">
              <DropdownMenuItem
                className="text-white hover:bg-neutral-700 cursor-pointer"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                編輯課程
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700" />
              <DropdownMenuItem
                className="text-white hover:bg-neutral-700 cursor-pointer"
                onClick={() => handleStatusChange("completed")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                標記為已完成
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white hover:bg-neutral-700 cursor-pointer"
                onClick={() => handleStatusChange("in-progress")}
              >
                <CircleDot className="h-4 w-4 mr-2 text-blue-500" />
                標記為進行中
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white hover:bg-neutral-700 cursor-pointer"
                onClick={() => handleStatusChange("planned")}
              >
                <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
                標記為計劃中
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700" />
              <DropdownMenuItem
                className="text-red-400 hover:bg-neutral-700 cursor-pointer"
                onClick={() => {
                  onStatusChange("failed");
                  setDropdownOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                移除課程
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="font-medium line-clamp-2 mb-1">{course.title}</div>
      <div className="mt-auto">
        <div className="flex items-center text-xs gap-1 mb-1">
          <Badge
            className={`${getStatusColor()} text-xs flex items-center gap-1 py-0 px-1 h-5`}
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
          <span className="text-neutral-400">
            {course.status === "completed"
              ? `已修於 ${course.semester}`
              : course.status === "in-progress"
                ? `修習中 ${course.semester}`
                : `計劃於 ${course.semester}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-neutral-400">
          <span>{course.credits}學分</span>
          <span>{course.parent}</span>
        </div>
      </div>
    </div>
  );
}
