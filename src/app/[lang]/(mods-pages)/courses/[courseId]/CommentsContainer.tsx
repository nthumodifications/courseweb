'use client';
import { useEffect, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "./page.actions";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { Textarea } from "@/components/ui/textarea"
import { postComment } from "./page.actions";
import { Loader2Icon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { Form, FormItem, FormLabel } from "@/components/ui/form";
import { FormControl } from "@mui/joy";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {Label} from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

// const templateText = `- Scoring 甜度 (On 5 scale, where 1 is low and 5 is high satisfaction):\n
// - Easiness 涼度 (On 5 scale, where 1 is most difficult and 5 is easiest):\n 
// - Does this course take attendance? (Yes/No):\n
// - Workload (Estimate the average hours per week spent on this course):\n
// - Instructor's engagement (Does the instructor encourage questions and participation? Yes/No):\n
// - Availability of past year materials (Yes/No):\n
// - Other Comments:\n
//     `;

const templateText = `
有點名：
有考古：
給加簽嗎:
建議先修課程：
上課方式：
給分：
考試作業型態：
老師的喜好、個性：
補充：
`;

const StructuredComment = ({ onValueChange }: { onValueChange: (value: string) => void }) => {
    const [attendance, setAttendance] = useState<boolean>(false);
    return <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-2 items-center">
            <Label>有點名</Label>
            <Checkbox checked={attendance} onCheckedChange={v => typeof v == 'string' ? setAttendance(v.valueOf() == 'true'): setAttendance(v.valueOf())} />
        </div>
        <div className="flex flex-row gap-2 items-center">
            <Label>有考古</Label>
            <Checkbox checked={attendance} onCheckedChange={v => typeof v == 'string' ? setAttendance(v.valueOf() == 'true'): setAttendance(v.valueOf())} />
        </div>
        <div className="flex flex-row gap-2 items-center">
            <Label>給加簽嗎</Label>
            <Checkbox checked={attendance} onCheckedChange={v => typeof v == 'string' ? setAttendance(v.valueOf() == 'true'): setAttendance(v.valueOf())} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>建議先修課程</Label>
            <Input placeholder="建議先修課程" />
        </div>
        <div className="flex flex-col gap-2">
            <Label>上課方式</Label>
            <Textarea placeholder="上課方式" />
        </div>
        <div className="flex flex-col gap-2">
            <Label>給分</Label>
            <Textarea placeholder="給分" />
        </div>
        <div className="flex flex-col gap-2">
            <Label>考試作業型態</Label>
            <Textarea placeholder="考試作業型態" />
        </div>
        <div className="flex flex-col gap-2">
            <Label>老師的喜好、個性</Label>
            <Textarea placeholder="老師的喜好、個性" />
        </div>
        <div className="flex flex-col gap-2">
            <Label>補充</Label>
            <Textarea placeholder="補充" />
        </div>
        
    </div>
}

const CommentEditor = ({ courseId }: { courseId: string; }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentText, setCommentText] = useState(templateText);
    const [easiness, setEasiness] = useState(0);
    const [scoring, setScoring] = useState(0);
    const [freeform, setFreeform] = useState<boolean>(false);

    const handleCommentSubmit = async () => {
        if (commentText.trim() === '' || commentText.trim() === templateText.trim()) {
            console.error('Please fill out the comment template.');
            return;
        }

        try {
            const result = await postComment(courseId, commentText);
            console.log('Submission successful:', result);
            setCommentText(templateText);
        } catch (error) {
            console.error('Failed to submit comment:', error);
        }
    };

    return <div className="flex flex-col gap-4">
        <div className="grid gap-2 grid-cols-[100px_auto] items-center">
            <h4>甜度</h4>
            <Rating
                rating={easiness}
                onRatingChange={setEasiness}
                totalStars={5}
                size={24}
                variant="yellow"
                showText={false}
            />
            <h4>涼度</h4>
            <Rating
                rating={scoring}
                onRatingChange={setScoring}
                totalStars={5}
                size={24}
                variant="yellow"
                showText={false}
            />
        </div>
        <div className="flex flex-row gap-4 items-center">
            <Label>Freeform</Label>
            <Switch checked={freeform} onCheckedChange={v => setFreeform(v)} />
        </div>
        {freeform ?
            <Textarea placeholder="Write your comment here..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={6} />
            : <StructuredComment onValueChange={setCommentText} />
        }
        <div className="flex justify-end">
            <Button onClick={handleCommentSubmit}>{isSubmitting ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" />: "Submit"}</Button>
        </div>
    </div>
}

export const NewCommentDialog = ({ courseId }: { courseId: string }) => {
    return <Dialog>
        <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4"/> Add</Button>
        </DialogTrigger>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>New Comment</DialogTitle>
            <DialogDescription className="max-h-[70vh]">
                <ScrollArea className="h-full">
                    <CommentEditor courseId={courseId} />
                </ScrollArea>
            </DialogDescription>
        </DialogHeader>
        </DialogContent>
    </Dialog>
}

export const CommentsContainer = ({ courseId, initialData = [] }: { courseId: string; initialData: Awaited<ReturnType<typeof getComments>> }) => {
    const { initializing, getACIXSTORE } = useHeadlessAIS();
    const [isUserTakenCourse, setIsUserTakenCourse] = useState(false);
    const [commenter, setCommenter] = useState('');
    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState(1);

    const { data: comments } = useQuery({
        queryKey: ['comments', courseId, page],
        queryFn: () => getComments(courseId),
        initialData,
    })


    useEffect(() => {
        (async () => {
            try {
                if(!courseId || initializing) return;
                setLoading(true);
                const token = await getACIXSTORE();
                if (!token) {
                    throw new Error("Authentication token is missing.");
                }
                const res = await getStudentCourses(token);
                if (!res) {
                    throw new Error("Failed to fetch student courses.");
                }
                setIsUserTakenCourse(res.courses.includes(courseId));
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [courseId, initializing]);


    return <div className="space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Recent Feedback</h3>
        {isUserTakenCourse && <NewCommentDialog courseId={courseId} />}
        {comments.map((m, index) => <CommentsItem key={index} comment={m} />)}
    </div>;
};
