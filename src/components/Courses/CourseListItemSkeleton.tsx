import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { ChevronDown } from "lucide-react";

const CourseListItemSkeleton = () => {
  return (
    <div className="relative @container">
      <div className="flex flex-row gap-4">
        <div className="flex-1">
          <div className="mb-2 space-y-1 @md:pt-0">
            <div className="flex flex-row gap-2 items-center">
              <Skeleton className="min-w-[65px] py-1 px-2 text-sm select-none rounded-md w-[65px] h-[24px]" />
              <Skeleton className="text-nthu-500 w-[150px] h-[20px]" />
            </div>
            <Skeleton className="font-semibold text-lg w-[300px] h-[28px]" />
            <div className="space-y-1 self-start w-auto max-w-fit">
              <Skeleton className="text-muted-foreground text-xs w-[120px] h-[16px]" />
              <Skeleton className="text-muted-foreground text-xs w-[120px] h-[16px]" />
            </div>
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-[20px] w-[60px] rounded-md" />
              <Skeleton className="h-[20px] w-[60px] rounded-md" />
              <Skeleton className="h-[20px] w-[60px] rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="text-xs line-clamp-2 w-[500px] h-[32px]" />
            <Skeleton className="text-xs whitespace-pre-line w-[500px] h-[20px]" />
            <Skeleton className="text-xs whitespace-pre-line w-[500px] h-[20px]" />
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-5 text-xs"
              disabled
            >
              <Skeleton className="w-[60px] h-[16px]" />
              <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground" />
            </Button>
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
