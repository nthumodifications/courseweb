import { ReactNode, FC } from "react";
import { cn } from "@/lib/utils";
import { GripVertical, X } from "lucide-react";

interface WidgetShellProps {
  title: string;
  children: ReactNode;
  className?: string;
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export const WidgetShell: FC<WidgetShellProps> = ({
  title,
  children,
  className,
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        isDragging && "shadow-lg ring-2 ring-primary/30 opacity-80",
        className,
      )}
    >
      {/* Widget header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button
              {...(dragHandleProps as Record<string, unknown> &
                React.HTMLAttributes<HTMLButtonElement>)}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove widget"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Widget body */}
      <div className="flex-1">{children}</div>
    </div>
  );
};
