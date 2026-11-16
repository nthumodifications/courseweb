import { Suspense, type ReactNode, type FC } from "react";
import { cn } from "@/lib/utils";
import { GripVertical, Settings, X } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useState } from "react";
import {
  useIsMobile,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@courseweb/ui";
import type { WidgetType } from "@/types/widget";
import { WIDGET_SETTINGS_REGISTRY } from "./WidgetSettingsRegistry";

const WidgetSettingsButton = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const trigger = (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      <Settings className="h-4 w-4" />
    </button>
  );
  return isMobile ? (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh] overflow-y-auto">
        <DrawerHeader className="text-left">
          <DrawerTitle>{label}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="max-h-[75vh] overflow-y-auto">
        <div className="mb-4 font-medium">{label}</div>
        <Suspense fallback={null}>{children}</Suspense>
      </PopoverContent>
    </Popover>
  );
};

interface WidgetShellProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  widgetType?: WidgetType;
}

export const WidgetShell: FC<WidgetShellProps> = ({
  title,
  children,
  className,
  onRemove,
  dragHandleProps,
  isDragging,
  widgetType,
}) => {
  const dict = useDictionary();
  const SettingsComponent = widgetType
    ? WIDGET_SETTINGS_REGISTRY[widgetType]
    : undefined;
  const settingsLabel =
    dict.settings.calendar.widget_dashboard.widget_settings.title;
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        isDragging && "shadow-lg ring-2 ring-primary/30 opacity-80",
        className,
      )}
    >
      {/* Widget header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card text-card-foreground">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button
              {...(dragHandleProps as Record<string, unknown> &
                React.HTMLAttributes<HTMLButtonElement>)}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
              aria-label={dict.common.drag_to_reorder}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-sm font-bold text-card-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {SettingsComponent && (
            <WidgetSettingsButton label={settingsLabel}>
              <SettingsComponent />
            </WidgetSettingsButton>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={dict.common.remove_widget}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {/* Widget body */}
      <div className="flex-1">{children}</div>
    </div>
  );
};
