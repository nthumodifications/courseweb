import type { ComponentType, ReactNode, SVGProps } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button, EmptyState } from "@courseweb/ui";

export type ErrorStateProps = {
  title: ReactNode;
  description: ReactNode;
  retryLabel: ReactNode;
  onRetry: () => void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * The shared app-local error state until this pattern can be promoted to
 * @courseweb/ui alongside EmptyState.
 */
export default function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  icon: Icon = AlertCircle,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          {retryLabel}
        </Button>
      }
    />
  );
}
