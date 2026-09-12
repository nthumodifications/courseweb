import { ReactNode, FC, type ButtonHTMLAttributes } from "react";
import { cn, Section } from "@courseweb/ui";
import { GripVertical, X } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();

  return (
    <Section
      title={
        <span className="flex min-w-0 items-center gap-2">
          {dragHandleProps && (
            <button
              type="button"
              {...(dragHandleProps as ButtonHTMLAttributes<HTMLButtonElement>)}
              className="inline-flex size-10 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing touch-none"
              aria-label={dict.widgets.drag_to_reorder}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span className="truncate">{title}</span>
        </span>
      }
      actions={
        onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={dict.widgets.remove}
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined
      }
      variant="card"
      className={cn(
        "min-w-0",
        isDragging && "ring-2 ring-primary/30 opacity-80",
        className,
      )}
    >
      {children}
    </Section>
  );
};
