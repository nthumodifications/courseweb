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

const TimetablePage: NextPage = () => {

    const { timetableData } = useUserTimetable();
    const [vertical, setVertical] = useLocalStorage('timetable_vertical', false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const [openModal, closeModal] = useModal();


    //Check if URL has course code array, display share dialog.
    useEffect(() => {
        if (searchParams.has('semester_1121')) {
            const courseCodes = searchParams.get('semester_1121')?.split(',');
            console.log(courseCodes);
            openModal({
                children: <ShareRecievedDialog onClose={closeModal} semester={'semester_1121'} courseCodes={courseCodes!} />
            });
            router.replace('timetable');
        }
    }, []);
      
    return (
        <div className={`grid grid-cols-1 md:grid-rows-1 ${vertical? '':'md:grid-cols-[3fr_2fr]'} px-1 py-4 md:p-4 gap-4 md:gap-2`}>
            <div className="w-full h-full overflow-x-auto">
                <Timetable timetableData={timetableData} vertical={vertical} />
            </div>
            <TimetableCourseList vertical={vertical} setVertical={setVertical} />
        </div>
    )
}

export default TimetablePage;