import * as React from "react";

import { cn } from "../../lib/utils";

export type EmptyStateSize = "default" | "sm" | "inline";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: EmptyStateSize;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon: Icon,
      title,
      description,
      action,
      size = "default",
      ...props
    },
    ref,
  ) =>
    size === "inline" ? (
      <div
        ref={ref}
        className={cn(className, "flex min-w-0 flex-col items-start p-0 text-left")}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="min-w-0 truncate text-sm font-medium">{title}</h2>
        </div>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    ) : (
      <div
        ref={ref}
        className={cn(
          className,
          "flex flex-col items-center justify-center text-center",
          size === "sm" ? "space-y-3 px-3 py-6" : "space-y-3 px-4 py-12",
        )}
        {...props}
      >
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="w-full max-w-md text-balance text-sm text-muted-foreground">
          {description}
        </p>
        {action ? <div>{action}</div> : null}
      </div>
    ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
