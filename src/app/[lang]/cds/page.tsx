'use client';
import NTHUBirdIcon from "@/components/NTHUBirdIcon"
import CourseSearchbar from "@/components/Timetable/CourseSearchbar";
import Timetable from "@/components/Timetable/Timetable";
import getSupabaseServer from "@/config/supabase_server";
import { Alert, Button, CircularProgress, DialogActions, DialogContent, Divider, Modal, ModalClose, ModalDialog } from "@mui/joy"
import { signIn, useSession } from "next-auth/react"
import { FC, useState } from "react"
import useSWR from "swr";
import CdsFormContainer from "./CdsFormContainer";

const CdsFormBeforeSignIn: FC<{ isLoggingIn: boolean }> = ({ isLoggingIn }) => {
    return <div className="text-center space-y-3 py-4 w-full">
        <Button startDecorator={<NTHUBirdIcon/>} variant="outlined" color="neutral" onClick={() => signIn('nthu')}>Login with NTHU</Button>
    </div>
}

const CourseDemandSurvey = () => {
    const { data, status, update } = useSession();

    console.log(data, status);


    // if(true) return <CdsFormContainer/>

    return <div className="flex flex-col items-center justify-center h-full w-full" style={{background: "radial-gradient(159.94% 110.75% at 82.76% -5.79%, #FBA5FF 0%, #FFF 51.64%)", backdropFilter: 'blur(4px)'}}>
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
            <CdsFormBeforeSignIn isLoggingIn={status == 'loading'}/>
        </div>
        <CdsFormContainer/>
    </div>
}

export default CourseDemandSurvey
