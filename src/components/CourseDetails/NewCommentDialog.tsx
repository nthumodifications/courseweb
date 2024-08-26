import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MinimalCourse } from "@/types/courses";
import { useLocalStorage } from "usehooks-ts";
import TermsPage from "./TermsPage";
import CommentEditor from "./CommentEditor";

export const NewCommentDialog = ({ course }: { course: MinimalCourse }) => {
  const [acceptedTerms, setAcceptedTerms] = useLocalStorage(
    "comment_terms_accepted",
    false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const handleTermsAccept = (accept: boolean) => {
    setAcceptedTerms(accept);
    if (!accept) {
      setIsOpen(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 投稿
        </Button>
      </DialogTrigger>
      {acceptedTerms ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              評價 {course.name_zh} {course.name_en}
            </DialogTitle>
            <DialogDescription>
              雖然評價是匿名的，但是我們還是會記錄學號哦~
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col max-h-[70vh]">
            <ScrollArea className="h-full">
              <CommentEditor
                courseId={course.raw_id}
                onEditEnd={() => setIsOpen(false)}
              />
            </ScrollArea>
          </div>
        </DialogContent>
      ) : (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>課程評價規則</DialogTitle>
            <DialogDescription>請閱讀並同意以下規則</DialogDescription>
          </DialogHeader>
          <TermsPage onAcceptTerms={handleTermsAccept} />
        </DialogContent>
      )}
    </Dialog>
  );
};

export default NewCommentDialog;
