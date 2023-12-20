'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { NextPage } from "next";
import useUserTimetable from "@/hooks/useUserTimetable";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import { useEffect } from "react";
import { useModal } from "@/hooks/contexts/useModal";
import TimetableCourseList from "@/components/Timetable/TimetableCourseList";
import ShareRecievedDialog from "@/components/Timetable/ShareRecievedDialog";
import { useLocalStorage } from "usehooks-ts";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { CourseTimeslotDataWithFraction, TimetableDim } from "@/types/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import Link from "next/link";
import TimetableSlotVertical from "@/components/Timetable/TimetableSlotVertical";
import TimetableSlot from "@/components/Timetable/TimetableSlot";


const TimetablePage: NextPage = () => {

    const { timetableData, semester, setSemester } = useUserTimetable();
    const { language } = useSettings();
    const [vertical, setVertical] = useLocalStorage('timetable_vertical', false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const [openModal, closeModal] = useModal();


    //Check if URL has course code array, display share dialog.
    useEffect(() => {
        if (searchParams.size > 0) {
            //get all entries with the key 'semester_{semesterId}'
            const courseCodes: { [sem: string]: string[] } = {};
            searchParams.forEach((value, key) => {
                if (key.startsWith('semester_')) {
                    courseCodes[key.replace('semester_', '')] = value.split(',').map(decodeURI);
                }
            });
            openModal({
                children: <ShareRecievedDialog onClose={closeModal} courseCodes={courseCodes!} />
            });
            router.replace('timetable');
        }
    }, []);

    const renderTimetableSlot = (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical?: boolean) => {
        // return <Link href={`/${language}/timetable/${course.course.raw_id}`}>
        // {vertical ? 
        //   <TimetableSlotVertical 
        //     course={course} 
        //     tableDim={tableDim} 
        //     fraction={course.fraction} 
        //     fractionIndex={course.fractionIndex} />
        //   :
        //   <TimetableSlot 
        //     course={course} 
        //     tableDim={tableDim} 
        //     fraction={course.fraction} 
        //     fractionIndex={course.fractionIndex} />
        // }
        // </Link>
        return vertical ? 
          <TimetableSlotVertical 
            course={course} 
            tableDim={tableDim} 
            fraction={course.fraction} 
            fractionIndex={course.fractionIndex} />
          :
          <TimetableSlot 
            course={course} 
            tableDim={tableDim} 
            fraction={course.fraction} 
            fractionIndex={course.fractionIndex} />
        
      }

    return (
        <div className="flex flex-col w-full h-full">
            <SemesterSwitcher semester={semester} setSemester={setSemester}/>
            <div className={`grid grid-cols-1 md:grid-rows-1 ${vertical ? '' : 'md:grid-cols-[3fr_2fr]'} px-1 py-4 md:p-4 gap-4 md:gap-2`}>
                <div className="w-full h-full">
                    <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
                </div>
                <TimetableCourseList vertical={vertical} setVertical={setVertical} />
            </div>
        </div>
    )
}

export default TimetablePage;