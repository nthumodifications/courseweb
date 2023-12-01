import { Alert, Divider } from "@mui/joy";
import CdsFormContainer from "./CdsFormContainer";
import { cookies } from "next/headers";
import NTHULoginButton from "./NTHULoginButton";
import { getCurrentCdsTerm, isUserSubmitted } from '@/lib/cds_actions';
import { SubmissionStatus } from "@/types/cds_courses";
import { getServerSession } from "next-auth";
import LogoutButton from "./LogoutButton";
import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

const CourseDemandSurvey = async () => {
    const cookieStore = cookies()
    const theme = cookieStore.get('theme');
    const darkMode = theme?.value == 'dark';
    const session = await getServerSession(authConfig);
    const user = session?.user;
    const termObj = await getCurrentCdsTerm();

    const isOpen = new Date(termObj.starts) <= new Date() && new Date(termObj.ends) >= new Date();

    const submitState = await isUserSubmitted(termObj.term);

    if (submitState == SubmissionStatus.NOT_SUBMITTED) return <CdsFormContainer termObj={termObj} />
    else return <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: darkMode ? "" : "radial-gradient(213.94% 85.75% at 93.76% -9.79%, rgb(251, 165, 255) 0%, rgb(255, 255, 255) 29.64%)", backdropFilter: 'blur(4px)' }}>
        <div className="flex flex-col items-center justify-center max-w-xl space-y-2 w-[min(100vw,64rem)] px-2 py-4">
            <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                <h1 className="text-4xl font-bold">選課規劃調查 - {termObj.term} 學期</h1>
                <p className="text-xl">國立清華大學電機資訊學院學士班</p>
            </div>
            <Divider />
            <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                <h2 className="text-xl font-semibold">宗旨</h2>
                <p className="text-sm leading-relaxed">
                    爲了進一步了解學生的修課需求，國立清華大學電資院學士班(EECS)系辦將於每學期初進行選課規劃調查，以了解學生的修課需求，並規劃課程的開設。
                    <br/>
                    <br/>
                    如果您有興趣修讀電機系、資工系或電資學士班的課程，請填寫以下問卷，以協助我們規劃課程。
                </p>
                <Divider />
                <p className="text-sm">
                    In order to better understand the course demand of students, the EECS department of National Tsing Hua University will conduct a course demand survey at the beginning of each semester to understand the course demand of students and plan the course offerings.
                    <br/>
                    <br/>
                    If you are interested in taking courses offered by the EE, CS and EECS department, please fill out the following questionnaire to help us plan the courses.
                </p>
                <Alert color="warning">
                    <div className="flex flex-row gap-2">
                        <div>
                            <AlertTriangle />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-lg">注意事項</h4>
                            <p>
                                這一輪的調查僅為測試網站的運作，如果您遇到任何問題，請注意並聯絡丘子輝（<a target="_blank" href="mailto:chewtzihwee@gmail.com">chewtzihwee@gmail.com</a>）或到 <a target="_blank" href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=[CDS]">Github Issues</a>填寫。
                                您的回答將不會計入正式調查。正式的調查將由系辦正式公布。
                            </p>
                        </div>
                    </div>
                </Alert>
                <p>開放時間：{format(new Date(termObj.starts), 'yyyy/MM/dd HH:mm')} ~ {format(new Date(termObj.ends), 'yyyy/MM/dd HH:mm')}</p>
                
            </div>
            <Divider />
            {!isOpen && <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                <h2 className="text-2xl font-semibold">尚未開放</h2>
            </div>}
            {isOpen && <>
                {submitState == SubmissionStatus.NOT_ALLOWED && <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                    <h2 className="text-2xl font-semibold">此賬號無法填寫</h2>
                    <LogoutButton />
                </div>}
                {submitState == SubmissionStatus.SUBMITTED && <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                    <h2 className="text-2xl font-semibold">已提交</h2>
                    <p>感謝您的填寫~</p>
                    <br/>
                    <p>目前登入的是 <span className="font-bold">{user?.name_zh} ({user?.id})</span>.</p>
                    <LogoutButton />
                </div>}
                {submitState == SubmissionStatus.NOT_LOGGED_IN && <NTHULoginButton />}
            </>}
        </div>
        {/* <CdsFormContainer /> */}
    </div>
}

export default CourseDemandSurvey
