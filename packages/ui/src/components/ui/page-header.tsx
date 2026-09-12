import * as React from "react";

import { cn } from "../../lib/utils";

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => (
    <header ref={ref} className={cn(className, "space-y-1")} {...props}>
      <div className="flex min-w-0 items-center justify-between gap-4">
        <h1 className="min-w-0 truncate text-xl font-semibold">{title}</h1>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {description ? (
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  ),
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
