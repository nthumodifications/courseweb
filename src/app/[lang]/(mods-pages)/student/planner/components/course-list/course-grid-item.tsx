import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { CourseStatus } from "../../types";
import { FolderDocType, ItemDocType, SemesterDocType } from "@/config/rxdb";

interface CourseGridItemProps {
  course: ItemDocType;
  folders: FolderDocType[];
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

export function CourseGridItem({
  course,
  folders,
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
  const [isHovering, setIsHovering] = useState(false);

  const getStatusColor = () => {
    switch (course.status) {
      case "completed":
        return "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "in-progress":
        return "bg-yellow-500/10 dark:bg-yellow-500/20 text-blue-700 dark:text-yellow-500 border-yellow-500/30";
      case "failed":
        return "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      default:
        return "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600";
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
        return <CircleDot className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <CircleDashed className="h-4 w-4 text-neutral-400" />;
    }
  };

  const handleStatusChange = (status: CourseStatus) => {
    setDropdownOpen(false);
    onStatusChange(status);
  };

  const handleEdit = () => {
    setDropdownOpen(false);
    onEdit();
  };

  const getParentName = () => {
    const parentFolder = folders.find((folder) => folder.id === course.parent);
    return parentFolder ? parentFolder.title : "無";
  };

  return (
    <div
      className={`p-3 rounded-md border ${isSelected ? "border-primary" : isMultiSelected ? "border-primary bg-primary/10" : "border-border"} 
        bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:border-primary transition-colors duration-200 h-32 flex flex-col group relative`}
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
          onSelect(e);
        }}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center
          ${isMultiSelected ? "bg-primary border-primary" : "border-neutral-500 dark:neutral-50 bg-neutral-50 dark:bg-neutral-800"}`}
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
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                編輯課程
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                標記為已完成
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange("in-progress")}
              >
                <CircleDot className="h-4 w-4 mr-2 text-yellow-500" />
                標記為進行中
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("planned")}>
                <CircleDashed className="h-4 w-4 mr-2 text-neutral-400" />
                標記為計劃中
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 cursor-pointer"
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
