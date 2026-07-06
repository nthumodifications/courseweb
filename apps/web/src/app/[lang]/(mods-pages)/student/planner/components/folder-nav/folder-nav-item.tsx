import { ChevronDown, ChevronRight } from "lucide-react";
import { FolderDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();
  const { completed, inProgress, pending, total } = getFolderCompletion(
    folder.id,
  );
  const childFolders = getChildFolders(
    folder.id == "_unsorted" ? null : folder.id,
  );
  const hasChildren = childFolders.length > 0;
  const isExpanded = folder.id != null ? expandedFolders[folder.id] : false;
  const isSelected = selectedFolder === folder.id;
  const isLeafFolder = !hasChildren;

  // A `total` of 0 means no min/max requirement is configured for this
  // folder — it must not be read as "already complete" (0 >= 0 would
  // otherwise be a false positive), the same root cause as the
  // `calculateFolderCompletion` denominator bug.
  const hasRequirement = total > 0;

  // Only leaf folders (no children) accept course drops — dropping onto a
  // parent/category folder doesn't make sense since courses always live in
  // a specific leaf category.
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id },
    disabled: !isLeafFolder,
  });

  // Disabled droppables never report `isOver`, so we can't rely on it to
  // show a "blocked" cue on non-leaf folders while something is being
  // dragged. Instead, detect that a drag is in progress at all and use
  // that to render the blocked affordance on any non-leaf folder.
  const { active } = useDndContext();
  const isDraggingSomething = active != null;
  const isBlockedDropTarget = !isLeafFolder && isDraggingSomething;

  const getColorClass = () => {
    if (folder.id == "_unsorted" || !hasRequirement) {
      return "bg-neutral-400 dark:bg-neutral-600";
    }
    return completed >= total
      ? "bg-green-500"
      : completed + inProgress >= total
        ? "bg-yellow-500"
        : "bg-red-500";
  };

  const unit =
    folder.metric == "courses"
      ? dict.planner.sidebar.coursesUnit
      : dict.planner.sidebar.creditsUnit;

  const requirementLabel =
    folder.min === 0 && folder.max === 0
      ? dict.planner.sidebar.noRequirement
      : folder.min < folder.max
        ? `${folder.min}~${folder.max} ${unit}`
        : `${folder.min} ${unit}`;

  return (
    <div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center p-2 rounded-md cursor-pointer group",
          isLeafFolder && "transition-colors duration-200",
          isSelected
            ? "bg-neutral-100 dark:bg-neutral-800"
            : isOver && isLeafFolder
              ? "bg-primary/20 border border-primary/50"
              : "hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50",
          isBlockedDropTarget && "opacity-60 cursor-not-allowed",
        )}
      >
        <button
          type="button"
          className="mr-2 flex-shrink-0 p-1 -m-1 rounded"
          aria-label={
            hasChildren
              ? isExpanded
                ? dict.planner.sidebar.collapseFolder
                : dict.planner.sidebar.expandFolder
              : undefined
          }
          tabIndex={hasChildren ? 0 : -1}
          aria-hidden={!hasChildren}
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
        </button>
        <div
          className="flex-1 min-w-0 flex flex-row items-center"
          onClick={() => onSelect(folder.id)}
        >
          <div className="flex items-center flex-1">
            <div
              className={`w-2 h-2 rounded-full ${getColorClass()} mr-2`}
            ></div>
            <h2 className="font-medium break-words whitespace-normal overflow-hidden max-w-full">
              {folder.title}
            </h2>
          </div>
          <div className="flex items-center mt-1">
            <span
              className={`text-xs font-medium`}
              title={`${dict.planner.status.completed}: ${completed}, ${dict.planner.status.inProgress}: ${inProgress}, ${dict.planner.status.planned}: ${Math.max(total - (completed + inProgress), 0)}`}
            >
              <span className="text-green-500">{completed}</span>
              {inProgress > 0 ? (
                <span className="text-yellow-400">+{inProgress}</span>
              ) : null}
              {pending > 0 ? (
                <span className="text-neutral-400">+{pending}</span>
              ) : null}
              {" / "}
              {requirementLabel}
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
