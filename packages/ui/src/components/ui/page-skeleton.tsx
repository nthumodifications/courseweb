import * as React from "react";

import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";

export interface PageSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
}

const PageSkeleton = React.forwardRef<HTMLDivElement, PageSkeletonProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(className, "space-y-6")}
      role="status"
      aria-busy="true"
      {...props}
    >
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" aria-hidden="true" />
        <Skeleton className="h-4 w-64" aria-hidden="true" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: Math.max(0, rows) }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" aria-hidden="true" />
        ))}
      </div>
    </div>
  ),
);
PageSkeleton.displayName = "PageSkeleton";

export { PageSkeleton };
