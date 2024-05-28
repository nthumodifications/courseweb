import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";


const CourseDetailsSkeleton = () => {
  return (
    <div className="flex flex-col pb-6 relative max-w-6xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="space-y-4 flex-1 w-full">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-48 mb-4" />
              <div className="flex flex-row flex-wrap gap-1">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex flex-row flex-wrap gap-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <div>
              <Skeleton className="h-4 w-full"/>
            </div>
          </div>
          <div className="absolute top-0 right-0 mt-4 mr-4">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Separator />
        <div className="flex flex-col-reverse lg:flex-row gap-6 w-full">
          <div className="flex flex-col gap-4 min-w-0 lg:max-w-[calc(100%-284px)]">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-2/3"/>
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsSkeleton;