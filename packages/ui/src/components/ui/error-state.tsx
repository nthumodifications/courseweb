import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "./button";
import { EmptyState, type EmptyStateProps } from "./empty-state";

export interface ErrorStateProps
  extends Omit<EmptyStateProps, "action" | "icon"> {
  icon?: EmptyStateProps["icon"];
  retryLabel: React.ReactNode;
  onRetry: () => void;
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    { icon: Icon = AlertCircle, retryLabel, onRetry, ...props },
    ref,
  ) => (
    <EmptyState
      ref={ref}
      {...props}
      icon={Icon}
      action={
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          {retryLabel}
        </Button>
      }
    />
  ),
);
ErrorState.displayName = "ErrorState";

export { ErrorState };
