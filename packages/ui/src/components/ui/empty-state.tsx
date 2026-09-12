import * as React from "react";

import { cn } from "../../lib/utils";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Only for a state that occupies the entire viewport and blocks the user
   *  until they act — e.g. signed-out chat. Never for a region inside a page. */
  fullPane?: boolean;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon: Icon,
      title,
      description,
      action,
      fullPane = false,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 flex-col",
        fullPane
          ? // Not min-h-screen: this always renders inside SidebarInset, below a
            // header, so a full viewport height overflows and adds a scrollbar.
            "items-center justify-center py-6 text-center h-full min-h-[60vh]"
          : "items-start py-4 text-left",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={cn(
              "shrink-0",
              fullPane ? "h-6 w-6" : "h-4 w-4 text-muted-foreground",
            )}
          />
        ) : null}
        <span
          className={fullPane ? "text-base font-bold" : "text-sm font-medium"}
        >
          {title}
        </span>
      </div>
      {description != null ? (
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      ) : null}
      {action != null ? <div className="mt-2">{action}</div> : null}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
