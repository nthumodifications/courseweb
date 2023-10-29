'use client';
import NTHUBirdIcon from "@/components/NTHUBirdIcon"
import CourseSearchbar from "@/components/Timetable/CourseSearchbar";
import getSupabaseServer from "@/config/supabase_server";
import { Alert, Button, CircularProgress, DialogActions, DialogContent, Divider, Modal, ModalClose, ModalDialog } from "@mui/joy"
import { signIn, useSession } from "next-auth/react"
import { FC, useState } from "react"
import useSWR from "swr";

const getCdsCourses = async () => {
    const supabase = await getSupabaseServer();
    const { data: _data = [], error } = await supabase.from('cds_courses').select('*');
    if(error) throw error;
    return _data;
}

type CdsPreferences = {
    courseTitle: string;
    courseId: string;
    courseCredits: number;
}
type CdsSubmission = {
    studentId?: string;
    name_zh?: string;
    preferences: Array<CdsPreferences>;
}

type CdsCoursesDefinition = any;


const CdsCoursesForm:FC<{
    initialSubmission:  CdsSubmission;
    cdsCoursesList: CdsCoursesDefinition[];
}> = ({ initialSubmission, cdsCoursesList }) => {
    const [preferences, setPreferences] = useState<CdsPreferences[]>(initialSubmission.preferences);

    return <div className="flex flex-col rounded-sm border border-gray-400">
        <CourseSearchbar onAddCourse={console.log}/>
    </div>
}


const CdsFormContainer = () => {
    const { data: cdsCoursesList = [], error, isLoading } = useSWR(['cds_courses'], getCdsCourses)
    
    if(isLoading) return <CircularProgress/>

    if(error) return <Modal open>
        <ModalDialog>
            <ModalClose/>
            
            <DialogContent>
                Error occurred while loading courses.
            </DialogContent>
            <DialogActions>
                <Button>Close</Button>
            </DialogActions>
        </ModalDialog>
    </Modal>

    return (
        <CdsCoursesForm initialSubmission={{ preferences: [] }} cdsCoursesList={cdsCoursesList!}/>
    )
}

const CdsFormBeforeSignIn: FC<{ isLoggingIn: boolean }> = ({ isLoggingIn }) => {
    return <div className="text-center space-y-3 py-4 w-full">
        <Button startDecorator={<NTHUBirdIcon/>} variant="outlined" color="neutral" onClick={() => signIn('nthu')}>Login with NTHU</Button>
    </div>
}

const CourseDemandSurvey = () => {
    const { data, status, update } = useSession();
    return <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="flex flex-col items-center justify-center max-w-xl space-y-2 w-[64rem]">
            <div className="text-left space-y-3 py-4 w-full text-gray-700">
                <h1 className="text-4xl font-bold">選課意願調查</h1>
                <h2 className="text-2xl font-semibold">112-2 學期</h2>
            </div>
            <Divider />
            <div className="text-left space-y-3 py-4 w-full text-gray-700">
                <h2 className="text-2xl font-semibold">宗旨</h2>
                <p>電機資訊學院學士班的系辦爲了更瞭解熱門的課程，協助調整内部的資源，因此推動了選課意願調查。</p>
                <p>同學們請務必填寫，可以在選項中填寫這學期想修的課程（最多5們）。</p>
                <Alert>這裏的調查并不會提供選課優先權，但是依據教授需求可能會參考名單。</Alert>
                <p>開放時間：2021/10/18 00:00 ~ 2021/10/24 23:59</p>
            </div>
            <Divider />
            <CdsFormContainer/>
            {/* {status == 'authenticated' ? <CdsFormContainer/> : <CdsFormBeforeSignIn isLoggingIn={status == 'loading'}/>} */}
        </div>
    </div>
}

export default CourseDemandSurvey
