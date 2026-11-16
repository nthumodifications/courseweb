import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDefaultSemester } from "@courseweb/shared";
import { rocYear } from "@/helpers/roc";
import { Semester } from "@/types/courses";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useSemesters } from "@/hooks/useSemesters";

const SemesterSwitcher = ({
  semester,
  setSemester,
}: {
  semester: Semester;
  setSemester: (sem: Semester) => void;
}) => {
  const dict = useDictionary();
  const semesters = useSemesters();
  const semesterObj =
    semesters.find((s) => s.id === semester) ?? getDefaultSemester();

  const semesterIndex = semesters.indexOf(semesterObj);
  const hasPrev = semesterIndex > 0;
  const hasNext = semesterIndex < semesters.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    const prevSemester = semesters[semesterIndex - 1];
    setSemester(prevSemester.id);
  };

  const goNext = () => {
    if (!hasNext) return;
    const nextSemester = semesters[semesterIndex + 1];
    setSemester(nextSemester.id);
  };

  return (
    <div className="flex flex-row items-center justify-center gap-4 px-4 py-2 w-full">
      <Button
        variant="ghost"
        size="icon"
        aria-label={dict.calendar.accessibility.previous_period}
        disabled={!hasPrev}
        onClick={goPrev}
      >
        <ChevronLeft />
      </Button>
      <span className="text-lg font-bold">
        {rocYear(semesterObj.year)}-{semesterObj.semester}{" "}
        {dict.timetable.semester_suffix}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={dict.calendar.accessibility.next_period}
        disabled={!hasNext}
        onClick={goNext}
      >
        <ChevronRight />
      </Button>
    </div>
  );
};

export default SemesterSwitcher;
