'use client';
import { useEffect, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "./page.actions";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { Textarea } from "@/components/ui/textarea"
import { postComment } from "./page.actions";
import { Loader2Icon } from "lucide-react";

const CommentEditor = ({ courseId, commenter, fetchComments }: { courseId: string; commenter: string; fetchComments: () => Promise<void>;}) => {
    const templateText = `- Scoring 甜度 (On 5 scale, where 1 is low and 5 is high satisfaction):\n
- Easiness 涼度 (On 5 scale, where 1 is most difficult and 5 is easiest):\n 
- Does this course take attendance? (Yes/No):\n
- Workload (Estimate the average hours per week spent on this course):\n
- Instructor's engagement (Does the instructor encourage questions and participation? Yes/No):\n
- Availability of past year materials (Yes/No):\n
- Other Comments:\n
    `;

    const [commentText, setCommentText] = useState(templateText);

    const handleCommentSubmit = async () => {
        if (commentText.trim() === '' || commentText.trim() === templateText.trim()) {
            console.error('Please fill out the comment template.');
            return;
        }

        try {
            const result = await postComment(courseId, commenter, commentText);
            console.log('Submission successful:', result);
            setCommentText(templateText);
            fetchComments();
        } catch (error) {
            console.error('Failed to submit comment:', error);
        }
    };
    
    return <div className="flex flex-col">
        <Textarea placeholder="Write your comment here..." value={commentText} onChange={(e) => setCommentText(e.target.value)}/>
        <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleCommentSubmit}>Submit</button>
        </div>
    </div>
}

export const CommentsContainer = ({ courseId }: { courseId: string; }) => {
    const { getACIXSTORE } = useHeadlessAIS();
    const [comments, setComments] = useState<Awaited<ReturnType<typeof getComments>>>([]);
    useEffect(() => { fetchComments(); }, [courseId]);
    const [isUserTakenCourse, setIsUserTakenCourse] = useState(false);
    const [commenter, setCommenter] = useState('');
    const [loading, setLoading] = useState<boolean>(true);
    
    const fetchComments = async () => {
        try {
            const fetchedComments = await getComments(courseId);
            setComments(fetchedComments);
        } catch (error) {
            console.error("Error loading comments:", error);
        }
    };

    useEffect(() => {
        let isActive = true;
        (async () => {
            try {
                const token = await getACIXSTORE();
                if (!token) {
                    throw new Error("Authentication token is missing.");
                }
                const res = await getStudentCourses(token);
                if (!res) {
                    throw new Error("Failed to fetch student courses.");
                }
                if (isActive) {
                    setCommenter(res.student.studentid ?? '');
                    setIsUserTakenCourse(res.courses.includes(courseId));
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading data:", error);
                setLoading(false);
            }
        })();
    
        return () => {
            isActive = false;
        };
    }, [courseId, getACIXSTORE]);
    

    return <div className="space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Recent Feedback</h3>
        {loading ? <Loader2Icon className="animate-spin" /> :
            <div>
                {isUserTakenCourse && <div className="flex flex-col gap-4">
                <CommentEditor courseId={courseId} commenter={commenter} fetchComments={fetchComments}/>
            </div>
            }
        </div>
        }
        {comments.map((m, index) => <CommentsItem key={index} comment={m} />)}
    </div>;
};
