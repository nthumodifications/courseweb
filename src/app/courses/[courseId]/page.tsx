import supabase from "@/config/supabase";
import {getCourse, getCoursePTTReview} from '@/lib/course';
import { Accordion, AccordionDetails, AccordionGroup, AccordionSummary, Chip, Divider } from "@mui/joy";
import { format } from "date-fns";
import { NextPage, ResolvingMetadata } from "next";

type PageProps = { 
    params: { courseId? : string } 
}

export async function generateMetadata({ params }: PageProps, parent: ResolvingMetadata) {
    const course = await getCourse(decodeURI(params.courseId as string));
    return {
        title: `${course?.department} ${course?.course} ${course!.name_zh} | NTHUMods `,
    }
}

const CourseDetailPage = async ({ params }: PageProps) => {
    const courseId = decodeURI(params.courseId as string);
    const course = await getCourse(courseId);

    const reviews = await getCoursePTTReview(courseId);
    console.log(reviews)

    return <div className="grid grid-cols-1 lg:grid-cols-[auto_320px]  py-6">
        <div className="space-y-2">
            <h1 className="font-bold text-3xl mb-4 text-fuchsia-800">{`${course?.department} ${course?.course}`}</h1>
            <h2 className="font-semibold text-3xl text-gray-500 mb-2">{course!.name_zh} - {course?.teacher_zh?.join(',')?? ""}</h2>
            <h2 className="font-semibold text-xl text-gray-500">{course!.name_en} - {course?.teacher_en?.join(',')?? ""}</h2>

            <p>Semester ID: {course?.raw_id} • Credits: {course?.credits}</p>
            <p>Language: {course?.language == '英' ? 'English' : 'Chinese'}</p>
            <p>Capacity: {course?.capacity} • Reserve: {course?.reserve}</p>
            <p>Class: {course?.class}</p>
            <Divider/>
            <div className="grid grid-cols-[auto_320px] gap-6">
                <div className="space-y-4">
                    <div className="">
                        <h3 className="font-semibold text-xl mb-2">Description</h3>
                        <p>{course?.備註}</p>
                    </div>
                    <div className="">
                    <Divider/>
                    <h3 className="font-semibold text-xl mb-2">PTT Reviews</h3>
                        <AccordionGroup>
                        {reviews?.map((m, index) => <Accordion key={index}>
                            <AccordionSummary>{index + 1}. Review from {format(new Date(m.date), 'yyyy-MM-dd')}</AccordionSummary>
                            <AccordionDetails>
                                <p className="whitespace-pre-line text-sm">{m.content}</p>
                            </AccordionDetails>
                        </Accordion>
                        )}
                        </AccordionGroup>
                    </div>
                </div>
                <div className="space-y-2">
                    <div>
                        <h3 className="font-semibold text-base mb-2">課程限制</h3>
                        <p>{course?.課程限制說明}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">跨領域</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.cross_discipline?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">一專</h3>
                        <div className="flex flex-row gap-2 flex-wrap">
                            {course?.first_specialization?.map((m, index) => <Chip key={index}>{m}</Chip>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base mb-2">二專</h3>
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