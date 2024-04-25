
export type ElearningCourse = {
    courseId: string,
    courseName: string,
    instructor: string,
    grade: string,
    raw_id: string
}

export interface AnnouncementDetails {
    content: string,
    attachments: {
        text: string,
        filesize: string,
        filename: string,
        url: string
    }[]
}

export interface Annoucement {
    courseId: string,
    courseName: string,
    date: string,
    title: string,
    announcer: string,
}

export type AnnouncementsQuery = {
    announcements: Annoucement[],
    pageCount: number
}