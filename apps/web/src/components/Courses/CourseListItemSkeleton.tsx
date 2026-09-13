import { Skeleton } from "@courseweb/ui";

const CourseListItemSkeleton = () => {
  return (
    <div className="flex min-w-0 flex-row gap-4 py-4 @container">
      <div className="min-w-0 flex-1">
        <div className="mb-2 space-y-1 @md:pt-0">
          <div className="flex flex-row items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <div className="flex min-w-0 flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>
      <div className="flex shrink-0 items-start">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
};

export default CourseListItemSkeleton;
