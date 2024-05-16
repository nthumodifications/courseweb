'use client';;
import { useEffect, useMemo, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "./page.actions";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { Textarea } from "@/components/ui/textarea"
import { postComment } from "./page.actions";
import { CheckCircle, CheckCircle2, Loader2Icon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {Label} from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { MinimalCourse } from "@/types/courses";
import { Separator } from "@/components/ui/separator";
import { useLocalStorage } from "usehooks-ts";
import { toast } from "@/components/ui/use-toast";

// const templateText = `- Scoring 甜度 (On 5 scale, where 1 is low and 5 is high satisfaction):\n
// - Easiness 涼度 (On 5 scale, where 1 is most difficult and 5 is easiest):\n 
// - Does this course take attendance? (Yes/No):\n
// - Workload (Estimate the average hours per week spent on this course):\n
// - Instructor's engagement (Does the instructor encourage questions and participation? Yes/No):\n
// - Availability of past year materials (Yes/No):\n
// - Other Comments:\n
//     `;

const templateText = `# 有點名：

# 有考古：

# 給加簽嗎:

# 建議先修課程：

# 上課方式：

# 給分：

# 考試作業型態：

# 老師的喜好、個性：

# 補充：
`;

const StructuredComment = ({ onValueChange }: { onValueChange: (value: string) => void }) => {
    const [attendance, setAttendance] = useState<boolean>(false);
    const [hasPastYearMaterials, setHasPastYearMaterials] = useState<boolean>(false);
    const [extraSelection, setExtraSelection] = useState<string>('');
    const [suggestedPrerequisite, setSuggestedPrerequisite] = useState<string>('');
    const [courseMethod, setCourseMethod] = useState<string>('');
    const [scoring, setScoring] = useState<string>('');
    const [examType, setExamType] = useState<string>('');
    const [instructorPersonality, setInstructorPersonality] = useState<string>('');
    const [extraComments, setExtraComments] = useState<string>('');

    const handleValueChange = () => {
        const value = `# 有點名：
${attendance ? '有': '沒有'}\n
# 有考古：
${hasPastYearMaterials ? '有': '沒有'}\n
# 加簽：
${extraSelection}\n
# 建議先修課程：
${suggestedPrerequisite}\n
# 上課方式：
${courseMethod}\n
# 給分：
${scoring}\n
# 考試作業型態：
${examType}\n
# 老師的喜好、個性：
${instructorPersonality}\n
# 補充：
${extraComments}\n
`;
        onValueChange(value);
    }

    useEffect(() => {
        handleValueChange();
    }, [attendance, hasPastYearMaterials, extraSelection, suggestedPrerequisite, courseMethod, scoring, examType, instructorPersonality, extraComments]);

    return <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-2 items-center">
            <Label>有點名</Label>
            <Checkbox checked={attendance} onCheckedChange={v => typeof v == 'string' ? setAttendance(v.valueOf() == 'true'): setAttendance(v.valueOf())} />
        </div>
        <div className="flex flex-row gap-2 items-center">
            <Label>有考古</Label>
            <Checkbox checked={hasPastYearMaterials} onCheckedChange={v => typeof v == 'string' ? setHasPastYearMaterials(v.valueOf() == 'true'): setHasPastYearMaterials(v.valueOf())} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>加簽</Label>
            <Input placeholder="是/否，補充~" value={extraSelection} onChange={(e) => setExtraSelection(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>建議先修課程</Label>
            <Input placeholder="建議先修課程" value={suggestedPrerequisite} onChange={(e) => setSuggestedPrerequisite(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>上課方式</Label>
            <Textarea placeholder="上課方式" value={courseMethod} onChange={(e) => setCourseMethod(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>給分</Label>
            <Textarea placeholder="給分" value={scoring} onChange={(e) => setScoring(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>考試作業型態</Label>
            <Textarea placeholder="考試作業型態" value={examType} onChange={(e) => setExamType(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>老師的喜好、個性</Label>
            <Textarea placeholder="老師的喜好、個性" value={instructorPersonality} onChange={(e) => setInstructorPersonality(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
            <Label>補充</Label>
            <Textarea placeholder="補充" value={extraComments} onChange={(e) => setExtraComments(e.target.value)} />
        </div>
        
    </div>
}

const CommentEditor = ({ courseId, onEditEnd }: { courseId: string; onEditEnd: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentText, setCommentText] = useState(templateText);
    const [easiness, setEasiness] = useState(0);
    const [scoring, setScoring] = useState(0);
    const [freeform, setFreeform] = useState<boolean>(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleCommentSubmit = async () => {
        if (commentText.trim() === '' || commentText.trim() === templateText.trim()) {
            console.error('Please fill out the comment template.');
            return;
        }

        try {
            const result = await postComment(courseId, scoring, easiness, commentText);
            setCommentText(templateText);
            onEditEnd();
            toast({
                title: "Comment submitted",
                description: "Your comment has been submitted successfully.",
            })
        } catch (error) {
            console.error('Failed to submit comment:', error);
        }
    };

    const isValid = commentText.trim() !== '' && commentText.trim() !== templateText.trim() && (easiness > 0 && scoring > 0);

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
        <Separator />
        {freeform ?
            <Textarea placeholder="Write your comment here..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={6} />
            : <StructuredComment onValueChange={setCommentText} />
        }
        <div className="flex justify-end">
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                    <Button disabled={!isValid}>{"Submit"}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Comment</DialogTitle>
                        <DialogDescription>Are you sure you want to submit this comment?</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-4">
                        <Button onClick={_ => handleCommentSubmit()}>{isSubmitting ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" />: "Submit"}</Button>
                        <Button variant="ghost" onClick={_ => setConfirmOpen(false)}>Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    </div>
}

const TermsPage = ({ onAcceptTerms }: { onAcceptTerms: (accept: boolean) => void }) => {
    return <div className="prose-sm">
        <p>同學們好～為了讓大家獲得準確有意義的評價：</p>
        <div className="space-y-4">
            <div className="flex flex-row gap-2">
                <CheckCircle2 className="text-green-500 w-6 h-6"/>
                <div className="flex-1">請確保分享內容的真實與客觀性，並且不要人身攻擊</div>
            </div>
            <div className="flex flex-row gap-2">
                <CheckCircle2 className="text-green-500 w-6 h-6"/>
                <div className="flex-1">此為匿名分享，但為了防止有心人士濫用，我們會在後台記錄分享者的學號，若違反規則我們會禁止該學號者留言</div>
            </div>
            <div className="flex flex-row gap-2">
                <CheckCircle2 className="text-green-500 w-6 h-6"/>
                <div className="flex-1">只有成功代理登陸校務系統的同學才能留言和看到他人的留言</div>
            </div>
        </div>
        <div className="flex flex-row gap-2 pt-4">
            <Button onClick={_ => onAcceptTerms(true)}>我已閱讀並同意</Button>
            <Button variant='ghost' onClick={_ => onAcceptTerms(false)}>不同意</Button>
        </div>
    </div>
}

export const NewCommentDialog = ({ course }: { course: MinimalCourse }) => {
    const [acceptedTerms, setAcceptedTerms] = useLocalStorage('comment_terms_accepted', false);
    const [isOpen, setIsOpen] = useState(false);
    const handleTermsAccept = (accept: boolean) => {
        setAcceptedTerms(accept);
        if (!accept) {
            setIsOpen(false);
        }
    }
    return <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4"/> Add</Button>
        </DialogTrigger>
        {acceptedTerms ? <DialogContent>
            <DialogHeader>
                <DialogTitle>Write a review for {course.name_zh} {course.name_en}</DialogTitle>
                <DialogDescription>雖然評價是匿名的，但是我們還是會記錄學號哦~</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col max-h-[70vh]">
                <ScrollArea className="h-full">
                    <CommentEditor courseId={course.raw_id} onEditEnd={() => setIsOpen(false)}/>
                </ScrollArea>
            </div>
        </DialogContent>: (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>課程評價規則</DialogTitle>
                    <DialogDescription>請閱讀並同意以下規則</DialogDescription>
                </DialogHeader>
                <TermsPage onAcceptTerms={handleTermsAccept} />
            </DialogContent>
        
        )}
    </Dialog>
}

export const CommentsContainer = ({ course}: { course: MinimalCourse }) => {
    const { initializing, getACIXSTORE } = useHeadlessAIS();
    const [isUserTakenCourse, setIsUserTakenCourse] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);

    const { data: comments, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery<Awaited<ReturnType<typeof getComments>>>({
        queryKey: ['comments', course.raw_id],
        queryFn: ({ pageParam }) => getComments(course.raw_id, pageParam as number),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length ? Math.ceil(allPages.length / 10) + 1 : undefined;
        },
        initialPageParam: 1,
    })

    const flatComments = useMemo(() => comments?.pages.flatMap(p => p) ?? [], [comments]);

    useEffect(() => {
        (async () => {
            try {
                if(!course.raw_id || initializing) return;
                setLoading(true);
                const token = await getACIXSTORE();
                if (!token) {
                    throw new Error("Authentication token is missing.");
                }
                const res = await getStudentCourses(token);
                if (!res) {
                    throw new Error("Failed to fetch student courses.");
                }
                setIsUserTakenCourse(res.courses.includes(course.raw_id));
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [course.raw_id, initializing]);

    // check if reached #comments-end, if so, fetch next page
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fetchNextPage();
            }
        }, { threshold: 1 });
        observer.observe(document.getElementById('comments-end')!);
        return () => observer.disconnect();
    }, [fetchNextPage]);


    return <div className="space-y-6">
        {isUserTakenCourse && <div className=" flex items-center space-x-4 rounded-md border p-4">
          <CheckCircle />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              You've taken this course!
            </p>
            <p className="text-sm text-muted-foreground">
                Share your thoughts. Help others understand the course better.
            </p>
          </div>
          <NewCommentDialog course={course} />
        </div>}
        <div className="flex flex-col divide-y divide-border">
            {flatComments.map((m, index) => <CommentsItem key={index} comment={m} />)}
            <div id="comments-end"/>
        </div>
        {!hasNextPage && flatComments.length == 0 && <div className="text-center">No comments yet</div>}
        {!hasNextPage && flatComments.length != 0 && <div className="text-center">No more comments</div>}
    </div>;
};
