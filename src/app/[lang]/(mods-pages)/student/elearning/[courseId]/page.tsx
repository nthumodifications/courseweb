import { getCourse } from "@/lib/course"
import { getCoursePlatformId } from "@/lib/elearning"
import { ElearningCoursePage } from "./ElearningCoursePage"
import { redirect } from "next/navigation"

type ELearningCoursePageProps = {
    params: {
        courseId: string
    }
}

const CoursePage = async ({ params: { courseId }}: ELearningCoursePageProps) => {
    const { raw_id, platform, id } = await getCoursePlatformId(decodeURIComponent(courseId))
    const course = await getCourse(raw_id)
    if (!course) redirect('/student/elearning')
    //!: courseId here is raw_id of the course
    return <div className="mx-2 md:mx-2 h-full">
        <div className="flex flex-col gap-4 h-full md:flex-row">
            <ElearningCoursePage course={course} platform={platform} id={id} />
        </div>
    </div>
}

export default CoursePage;