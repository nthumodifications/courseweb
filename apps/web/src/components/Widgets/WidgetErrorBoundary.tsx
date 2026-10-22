import { Component, type FC, type ErrorInfo, type ReactNode } from "react";
import {
  Bike,
  BookOpen,
  Bus,
  Calendar,
  Cloud,
  Dumbbell,
  LayoutGrid,
  Megaphone,
  Store,
  Timer,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { recordClientError } from "@/lib/client-diagnostics";
import type { WidgetType } from "@/types/widget";
import { WidgetShell } from "./WidgetShell";

interface WidgetErrorBoundaryProps {
  widgetId: string;
  widgetType: WidgetType;
  children: ReactNode;
  onRemove: () => void;
  dragHandleProps: Record<string, unknown>;
  isDragging: boolean;
}

interface WidgetErrorBoundaryState {
  error: Error | null;
}

type WidgetDictionary = ReturnType<typeof useDictionary>;

type WidgetMetadata = {
  title: (dict: WidgetDictionary) => string;
  icon?: LucideIcon;
};

const WIDGET_METADATA: Record<WidgetType, WidgetMetadata> = {
  schedule: {
    title: (dict) => dict.today.schedule_title,
    icon: Calendar,
  },
  weather: {
    title: (dict) => dict.settings.calendar.widget_dashboard.weather.title,
    icon: Cloud,
  },
  "pinned-apps": {
    title: (dict) => dict.applist.quick_links_title,
    icon: LayoutGrid,
  },
  notepad: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.notepad.title,
  },
  countdown: {
    title: (dict) => dict.today.countdown.title,
    icon: Timer,
  },
  "course-selection": {
    title: (dict) => dict.course.selection_period.title,
  },
  bus: {
    title: (dict) => dict.bus.campus_widget_title,
    icon: Bus,
  },
  library: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.library.title,
    icon: BookOpen,
  },
  laundry: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.laundry.title,
    icon: WashingMachine,
  },
  "sports-venues": {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options["sports-venues"]
        .title,
    icon: Dumbbell,
  },
  youbike: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.youbike.title,
    icon: Bike,
  },
  shops: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.shops.title,
    icon: Store,
  },
  "upcoming-events": {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options["upcoming-events"]
        .title,
    icon: Calendar,
  },
  grades: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.grades.title,
    icon: BookOpen,
  },
  announcements: {
    title: (dict) =>
      dict.settings.calendar.widget_dashboard.widget_options.announcements
        .title,
    icon: Megaphone,
  },
};

export const getWidgetTitle = (
  widgetType: WidgetType,
  dict: WidgetDictionary,
) => WIDGET_METADATA[widgetType]?.title(dict) ?? "";

export const getWidgetIcon = (widgetType: WidgetType) =>
  WIDGET_METADATA[widgetType]?.icon;

const WidgetErrorFallback: FC<
  Omit<WidgetErrorBoundaryProps, "children" | "widgetId">
> = ({ widgetType, onRemove, dragHandleProps, isDragging }) => {
  const dict = useDictionary();
  const Icon = getWidgetIcon(widgetType);

  return (
    <WidgetShell
      title={getWidgetTitle(widgetType, dict)}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          {Icon && <Icon className="mb-2 h-8 w-8 opacity-40" />}
          <span className="text-xs">{dict.common.load_error}</span>
        </div>
      </div>
    </WidgetShell>
  );
};

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    recordClientError(error);
  }

  componentDidUpdate(previousProps: WidgetErrorBoundaryProps) {
    const widgetChanged =
      previousProps.widgetId !== this.props.widgetId ||
      previousProps.widgetType !== this.props.widgetType;
    if (widgetChanged && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <WidgetErrorFallback {...this.props} />;
    }
    return this.props.children;
  }
}
