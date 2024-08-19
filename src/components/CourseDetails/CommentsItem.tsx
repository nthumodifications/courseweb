import { formatDistanceToNow } from "date-fns";
import { getComments } from "../../lib/headless_ais/comments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toPrettySemester } from "@/helpers/semester";
import { zhTW } from "date-fns/locale";
import { Rating } from "@/components/ui/rating";

export const CommentsItem = ({
  comment,
}: {
  comment: Awaited<ReturnType<typeof getComments>>[number];
}) => {
  if (!comment.courses) return <></>;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="grid gap-2 py-4 px-2">
          <div className="grid gap-0.5">
            <h4 className="text-semibold text-black dark:text-white">
              在 {toPrettySemester(comment.courses?.semester)} 學期修過{" "}
              {comment.courses!.teacher_zh.join(",")} 的課
            </h4>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(comment.posted_on), {
                locale: zhTW,
              })}
              發
            </p>
            <div className="flex flex-row items-center gap-2 text-sm">
              <span>甜度: </span>
              <Rating
                rating={comment.scoring}
                size={16}
                variant="yellow"
                showText={false}
                disabled
              />
            </div>
            <div className="flex flex-row items-center gap-2 text-sm">
              <span>涼度: </span>
              <Rating
                rating={comment.easiness}
                size={16}
                variant="yellow"
                showText={false}
                disabled
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
            {comment.comment}
          </p>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {toPrettySemester(comment.courses!.semester)}{" "}
            {comment.courses?.name_zh} {comment.courses!.teacher_zh.join(",")}
          </DialogTitle>
          <DialogDescription>
            <div className="grid gap-0.5">
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(comment.posted_on), {
                  locale: zhTW,
                })}
                發
              </p>
              <div className="flex flex-row items-center gap-2 text-sm">
                <span>甜度: </span>
                <Rating
                  rating={comment.scoring}
                  size={16}
                  variant="yellow"
                  showText={false}
                  disabled
                />
              </div>
              <div className="flex flex-row items-center gap-2 text-sm">
                <span>涼度: </span>
                <Rating
                  rating={comment.easiness}
                  size={16}
                  variant="yellow"
                  showText={false}
                  disabled
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh]">
          <ScrollArea className="h-full">
            <p className="text-base whitespace-pre-line">{comment.comment}</p>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
