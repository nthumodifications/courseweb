'use client';
import { useEffect, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "./page.actions";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { Textarea } from "@/components/ui/textarea"

const CommentEditor = ({ courseId }: { courseId: string; }) => {
    return <div className="flex flex-col">
        <Textarea placeholder="Write your comment here..." />
        <div className="flex justify-end">
            <button className="btn btn-primary">Submit</button>
        </div>
    </div>
}

export const CommentsContainer = ({ courseId }: { courseId: string; }) => {
    const { getACIXSTORE } = useHeadlessAIS();
    const [comments, setComments] = useState<Awaited<ReturnType<typeof getComments>>>([]);
    useEffect(() => { getComments(courseId).then(setComments); }, [courseId]);
    const [isUserTakenCourse, setIsUserTakenCourse] = useState(false);

    useEffect(() => {
        (async () => {
            const token = await getACIXSTORE();
            if (!token) return;
            const res = await getStudentCourses(token);
            if (!res) return;
            if(res.courses.includes(courseId)) setIsUserTakenCourse(true);
        })()
    }, [courseId]);

    return <div className="space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Recent Feedback</h3>
        {isUserTakenCourse && <div className="flex flex-col gap-4">
            <h4 className="text-lg font-bold tracking-tight">You've taken this course before! Write your feedback</h4>
            <CommentEditor courseId={courseId} />
        </div>}
        {comments.map((m, index) => <CommentsItem key={index} comment={m} />)}
    </div>;
};
