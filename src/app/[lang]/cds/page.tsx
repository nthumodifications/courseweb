import NTHUBirdIcon from "@/components/NTHUBirdIcon"
import { Alert, Button, Divider } from "@mui/joy";
import { signIn, useSession } from "next-auth/react"
import { FC } from "react";
import CdsFormContainer from "./CdsFormContainer";
import { cookies } from "next/headers";
import {getServerSession} from 'next-auth';
import NTHULoginButton from "./NTHULoginButton";

const CourseDemandSurvey = async () => {
    const cookieStore = cookies()
    const theme = cookieStore.get('theme');
    const darkMode = theme?.value == 'dark';
    const session = await getServerSession();

    if(session) return <CdsFormContainer/>
    else return <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: darkMode ? "" : "radial-gradient(213.94% 85.75% at 93.76% -9.79%, rgb(251, 165, 255) 0%, rgb(255, 255, 255) 29.64%)", backdropFilter: 'blur(4px)' }}>
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
            <NTHULoginButton/>
        </div>
        {/* <CdsFormContainer /> */}
    </div>
}

export default CourseDemandSurvey
