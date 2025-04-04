import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  FolderDocType,
  ItemDocType,
} from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { useRxCollection } from "rxdb-hooks";
import { updateCourseItem } from "../../data/courses";

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
    pending: number;
    total: number;
  };
  getChildFolders: (parentId: string | null) => FolderDocType[];
}

export function FolderNavItem({
  folder,
  folderData,
  expandedFolders,
  selectedFolder,
  onToggle,
  onSelect,
  getFolderCompletion,
  getChildFolders,
}: FolderNavItemProps) {
  const { completed, inProgress, pending, total } = getFolderCompletion(
    folder.id,
  );
  const childFolders = getChildFolders(
    folder.id == "unsorted" ? null : folder.id,
  );
  const hasChildren = childFolders.length > 0;
  const isExpanded = folder.id != null ? expandedFolders[folder.id] : false;
  const isSelected = selectedFolder === folder.id;
  const [isDragOver, setIsDragOver] = useState(false);
  const isLeafFolder = !hasChildren;

  const getColorClass = () => {
    if (folder.id == "_unsorted") {
      return "";
    }
    return completed >= total
      ? "bg-green-500"
      : completed + inProgress >= total
        ? "bg-yellow-500"
        : "bg-red-500";
  };

  const getTextColor = () => {
    return completed >= total
      ? "text-green-500"
      : completed + inProgress >= total
        ? "text-yellow-500"
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
        className={`flex items-center p-2 rounded-md ${isSelected ? "bg-neutral-100 dark:bg-neutral-800" : isDragOver && isLeafFolder ? "bg-primary/20 border border-primary/50" : "hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"} cursor-pointer group ${isLeafFolder ? "transition-colors duration-200" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="mr-2 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren && folder.id != null) {
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
        <div
          className="flex-1 min-w-0 flex flex-row items-center"
          onClick={() => onSelect(folder.id)}
        >
          <div className="flex items-center flex-1">
            <div
              className={`w-2 h-2 rounded-full ${getColorClass()} mr-2`}
            ></div>
            <h2 className="font-medium truncate">{folder.title}</h2>
          </div>
          <div className="flex items-center mt-1">
            <span
              className={`text-xs font-medium`}
              title={`Completed: ${completed}, In Progress: ${inProgress}, Planned: ${total - (completed + inProgress)}`}
            >
              <span className="text-green-500">{completed}</span>
              {inProgress > 0 ? (
                <span className="text-yellow-400">+{inProgress}</span>
              ) : null}
              {pending > 0 ? (
                <span className="text-neutral-400">+{pending}</span>
              ) : null}
              {" / "}
              {folder.min < folder.max
                ? `${folder.min}~${folder.max}`
                : folder.min == folder.max
                  ? ""
                  : `${folder.min}`}
              {folder.metric == "courses" ? "門課" : "學分"}
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
