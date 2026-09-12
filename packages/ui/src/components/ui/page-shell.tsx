import * as React from "react";

import { cn } from "../../lib/utils";

export type PageShellWidth = "content" | "app" | "full";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: PageShellWidth;
  gap?: boolean;
}

const widthClasses: Record<PageShellWidth, string> = {
  content: "max-w-3xl",
  app: "max-w-6xl",
  full: "",
};

// A div, not a <main>: SidebarInset already renders the page's <main> landmark,
// and nesting a second one gives every route two.
const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  ({ className, width = "app", gap = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        className,
        "mx-auto w-full px-4 pt-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:px-6 md:pb-4 lg:px-8",
        widthClasses[width],
        gap && "space-y-6",
      )}
      {...props}
    />
  ),
);
PageShell.displayName = "PageShell";

export { PageShell };
