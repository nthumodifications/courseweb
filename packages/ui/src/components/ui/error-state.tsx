import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "../../lib/utils";
import { EmptyState, type EmptyStateProps } from "./empty-state";

const DestructiveErrorIcon = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <AlertCircle {...props} className={cn(className, "text-destructive")} />
);

export interface ErrorStateProps extends EmptyStateProps {}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ icon: Icon = DestructiveErrorIcon, ...props }, ref) => (
    <EmptyState ref={ref} role="alert" icon={Icon} {...props} />
  ),
);
ErrorState.displayName = "ErrorState";

export { ErrorState };
