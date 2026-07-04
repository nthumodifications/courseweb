import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { Progress } from "@courseweb/ui";
import {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { FolderNavItem } from "../folder-nav/folder-nav-item";
import {
  GraduationCap,
  FileText,
  Search,
  FolderTree,
  Cog,
  Inbox,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { getStatusLabel } from "@/app/[lang]/(mods-pages)/student/planner/lib/status";

interface FolderNavigationProps {
  plannerInfo: PlannerDataDocType | null;
  completedCredits: number;
  inProgressCredits: number;
  plannedCredits: number;
  progressPercentage: number;
  folderData: FolderDocType[];
  courseData: ItemDocType[];
  expandedFolders: Record<string, boolean>;
  selectedFolder: string | undefined;
  onToggleFolder: (folderId: string) => void;
  onSelectFolder: (id: string) => void;
  getFolderCompletion: (folderId: string) => {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
  };
  getChildFolders: (parentId: string | null) => FolderDocType[];
  onOpenFolderManagement: () => void;
  onOpenPlannerSettings: () => void;
  hasUnsortedItems?: boolean;
}

export function FolderNavigation({
  plannerInfo,
  completedCredits,
  inProgressCredits,
  plannedCredits,
  progressPercentage,
  folderData,
  courseData,
  expandedFolders,
  selectedFolder,
  onToggleFolder,
  onSelectFolder,
  getFolderCompletion,
  getChildFolders,
  onOpenFolderManagement,
  onOpenPlannerSettings,
  hasUnsortedItems = false,
}: FolderNavigationProps) {
  const dict = useDictionary();
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate total credits for each progress bar
  const totalRequiredCredits = plannerInfo?.requiredCredits || 128;
  const completedPercentage = (completedCredits / totalRequiredCredits) * 100;
  const inProgressPercentage =
    ((completedCredits + inProgressCredits) / totalRequiredCredits) * 100;
  const plannedPercentage =
    ((completedCredits + inProgressCredits + plannedCredits) /
      totalRequiredCredits) *
    100;

  // Determine which folders match the search query (by folder title, a
  // contained course's title, or a descendant folder matching).
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingFolderIds = useMemo(() => {
    if (!normalizedQuery) return null;

    const matches = new Set<string>();
    const visit = (folderId: string): boolean => {
      const folder = folderData.find((f) => f.id === folderId);
      if (!folder) return false;

      const selfMatch = folder.title?.toLowerCase().includes(normalizedQuery);
      const courseMatch = courseData.some(
        (course) =>
          course.parent === folderId &&
          course.title?.toLowerCase().includes(normalizedQuery),
      );
      const children = folderData.filter((f) => f.parent === folderId);
      const childMatch = children.map((child) => visit(child.id)).some(Boolean);

      const isMatch = Boolean(selfMatch || courseMatch || childMatch);
      if (isMatch) matches.add(folderId);
      return isMatch;
    };

    folderData.forEach((folder) => visit(folder.id));
    return matches;
  }, [normalizedQuery, folderData, courseData]);

  // Wrap getChildFolders so the search filter cascades through the
  // recursive FolderNavItem tree without needing to touch that component.
  const getVisibleChildFolders = (parentId: string | null) => {
    const children = getChildFolders(parentId);
    if (!matchingFolderIds) return children;
    return children.filter((folder) => matchingFolderIds.has(folder.id));
  };

  // Get root folders plus the unsorted folder if needed
  const rootFolders = useMemo(() => {
    return [...getVisibleChildFolders("planner-1")];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getChildFolders, hasUnsortedItems, matchingFolderIds]);

  return (
    <div className="w-full lg:w-72 lg:shrink-0 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">
            {plannerInfo?.title || dict.planner.sidebar.defaultTitle}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={dict.planner.sidebar.settingsAriaLabel}
            title={dict.planner.sidebar.settingsAriaLabel}
            onClick={onOpenPlannerSettings}
          >
            <Cog className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-neutral-400">
          {plannerInfo?.department || ""} {plannerInfo?.enrollmentYear || ""}{" "}
          {dict.planner.sidebar.enrollmentSuffix}
        </p>
        <div className="flex items-center mt-2">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="font-medium text-green-500">{completedCredits}</span>
          <span className="text-yellow-500">+{inProgressCredits}</span>
          <span className="text-neutral-400">+{plannedCredits}</span>
          <span className="mx-1">/</span>
          <span>{totalRequiredCredits}</span>
        </div>
        <div className="relative h-6 mt-2">
          <Progress
            value={completedPercentage}
            className="h-2 absolute bottom-0 w-full z-30 bg-transparent"
            indicatorColor="bg-neutral-700 dark:bg-white"
          />
          <Progress
            value={inProgressPercentage}
            className="h-2 absolute bottom-0 w-full z-20 bg-transparent"
            indicatorColor="bg-yellow-500"
          />
          <Progress
            value={plannedPercentage}
            className="h-2 absolute bottom-0 w-full z-10"
            indicatorColor="bg-neutral-500"
          />
        </div>
        {/* Text legend so the credit summary isn't color-only */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {getStatusLabel("completed", dict.planner.status)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {getStatusLabel("in-progress", dict.planner.status)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neutral-500" />
            {getStatusLabel("planned", dict.planner.status)}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder={dict.planner.sidebar.searchPlaceholder}
            className="pl-10 border-border text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Folder Header */}
      <div className="p-2 border-b border-border flex justify-between items-center">
        <h3 className="font-medium">
          {dict.planner.sidebar.graduationRequirements}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          aria-label={dict.planner.sidebar.manageFoldersAriaLabel}
          title={dict.planner.sidebar.manageFoldersAriaLabel}
          onClick={onOpenFolderManagement}
        >
          <FolderTree className="h-4 w-4" />
        </Button>
      </div>

      {/* Folder List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {rootFolders.length === 0 && normalizedQuery ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              {dict.planner.sidebar.noSearchResults}
            </p>
          ) : (
            rootFolders.map((folder) => (
              <FolderNavItem
                key={folder.id}
                folder={folder}
                folderData={folderData}
                expandedFolders={expandedFolders}
                selectedFolder={selectedFolder}
                onToggle={onToggleFolder}
                onSelect={onSelectFolder}
                getFolderCompletion={getFolderCompletion}
                getChildFolders={getVisibleChildFolders}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Button variant="outline" className="w-full" asChild>
          <a
            href="https://registra.site.nthu.edu.tw/p/412-1211-1826.php?Lang=zh-tw"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="h-4 w-4 mr-2" />
            {dict.planner.sidebar.creditsPdfLink}
          </a>
        </Button>
      </div>
    </div>
  );
}
