'use client';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { IconButton } from '@mui/joy';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { semesterInfo } from '@/const/semester';
import { rocYear } from '@/helpers/roc';
import { Semester } from '@/types/courses';


const SemesterSwitcher = ({ semester, setSemester }: { semester: Semester, setSemester: (sem: Semester) => void }) => {
    const semesterObj = semesterInfo.find(s => s.id == semester)!;

    const hasPrev = semesterInfo.indexOf(semesterObj) > 0;
    const hasNext = semesterInfo.indexOf(semesterObj) < semesterInfo.length - 1;

    const goPrev = () => {
        if (!hasPrev) return;
        const prevSemester = semesterInfo[semesterInfo.indexOf(semesterObj) - 1];
        setSemester(prevSemester.id);
    }

    const goNext = () => {
        if (!hasNext) return;
        const nextSemester = semesterInfo[semesterInfo.indexOf(semesterObj) + 1];
        setSemester(nextSemester.id);
    }


    return <div className="flex flex-row items-center justify-center gap-4 px-4 py-2 w-full">
        <IconButton color="primary" disabled={!hasPrev} onClick={goPrev}>
            <ChevronLeft />
        </IconButton>
        <span className="text-lg font-bold">{rocYear(semesterObj.year)}-{semesterObj.semester} 學期</span>
        <IconButton color="primary" disabled={!hasNext} onClick={goNext}>
            <ChevronRight />
        </IconButton>
    </div>
}

export default SemesterSwitcher;