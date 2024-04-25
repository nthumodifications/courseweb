type ELearningCoursePageProps = {
    params: {
        courseId: string
    }
}

const CoursePage = ({ params: { courseId }}: ELearningCoursePageProps) => {
    //!: courseId here is raw_id of the course
    return <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-2xl font-bold">Course Page</h1>
        <p>Course ID: {courseId}</p>
    </div>
}

export default CoursePage;