import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { Progress } from "@courseweb/ui";
import {
  FolderDocType,
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
import { useMemo } from "react";
import Link from "next/link";

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
    <div className="w-72 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
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
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="搜尋課程或要求"
            className="pl-10 border-border text-white"
          />
        </div>
      </div>

      {/* Folder Header */}
      <div className="p-2 border-b border-border flex justify-between items-center">
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
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Button variant="outline" className="w-full" asChild>
          <Link
            href="https://registra.site.nthu.edu.tw/p/412-1211-1826.php?Lang=zh-tw"
            target="_blank"
          >
            <FileText className="h-4 w-4 mr-2" />
            畢業學分PDF
          </Link>
        </Button>
      </div>
    </div>
  );
}
