import { Skeleton } from "@courseweb/ui";

const CourseListItemSkeleton = () => {
  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 flex-row items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 space-y-1">
            <div className="flex flex-row items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-36 max-w-full" />
            </div>
            <Skeleton className="h-6 w-3/4 max-w-sm" />
            <div className="max-w-full space-y-1">
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full max-w-xl" />
            <Skeleton className="h-5 w-2/3 max-w-lg" />
            <Skeleton className="h-5 w-2/3 max-w-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
      </div>
    </div>
  );
};

export default CourseListItemSkeleton;
