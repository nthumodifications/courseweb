"use client";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { semesterInfo } from "@/const/semester";
import { rocYear } from "@/helpers/roc";
import { Semester } from "@/types/courses";
import { Button } from "@/components/ui/button";

const SemesterSwitcher = ({
  semester,
  setSemester,
}: {
  semester: Semester;
  setSemester: (sem: Semester) => void;
}) => {
  const semesterObj = semesterInfo.find((s) => s.id == semester)!;

  const hasPrev = semesterInfo.indexOf(semesterObj) > 0;
  const hasNext = semesterInfo.indexOf(semesterObj) < semesterInfo.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    const prevSemester = semesterInfo[semesterInfo.indexOf(semesterObj) - 1];
    setSemester(prevSemester.id);
  };

  const goNext = () => {
    if (!hasNext) return;
    const nextSemester = semesterInfo[semesterInfo.indexOf(semesterObj) + 1];
    setSemester(nextSemester.id);
  };

  return (
    <div className="flex flex-row items-center justify-center gap-4 px-4 py-2 w-full">
      <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={goPrev}>
        <ChevronLeft />
      </Button>
      <span className="text-lg font-bold">
        {rocYear(semesterObj.year)}-{semesterObj.semester} 學期
      </span>
      <Button variant="ghost" size="icon" disabled={!hasNext} onClick={goNext}>
        <ChevronRight />
      </Button>
    </div>
  );
};

export default SemesterSwitcher;
