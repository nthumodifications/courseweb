import { Alert, Divider } from "@mui/joy";
import CdsFormContainer from "./CdsFormContainer";
import { cookies } from "next/headers";
import NTHULoginButton from "./NTHULoginButton";
import { isUserSubmitted } from '@/lib/cds_actions';
import { SubmissionStatus } from "@/types/cds_courses";
import { getServerSession } from "next-auth";
import { signOut } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import authConfig from "@/app/api/auth/[...nextauth]/authConfig";

const CourseDemandSurvey = async () => {
    const cookieStore = cookies()
    const theme = cookieStore.get('theme');
    const darkMode = theme?.value == 'dark';
    const session = await getServerSession(authConfig);
    const user = session?.user;

    //TODO: change according to actual term
    const term = '112-2';
    const submitState = await isUserSubmitted(term);

    if (submitState == SubmissionStatus.NOT_SUBMITTED) return <CdsFormContainer term={term} />
    else return <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: darkMode ? "" : "radial-gradient(213.94% 85.75% at 93.76% -9.79%, rgb(251, 165, 255) 0%, rgb(255, 255, 255) 29.64%)", backdropFilter: 'blur(4px)' }}>
        <div className="flex flex-col items-center justify-center max-w-xl space-y-2 w-[min(100vw,64rem)] px-2 py-4">
            <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                <h1 className="text-4xl font-bold">選課規劃調查</h1>
                <h2 className="text-2xl font-semibold">{term} 學期</h2>
            </div>
            <Divider />
            <div className="text-left space-y-3 py-4 w-full text-gray-700 dark:text-gray-200">
                <h2 className="text-2xl font-semibold">宗旨</h2>
                <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris semper condimentum neque quis cursus. Sed sollicitudin neque ac nisl scelerisque, ac faucibus urna euismod. 
                <br/>
                Praesent vulputate dignissim velit, quis rutrum elit. Curabitur non tellus nisl. Mauris a vehicula orci. Integer ornare auctor orci, vitae varius elit commodo eget.
                <br/>
                Nullam accumsan vel leo sed pulvinar. Vestibulum ut elit sit amet urna bibendum porta. Mauris id nulla consequat, mollis ipsum facilisis, lobortis lectus. Morbi mattis dolor felis, non consequat mi dignissim ut. Pellentesque vestibulum tempus gravida. Nunc porttitor nibh dictum ante accumsan, facilisis sodales tellus condimentum. Praesent dolor magna, viverra a vulputate vitae, hendrerit nec neque. Phasellus volutpat convallis justo. Integer ornare ultrices justo, non ultricies lacus molestie nec.
                <br/>


                </p>
                <p>開放時間：2021/10/18 00:00 ~ 2021/10/24 23:59</p>
            </div>
            <Divider />
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

        </div>
        {/* <CdsFormContainer /> */}
    </div>
}

export default CourseDemandSurvey
