import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

const CourseListItemSkeleton = () => {
  return (
    <div className="px-4 border-b border-gray-200 dark:border-neutral-800 pb-4 relative @container">
      <div className="flex flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="mb-3 space-y-1 pt-3 @md:pt-0">
            <div className="flex flex-row gap-2 items-center mb-1">
              <Skeleton className="min-w-[65px] py-1 px-2 text-sm select-none rounded-md w-[65px] h-[24px]" />
              <Skeleton className="min-w-[65px] py-1 px-2 text-sm select-none rounded-md w-[65px] h-[24px]" />
              <Skeleton className="text-nthu-500 w-[200px] h-[20px]" />
            </div>
            <Skeleton className="font-semibold text-lg w-[300px] h-[28px]" />
            <Skeleton className="text-sm mt-0 break-words w-[300px] h-[20px]" />
          </div>
          <div className="space-y-2 ">
            <Skeleton className="text-sm line-clamp-4 text-black dark:text-neutral-200 w-[500px] h-[60px]" />
            <Skeleton className="text-sm whitespace-pre-line text-gray-400 dark:text-neutral-600 w-[500px] h-[20px]" />
            <Skeleton className="text-sm whitespace-pre-line text-gray-400 dark:text-neutral-600 w-[500px] h-[20px]" />
            <div className="space-y-1 @md:hidden">
              <Skeleton className="text-nthu-600 dark:text-nthu-400 text-sm w-[200px] h-[20px]" />
              <Skeleton className="text-nthu-600 dark:text-nthu-400 text-sm w-[200px] h-[20px]" />
            </div>
            <Skeleton className="w-[300px] h-[40px]" />
            <Button
              size={"sm"}
              variant="link"
              disabled
              className="text-orange-600"
            >
              <Skeleton className="w-[100px] h-[20px]" />
            </Button>
          </div>
        </div>
        <div className="@md:flex flex-col space-y-3 justify-end items-end hidden">
          <div className="space-y-1">
            <Skeleton className="text-nthu-600 dark:text-nthu-400 text-sm w-[200px] h-[20px]" />
            <Skeleton className="text-nthu-600 dark:text-nthu-400 text-sm w-[200px] h-[20px]" />
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-2">
        <Skeleton className="w-[40px] h-[40px] rounded-full" />
      </div>
    </div>
  );
};

export default CourseListItemSkeleton;
