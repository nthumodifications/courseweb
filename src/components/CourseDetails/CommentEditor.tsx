import { useState } from "react";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { Textarea } from "@/components/ui/textarea";
import { postComment } from "@/lib/headless_ais/comments";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import StructuredComment from "./StructuredComment";

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

const CommentEditor = ({
  courseId,
  onEditEnd,
}: {
  courseId: string;
  onEditEnd: () => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState(templateText);
  const [easiness, setEasiness] = useState(0);
  const [scoring, setScoring] = useState(0);
  const [freeform, setFreeform] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { getACIXSTORE } = useHeadlessAIS();

  const handleCommentSubmit = async () => {
    if (
      commentText.trim() === "" ||
      commentText.trim() === templateText.trim()
    ) {
      console.error("Please fill out the comment template.");
      return;
    }

    try {
      const token = await getACIXSTORE();
      if (!token) {
        console.error("Authentication token is missing.");
        toast({
          title: "Authentication Error",
          description: "Failed to authenticate user. Please try again.",
        });
        return;
      }
      const result = await postComment(
        courseId,
        token,
        scoring,
        easiness,
        commentText,
      );
      setCommentText(templateText);
      onEditEnd();
      toast({
        title: "Comment submitted",
        description: "Your comment has been submitted successfully.",
      });
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  const isValid =
    commentText.trim() !== "" &&
    commentText.trim() !== templateText.trim() &&
    easiness > 0 &&
    scoring > 0;

  return (
    <div className="flex flex-col gap-4">
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
        <Switch checked={freeform} onCheckedChange={(v) => setFreeform(v)} />
      </div>
      <Separator />
      {freeform ? (
        <Textarea
          placeholder="Write your comment here..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={6}
        />
      ) : (
        <StructuredComment onValueChange={setCommentText} />
      )}
      <div className="flex justify-end">
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isValid}>{"Submit"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Comment</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit this comment?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-4">
              <Button onClick={(_) => handleCommentSubmit()}>
                {isSubmitting ? (
                  <Loader2Icon className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  "Submit"
                )}
              </Button>
              <Button variant="ghost" onClick={(_) => setConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CommentEditor;
