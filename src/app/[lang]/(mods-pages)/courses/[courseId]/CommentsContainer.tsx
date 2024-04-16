'use client';
import { useEffect, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "./page.actions";

export const CommentsContainer = ({ courseId }: { courseId: string; }) => {
    const [comments, setComments] = useState<Awaited<ReturnType<typeof getComments>>>([]);
    useEffect(() => { getComments(courseId).then(setComments); }, [courseId]);
    
    return <div className="space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Recent Feedback</h3>
        {comments.map((m, index) => <CommentsItem key={index} comment={m} />)}
    </div>;
};
