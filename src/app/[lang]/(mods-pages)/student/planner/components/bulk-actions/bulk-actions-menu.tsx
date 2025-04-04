import {
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  SquareCheckBig,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemesterDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { CourseStatus } from "../../types";

interface BulkActionsMenuProps {
  selectedCount: number;
  semesterData: SemesterDocType[];
  onStatusChange: (status: CourseStatus) => void;
  onSemesterChange: (semesterId: string) => void;
  onDelete: () => void;
  onClearSelections: () => void;
}

export function BulkActionsMenu({
  selectedCount,
  semesterData,
  onStatusChange,
  onSemesterChange,
  onDelete,
  onClearSelections,
}: BulkActionsMenuProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-800 border border-border rounded-lg shadow-lg p-2 z-50 transition-all duration-200 flex items-center gap-2">
      <div className="flex items-center bg-neutral-900 px-3 py-1 rounded-md mr-2">
        <SquareCheckBig className="h-4 w-4 text-primary mr-1" />
        <span className="text-sm font-medium">{selectedCount} 已選擇</span>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => onStatusChange("completed")}
          title="標記為已完成"
        >
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => onStatusChange("in-progress")}
          title="標記為進行中"
        >
          <CircleDot className="h-4 w-4 text-yellow-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => onStatusChange("planned")}
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
        <DropdownMenuContent className="bg-neutral-800 border-border">
          {semesterData.map((semester) => (
            <DropdownMenuItem
              key={semester.id}
              className="text-white hover:bg-neutral-700 cursor-pointer"
              onClick={() => onSemesterChange(semester.id)}
            >
              {semester.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="border-l border-border pl-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-red-500 hover:text-red-400 hover:bg-red-900/20"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          <span>刪除</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 ml-1"
        onClick={onClearSelections}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
