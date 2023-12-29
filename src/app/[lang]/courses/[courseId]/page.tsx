import { format } from "date-fns";
import { ResolvingMetadata } from "next";
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from "next/link";
import DownloadSyllabus from "./DownloadSyllabus";
import Fade from "@/components/Animation/Fade";
import { getDictionary } from "@/dictionaries/dictionaries";
import { getCoursePTTReview, getCourseWithSyllabus } from '@/lib/course';
import { LangProps } from "@/types/pages";
import {toPrettySemester} from '@/helpers/semester';
import CourseTagList from "@/components/Courses/CourseTagsList";
import SelectCourseButton from '@/components/Courses/SelectCourseButton';
import { createTimetableFromCourses } from "@/helpers/timetable";
import Timetable from "@/components/Timetable/Timetable";
import { MinimalCourse } from "@/types/courses";
import {hasTimes, getScoreType} from '@/helpers/courses';
import supabase_server from "@/config/supabase_server";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from "@/components/ui/badge"


type PageProps = { 
    params: { courseId? : string } 
}

export async function generateMetadata({ params }: PageProps, parent: ResolvingMetadata) {
    const course = await getCourseWithSyllabus(decodeURI(params.courseId as string));

    if(!course) return {
        ...parent,
        title: '404',
        description: '找不到課程'
    }

    return {
        ...parent,
        title: `${course?.department} ${course?.course}-${course?.class} ${course!.name_zh} ${course!.name_en}`,
        description: `${course!.teacher_zh?.join(',')} ${course!.teacher_en?.join(',')} \n ${course!.course_syllabus.brief}`
    }
}

const TOCNavItem = ({ href, children, active = false }: { href: string, children: React.ReactNode, active?: boolean }) => {
    return  <a href={href} className="flex flex-row gap-2">
        <div className={`w-1 h-full ${active? 'bg-blue-500':'bg-gray-300 dark:bg-neutral-700'}`}></div>
        <span className="text-sm py-2">{children}</span>
    </a>
}

const getOtherClasses = async (course: MinimalCourse) => {
    const { data, error } = await supabase_server
        .from('courses')
        .select('*, course_scores(*)')
        .eq('department', course.department)
        .eq('course', course.course)
        .not('raw_id', 'eq', course.raw_id)
        .order('raw_id', { ascending: false })

    if(error) throw error;
    if(!data) throw new Error('No data');
    return data;
}

const CourseDetailPage = async ({ params }: PageProps & LangProps) => {
    const courseId = decodeURI(params.courseId as string);
    const course = await getCourseWithSyllabus(courseId);

    if(!course) return <div className="py-6 px-4">
        <div className="flex flex-col gap-2 border-l border-neutral-500 pl-4 pr-6">
            <h1 className="text-2xl font-bold">404</h1>
            <p className="text-xl">找不到課程</p>
            
            <Link href="../">
                <Button size="sm" variant="outline"><ChevronLeft/> Back</Button>
            </Link>
        </div>
    </div>

    const reviews = await getCoursePTTReview(courseId);
    const otherClasses = await getOtherClasses(course as MinimalCourse);
    const dict = await getDictionary(params.lang);

    // times might not be available, check if it is empty list or its items are all empty strings
    const showTimetable = hasTimes(course as MinimalCourse);

    const timetableData = showTimetable ? createTimetableFromCourses([course as MinimalCourse]): [];

    return <Fade>
        <div className="grid grid-cols-1 xl:grid-cols-[auto_240px] py-6 px-4 text-gray-500 dark:text-gray-300">
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-gray-300">{toPrettySemester(course.semester)} 學期</h4>
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
                        <CourseTagList course={course}/>
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
                <Separator/>
                <div className="grid grid-cols-1 md:grid-cols-[auto_320px] gap-6 ">
                    <div className="space-y-4">
                        <div className="">
                            <h3 className="font-semibold text-xl mb-2" id="brief">{dict.course.details.brief}</h3>
                            <p className="whitespace-pre-line text-sm">{course.course_syllabus.brief}</p>
                        </div>
                        <div className="">
                            <h3 className="font-semibold text-xl mb-2"  id="description">{dict.course.details.description}</h3>
                            <p className="whitespace-pre-line text-sm">
                            {course.course_syllabus.content ?? <>
                                <DownloadSyllabus courseId={course.raw_id}/>
                            </>}</p>
                        </div>
                        {course?.prerequisites && <div className="">
                            <h3 className="font-semibold text-xl mb-2" id="prerequesites">擋修</h3>
                            <div dangerouslySetInnerHTML={{ __html: course.prerequisites }} />
                        </div>}
                        {showTimetable && <div className="">
                            <h3 className="font-semibold text-xl mb-2" id="timetable">時間表</h3>
                            <Timetable timetableData={timetableData}/>
                        </div>}
                        {reviews.length > 0 && <div className="">
                        <h3 className="font-semibold text-xl mb-2" id="ptt">{dict.course.details.ptt_title}</h3>
                            <Alert>
                                <AlertTriangle/>
                                <AlertDescription>
                                    {dict.course.details.ptt_disclaimer}
                                </AlertDescription>
                            </Alert>
                            <Accordion type="single" collapsible className="w-full">
                            {reviews.map((m, index) => 
                                <AccordionItem key={index} value={m.date}>
                                    <AccordionTrigger>{index + 1}. {format(new Date(m.date), 'yyyy-MM-dd')} 的心得</AccordionTrigger>
                                    <AccordionContent>
                                        <p className="whitespace-pre-line text-sm">{m.content}</p>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                            </Accordion>
                        </div>}
                        <h3 className="font-semibold text-xl mb-2" id="other">相同課號資料</h3>
                        <div className="flex flex-row items-center gap-2 overflow-hidden flex-wrap">
                            {otherClasses.map((m, index) =>
                                <Link key={index}  className="flex flex-col w-[240px]" href={`/courses/${m.raw_id}`}>
                                    <h2 className="text-base font-medium text-gray-800 dark:text-neutral-200">{toPrettySemester(m.semester)} 學期</h2>
                                    <h2 className="text-base font-medium text-gray-600 dark:text-neutral-400">{m.department} {m.course}-{m.class} {m.name_zh}</h2>
                                    <h2 className="text-sm font-medium text-gray-600 dark:text-neutral-400">{m.name_en}</h2>
                                    <h3 className="text-sm font-medium text-gray-600 dark:text-neutral-400">{m.teacher_zh?.join(',')}</h3>
                                    {m.course_scores && <div>
                                        <Separator/>
                                        <div className="flex flex-row gap-1 text-sm font-medium text-gray-600 dark:text-neutral-400">
                                            <p>平均{getScoreType(m.course_scores.type)} {m.course_scores.average}</p>
                                            <p>標準差 {m.course_scores.std_dev}</p>
                                        </div>
                                    </div>}
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <h3 className="font-semibold text-base mb-2">備注</h3>
                            <p className="text-sm">{course.note ?? "-"}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.restrictions}</h3>
                            <p className="text-sm">{course.restrictions ?? "-"}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.compulsory}</h3>
                            <div className="flex flex-row gap-2 flex-wrap">
                                {course.compulsory_for?.map((m, index) => <Badge key={index}>{m}</Badge>)}
                                {course.compulsory_for?.length == 0 && <p>-</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.elective}</h3>
                            <div className="flex flex-row gap-2 flex-wrap">
                                {course.elective_for?.map((m, index) => <Badge key={index}>{m}</Badge>)}
                                {course.elective_for?.length == 0 && <p>-</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.cross_discipline}</h3>
                            <div className="flex flex-row gap-2 flex-wrap">
                                {course.cross_discipline?.map((m, index) => <Badge key={index}>{m}</Badge>)}
                                {course.cross_discipline?.length == 0 && <p>-</p>}
                                
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.first_specialization}</h3>
                            <div className="flex flex-row gap-2 flex-wrap">
                                {course.first_specialization?.map((m, index) => <Badge key={index}>{m}</Badge>)}
                                {course.first_specialization?.length == 0 && <p>-</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-2">{dict.course.details.second_specialization}</h3>
                            <div className="flex flex-row gap-2 flex-wrap">
                                {course.second_specialization?.map((m, index) => <Badge key={index}>{m}</Badge>)}
                                {course.second_specialization?.length == 0 && <p>-</p>}
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
            <div className="hidden md:flex flex-col gap-1 px-2">
                {/* Table of Contents */}
                <div className="flex flex-col gap-1 sticky top-0 py-4">
                    <h3 className="font-semibold text-base mb-2 pl-3">目錄</h3>
                    <div className="flex flex-col">
                        <TOCNavItem href="#brief">{dict.course.details.brief}</TOCNavItem>
                        <TOCNavItem href="#description">{dict.course.details.description}</TOCNavItem>
                        {course?.prerequisites && <TOCNavItem href="#prerequesites">擋修</TOCNavItem>}
                        {showTimetable && <TOCNavItem href="#timetable">時間表</TOCNavItem>}
                        {reviews.length > 0 && <TOCNavItem href="#ptt">PTT心得</TOCNavItem>}
                        <TOCNavItem href="#other">相同課號資料</TOCNavItem>
                    </div>
                </div>
            </div>
        </div>
    </Fade>
}

export default CourseDetailPage;