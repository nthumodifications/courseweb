import { Button } from "@courseweb/ui";
import { Check, CalendarOff } from "lucide-react";
import { SemesterDocType } from "../rxdb";
import { ResponsiveDialog } from "./responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dict.planner.semester.selectSemesterTitle}
    >
      <div className="grid gap-2 py-4">
        {semesters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {dict.planner.semester.noSemestersAvailable}
          </p>
        ) : (
          <>
            <Button
              variant={!currentSemester ? "default" : "outline"}
              className="w-full justify-start text-left"
              onClick={() => {
                onSemesterSelect("");
                onOpenChange(false);
              }}
            >
              <span className="flex items-center">
                {!currentSemester ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <CalendarOff className="mr-2 h-4 w-4" />
                )}
                {dict.planner.semester.noneOption}
              </span>
            </Button>
            {semesters.map((semester) => (
              <Button
                key={semester.id}
                variant={
                  currentSemester === semester.id ? "default" : "outline"
                }
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
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}
