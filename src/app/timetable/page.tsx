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


const TimetablePage: NextPage = () => {

    const { timetableData } = useUserTimetable();

    const router = useRouter();
    const searchParams = useSearchParams();

    const [openModal, closeModal] = useModal();

    //Check if URL has course code array, display share dialog.
    useEffect(() => {
        if (searchParams.has('courses')) {
            const courseCodes = searchParams.get('courses')?.split(',');
            console.log(courseCodes);
            openModal({
                children: <ShareRecievedDialog onClose={closeModal} courseCodes={courseCodes!} />
            });
            router.push('/timetable');
        }
    }, []);
    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
            <Timetable timetableData={timetableData} />
            <TimetableCourseList />
        </div>
    )
}

export default TimetablePage;