'use client';
import FullLogo from "@/components/Branding/FullLogo";
import { useSession } from "next-auth/react";
import QRCode, { QRCodeSVG } from "qrcode.react";
import useSWR from "swr";

export const runtime = 'nodejs';

const StudentIDCard = () => {
    const { data, status } = useSession();
    const { data: token , error } = useSWR(data?.user.id, async (id) => {
        const res = await fetch(`/zh/student/code`)
        const data = await res.json()
        return data?.token;
    }, {
        refreshInterval: 5 * 60 * 1000,
    });

    if(status != 'authenticated') return <></>;

    return <div className="flex flex-col md:flex-row w-full max-w-3xl rounded-xl bg-neutral-800 p-6 gap-8">
        <div className="flex flex-col w-full rounded-xl bg-neutral-800 gap-8">
            <FullLogo/>
            <div className="flex flex-row">
                <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold">{data.user.name_zh}</h3>
                    <h3 className="text-base font-bold">{data.user.name_en}</h3>
                </div>
                <div className="flex flex-col">
                    <h3 className="text-base">Student ID:</h3>
                    <h3 className="text-base font-bold">{data.user.id}</h3>
                </div>
            </div>
            {/* <div className="flex flex-col">
                <h3 className="text-lg font-bold">電機資訊學院學士班</h3>
                <h3 className="text-base font-bold">Bachelor Program of Electrical Engineering and Computer Science</h3>
            </div> */}
        </div>
        <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-md">
                {token && <QRCodeSVG value={token} size={192}/>}
            </div>
        </div>
    </div>
}

const StudentPage = () => {
    return <div className="flex flex-col w-full h-full p-4">
        <StudentIDCard/>
    </div>
}

export default StudentPage;