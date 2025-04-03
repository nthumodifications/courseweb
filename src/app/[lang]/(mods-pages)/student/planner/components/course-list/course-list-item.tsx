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
  Calendar,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  X,
} from "lucide-react";

import { CourseStatus } from "../../types";
import { FolderDocType, ItemDocType, SemesterDocType } from "@/config/rxdb";

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

export function CourseListItem({
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
  const [isHovering, setIsHovering] = useState(false);

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
    setDropdownOpen(false);
    onStatusChange(status);
  };

  const handleEdit = () => {
    setDropdownOpen(false);
    onEdit();
  };

  const handleDeleteCourse = () => {
    setDropdownOpen(false);
    onDeleteCourse();
  };

  const handleSemesterChange = (semester: string) => {
    setDropdownOpen(false);
    onSemesterChange(semester);
  };

  const getParentName = () => {
    const parentFolder = folders.find((folder) => folder.id === course.parent);
    return parentFolder ? parentFolder.title : "無";
  };

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
