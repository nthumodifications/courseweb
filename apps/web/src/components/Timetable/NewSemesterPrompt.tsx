import { useEffect, useState } from "react";
import { getNextCourseSemester } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const dismissalKey = (semester: string) =>
  `semester-prompt-dismissed:${semester}`;

const NewSemesterPrompt = ({
  onView,
}: {
  onView: (semester: string) => void;
}) => {
  useDefaultSemesterId();
  const dict = useDictionary();
  const nextSemester = getNextCourseSemester();
  const semesterId = nextSemester?.id;
  const [dismissedSemester, setDismissedSemester] = useState<string>();

  useEffect(() => {
    if (!semesterId) {
      setDismissedSemester(undefined);
      return;
    }
    try {
      setDismissedSemester(
        localStorage.getItem(dismissalKey(semesterId)) === "1"
          ? semesterId
          : undefined,
      );
    } catch {
      setDismissedSemester(undefined);
    }
  }, [semesterId]);

  if (!semesterId || dismissedSemester === semesterId) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissalKey(semesterId), "1");
    } catch {
      // Keep dismissal for this render when storage is unavailable.
    }
    setDismissedSemester(semesterId);
  };

  return (
    <div className="flex min-w-0 items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
      <button
        className="min-h-10 min-w-0 flex-1 truncate text-left hover:text-foreground"
        onClick={() => onView(semesterId)}
        type="button"
      >
        {dict.semester_cutover.prompt.replace(
          "{semester}",
          toPrettySemester(semesterId),
        )}
      </button>
      <button
        aria-label={dict.semester_cutover.dismiss}
        className="min-h-10 min-w-10 text-base hover:text-foreground"
        onClick={dismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
};

export default NewSemesterPrompt;
