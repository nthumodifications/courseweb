import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { SemesterDocType } from "../rxdb";

interface SemesterSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesters: SemesterDocType[];
  currentSemester?: string | null;
  onSemesterSelect: (semester: string) => void;
}

export function SemesterSelectionDialog({
  open,
  onOpenChange,
  semesters,
  currentSemester,
  onSemesterSelect,
}: SemesterSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>選擇學期</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {semesters.map((semester) => (
            <Button
              key={semester.id}
              variant={currentSemester === semester.id ? "default" : "outline"}
              className="w-full justify-start text-left"
              onClick={() => {
                onSemesterSelect(semester.id);
                onOpenChange(false);
              }}
            >
              <span className="flex items-center">
                {currentSemester === semester.id && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {currentSemester !== semester.id && (
                  <div className="w-4 mr-2" />
                )}
                {semester.name}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
