import { formatDistanceToNow } from "date-fns";
import { getComments } from "./page.actions";

export const CommentsItem = ({ comment }: { comment: Awaited<ReturnType<typeof getComments>>[number]; }) => {
    return <div className="grid gap-2">
        <div className="grid gap-0.5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Comment posted {formatDistanceToNow(new Date(comment.posted_on))}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Scoring 甜度: {comment.scoring}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ease 涼度:  {comment.ease}</p>
        </div>
        <p className="text-base leading-6">
            The course content was fascinating. I enjoyed the way the instructor presented the information, and the
            additional resources provided were very helpful for further exploration. Overall, it was an enriching
            experience. The only suggestion I have is to include more interactive quizzes to test our knowledge.
            Thanks to everyone involved in creating this course!
        </p>
    </div>;
};
