import { PageSkeleton, Separator, Skeleton } from "@courseweb/ui";

const CourseDetailsSkeleton = () => {
  return (
    <div className="min-w-0 space-y-6" role="status" aria-busy="true">
      <PageSkeleton rows={0} />
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-2/3 max-w-sm" />
          <div className="flex max-w-full flex-wrap gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>
        </div>
        <Separator />
        <div className="flex min-w-0 flex-col-reverse gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 max-w-lg" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5 max-w-lg" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-[284px]">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsSkeleton;
