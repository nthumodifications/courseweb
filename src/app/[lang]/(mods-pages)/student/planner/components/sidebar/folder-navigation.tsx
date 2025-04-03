import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { FolderDocType, PlannerDataDocType } from "@/config/rxdb";
import { FolderNavItem } from "../folder-nav/folder-nav-item";
import {
  GraduationCap,
  FileText,
  Search,
  FolderTree,
  Cog,
  Inbox,
} from "lucide-react";
import { useMemo } from "react";

interface FolderNavigationProps {
  plannerInfo: PlannerDataDocType | null;
  completedCredits: number;
  inProgressCredits: number;
  plannedCredits: number;
  progressPercentage: number;
  folderData: FolderDocType[];
  expandedFolders: Record<string, boolean>;
  selectedFolder: string | undefined;
  onToggleFolder: (folderId: string) => void;
  onSelectFolder: (id: string) => void;
  getFolderCompletion: (folderId: string) => {
    completed: number;
    inProgress: number;
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
  // Calculate total credits for each progress bar
  const totalRequiredCredits = plannerInfo?.requiredCredits || 128;
  const completedPercentage = (completedCredits / totalRequiredCredits) * 100;
  const inProgressPercentage =
    ((completedCredits + inProgressCredits) / totalRequiredCredits) * 100;
  const plannedPercentage =
    ((completedCredits + inProgressCredits + plannedCredits) /
      totalRequiredCredits) *
    100;

  // Create unsorted folder as a virtual folder

  // Get root folders plus the unsorted folder if needed
  const rootFolders = useMemo(() => {
    const folders = [...getChildFolders("planner-1")];
    return folders;
  }, [getChildFolders, hasUnsortedItems]);

  return (
    <div className="w-72 border-r border-neutral-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">
            {plannerInfo?.title || "學分規劃"}
          </h1>
          <Button variant="ghost" size="icon" onClick={onOpenPlannerSettings}>
            <Cog className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-neutral-400">
          {plannerInfo?.department || ""} {plannerInfo?.enrollmentYear || ""}
          入學
        </p>
        <div className="flex items-center mt-2">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="font-medium text-green-500">{completedCredits}</span>
          <span className="text-blue-400">+{inProgressCredits}</span>
          <span className="text-neutral-400">+{plannedCredits}</span>
          <span className="mx-1">/</span>
          <span>{totalRequiredCredits}</span>
        </div>
        <div className="relative h-6 mt-2">
          <Progress
            value={completedPercentage}
            className="h-2 absolute bottom-0 w-full z-30 bg-transparent"
            indicatorColor="bg-white"
          />
          <Progress
            value={inProgressPercentage}
            className="h-2 absolute bottom-0 w-full z-20 bg-transparent"
            indicatorColor="bg-blue-500"
          />
          <Progress
            value={plannedPercentage}
            className="h-2 absolute bottom-0 w-full z-10"
            indicatorColor="bg-gray-500"
          />
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-neutral-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="搜尋課程或要求"
            className="pl-10 bg-neutral-800 border-neutral-700 text-white"
          />
        </div>
      </div>

      {/* Folder Header */}
      <div className="p-2 border-b border-neutral-700 flex justify-between items-center">
        <h3 className="font-medium">畢業要求</h3>
        <Button variant="ghost" size="icon" onClick={onOpenFolderManagement}>
          <FolderTree className="h-4 w-4" />
        </Button>
      </div>

      {/* Folder List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {rootFolders.map((folder) => (
            <FolderNavItem
              key={folder.id}
              folder={folder}
              folderData={folderData}
              expandedFolders={expandedFolders}
              selectedFolder={selectedFolder}
              onToggle={onToggleFolder}
              onSelect={onSelectFolder}
              getFolderCompletion={getFolderCompletion}
              getChildFolders={getChildFolders}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
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
  );
}
