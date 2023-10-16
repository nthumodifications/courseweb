import supabase from "@/config/supabase";
import { getDictionary } from "@/dictionaries/dictionaries";
import {getCourse, getCoursePTTReview} from '@/lib/course';
import { LangProps } from "@/types/pages";
import { Accordion, AccordionDetails, AccordionGroup, AccordionSummary, Alert, Chip, Divider } from "@mui/joy";
import { format } from "date-fns";
import { NextPage, ResolvingMetadata } from "next";
import { AlertTriangle } from "react-feather";

type PageProps = { 
    params: { courseId? : string } 
}

export async function generateMetadata({ params }: PageProps, parent: ResolvingMetadata) {
    const course = await getCourse(decodeURI(params.courseId as string));
    return {
        title: `${course?.department} ${course?.course}-${course?.class} ${course!.name_zh} ${course!.name_en} | NTHUMods`,
        description: `${course!.name_zh} ${course!.name_en} | ${course!.teacher_zh?.join(',')} ${course!.teacher_en?.join(',')} `
    }
}

const CourseDetailPage = async ({ params }: PageProps & LangProps) => {
    const courseId = decodeURI(params.courseId as string);
    const course = await getCourse(courseId);

    const reviews = await getCoursePTTReview(courseId);
    const dict = await getDictionary(params.lang);

    return <div className="grid grid-cols-1 lg:grid-cols-[auto_320px]  py-6 px-4">
        <div className="space-y-2">
            <h1 className="font-bold text-3xl mb-4 text-fuchsia-800">{`${course?.department} ${course?.course}-${course?.class}`}</h1>
            <h2 className="font-semibold text-3xl text-gray-500 mb-2">{course!.name_zh} - {course?.teacher_zh?.join(',')?? ""}</h2>
            <h2 className="font-semibold text-xl text-gray-500">{course!.name_en} - {course?.teacher_en?.join(',')?? ""}</h2>

            <p>{dict.course.details.semesterid}: {course?.raw_id} • {dict.course.credits}: {course?.credits}</p>
            <p>{dict.course.details.language}: {course?.language == '英' ? 'English' : 'Chinese'}</p>
            <p>{dict.course.details.capacity}: {course?.capacity} • {dict.course.details.reserved}: {course?.reserve}</p>
            <p>{dict.course.details.class}: {course?.class}</p>
            <Divider/>
            <div className="grid grid-cols-1 md:grid-cols-[auto_320px] gap-6">
                <div className="space-y-4">
                    <div className="">
                        <h3 className="font-semibold text-xl mb-2">{dict.course.details.description}</h3>
                        <p>{course?.備註}</p>
                    </div>
                    <Divider/>
                    {reviews.length > 0 && <div className="">
                    <h3 className="font-semibold text-xl mb-2">{dict.course.details.ptt_title}</h3>
                        <Alert variant="soft" color="warning" className="mb-4" startDecorator={<AlertTriangle/>}>
                            {dict.course.details.ptt_disclaimer}
                        </Alert>
                        <AccordionGroup>
                        {reviews.map((m, index) => 
                            <Accordion key={index}>
                                <AccordionSummary>{index + 1}. Review from {format(new Date(m.date), 'yyyy-MM-dd')}</AccordionSummary>
                                <AccordionDetails>
                                    <p className="whitespace-pre-line text-sm">{m.content}</p>
                                </AccordionDetails>
                            </Accordion>
                        )}
                        </AccordionGroup>
                    </div>}
                </div>
                <div className="space-y-2">
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.restrictions}</h3>
                        <p>{course?.課程限制說明}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.compulsory}</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.compulsory_for?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.elective}</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.elective_for?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.cross_discipline}</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.cross_discipline?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.first_specialization}</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.first_specialization?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">{dict.course.details.second_specialization}</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.second_specialization?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
}

export default CourseDetailPage;