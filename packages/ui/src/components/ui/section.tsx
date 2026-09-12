import * as React from "react";

import { cn } from "../../lib/utils";

export type SectionVariant = "plain" | "card";

export interface SectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: SectionVariant;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    {
      className,
      title,
      description,
      actions,
      variant = "plain",
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(
        className,
        "space-y-3",
        variant === "card" && "rounded-lg border border-border bg-card p-4",
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  ),
);
Section.displayName = "Section";

export { Section };
