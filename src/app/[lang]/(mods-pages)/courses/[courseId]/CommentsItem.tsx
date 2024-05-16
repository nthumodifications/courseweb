import { formatDistanceToNow } from "date-fns";
import { getComments } from "./page.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const CommentsItem = ({ comment }: { comment: Awaited<ReturnType<typeof getComments>>[number]; }) => {
    console.log(comment)
    return <Dialog>
        <DialogTrigger asChild>
            <div className="grid gap-2">
                <div className="grid gap-0.5">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Comment posted {formatDistanceToNow(new Date(comment.posted_on))}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">甜度: {comment.scoring}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">涼度: {comment.easiness}</p>
                </div>
                <p className="text-base leading-6 line-clamp-3">
                    {comment.comment}
                </p>
            </div>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
                This action cannot be undone. This will permanently delete your account
                and remove your data from our servers.
            </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh]">
                <ScrollArea className="h-full">
                    <p className="text-base whitespace-pre-line">
                        {comment.comment}
                    </p>
                </ScrollArea>
            </div>
        </DialogContent>
    </Dialog>
};
