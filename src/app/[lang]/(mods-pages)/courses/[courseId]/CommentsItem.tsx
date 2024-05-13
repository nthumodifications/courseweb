import { formatDistanceToNow } from "date-fns";
import { getComments } from "./page.actions";

export const CommentsItem = ({ comment }: { comment: Awaited<ReturnType<typeof getComments>>[number]; }) => {
    console.log(comment)
    return <div className="grid gap-2">
        <div className="grid gap-0.5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{comment.studentid}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Comment posted {formatDistanceToNow(new Date(comment.posted_on))}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Scoring 甜度: {comment.scoring}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Easiness 涼度:  {comment.easiness}</p>
        </div>
        <p className="text-base leading-6">
            {comment.comment}
        </p>
    </div>;
};
