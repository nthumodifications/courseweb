import authConfig from '@/app/api/auth/[...nextauth]/authConfig';
import SelectCourseButton from '@/components/Courses/SelectCourseButton';
import { getMinimalCourse } from '@/lib/course';
import { Alert, Button, Divider } from '@mui/joy';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import NTHULoginButton from '../../cds/NTHULoginButton';
import 'server-only';

type Props = {
    params: { courseId : string } 
}

export const runtime = "nodejs"

const TimetableCoursePage = async ({ params: { courseId }}: Props) => {
    const course = await getMinimalCourse(decodeURI(courseId));
    const session = await getServerSession(authConfig);

    if(!course) return redirect('/');


    return (
        
        <div className="grid grid-cols-1 lg:grid-cols-[auto_320px] py-6 px-4 text-gray-500 dark:text-gray-300">
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-gray-300">{course.semester} 學期</h4>
                            <h1 className="font-bold text-3xl mb-4 text-[#AF7BE4]">{`${course?.department} ${course?.course}-${course?.class}`}</h1>
                            <h2 className="font-semibold text-3xl text-gray-500 dark:text-gray-300 mb-2 flex flex-row flex-wrap gap-1">
                                <span>{course!.name_zh}</span> 
                                <span className="font-normal">{course?.teacher_zh?.join(',')?? ""}</span>
                            </h2>
                            <h2 className="font-semibold text-xl text-gray-500 dark:text-gray-300 flex flex-row flex-wrap gap-1">
                                <span>{course!.name_en}</span> 
                                <span className="font-normal">{course?.teacher_en?.join(',')?? ""}</span>
                            </h2>
                        </div>
                    </div>
                    <div className="space-y-4 w-[min(100vh,320px)]">
                        <div className="">
                            <h3 className="font-semibold text-base mb-2">時間地點</h3>
                        {course.venues? 
                            course.venues.map((vn, i) => <p key={vn} className='text-blue-600 dark:text-blue-400 text-sm'>{vn} <span className='text-black dark:text-white'>{course.times![i]}</span></p>) : 
                            <p>No Venues</p>
                        }
                        </div>
                        <SelectCourseButton courseId={course.raw_id}/>
                    </div>
                </div>
                <Divider/>
                {session ?<div className="space-y-4">
                    <h3 className="font-semibold text-base mb-2">修課同學</h3>
                    <Alert color="neutral">
                        <div className='flex flex-col gap-2'>
                            <h4 className="font-semibold text-base">是否想把自己放到名單上嗎？</h4>
                            <p>經過你的同意后將會把你的<pre className='inline mono'>名字</pre>,<pre className='inline'>學號</pre>,<pre className='inline'>Email</pre>,公開給其他有登入的同學</p>
                            <div className="flex flex-row gap-2">
                                <Button variant="outlined" color="danger">不同意</Button>
                                <Button variant="outlined" color="success">同意</Button>
                            </div>
                        </div>
                    </Alert>
                </div>:
                <div className="flex flex-col space-y-1 items-center py-4">
                    <h3 className='font-bold text-xl'>登入后才能開啓更多修課功能</h3>
                    <NTHULoginButton/>
                </div>}
            </div>
        </div>
    )
}

export default TimetableCoursePage;