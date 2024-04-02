// code = courseId in courses page, could be used for syllabus?
export type ElearningCourseObject = {
    courseId: string,
    courseName: string,
    instructor: string,
    grade: string,
    code: string
}

export type ElearningAnnouncementObject = {
    announcements: {
        courseId: number,
        courseName: string,
        date: string,
        title: string,
        announcer: string,
        details: {
            content: string,
            attachments: string
        },
    }[],
    pageCount: number
}