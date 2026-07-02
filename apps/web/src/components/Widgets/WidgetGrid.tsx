import { FC, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocalStorage } from "usehooks-ts";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WidgetConfig,
} from "@/types/widget";
import ScheduleWidget from "./ScheduleWidget";
import WeatherWidget from "./WeatherWidget";
import PinnedAppsWidget from "./PinnedAppsWidget";
import NotepadWidget from "./NotepadWidget";
import CountdownWidget from "./CountdownWidget";
import BusWidget from "./BusWidget";
import { cn } from "@/lib/utils";

// Individual sortable widget wrapper
const SortableWidget: FC<{
  widget: WidgetConfig;
  onRemove: (id: string) => void;
}> = ({ widget, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = { ...attributes, ...listeners };

  const renderWidget = () => {
    const commonProps = {
      onRemove: () => onRemove(widget.id),
      dragHandleProps,
      isDragging,
    };
    switch (widget.type) {
      case "schedule":
        return <ScheduleWidget {...commonProps} />;
      case "weather":
        return <WeatherWidget {...commonProps} />;
      case "pinned-apps":
        return <PinnedAppsWidget {...commonProps} />;
      case "notepad":
        return <NotepadWidget {...commonProps} />;
      case "countdown":
        return <CountdownWidget {...commonProps} />;
      case "bus":
        return <BusWidget {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-50 relative")}
    >
      {renderWidget()}
    </div>
  );
};

// Main widget grid component
const WidgetGrid: FC = () => {
  const [config, setConfig] = useLocalStorage<DashboardConfig>(
    "widget_config_v1",
    DEFAULT_DASHBOARD_CONFIG,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const activeWidgets = config.widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setConfig((prev) => {
        const oldIndex = prev.widgets.findIndex((w) => w.id === active.id);
        const newIndex = prev.widgets.findIndex((w) => w.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(prev.widgets, oldIndex, newIndex).map(
          (w, i) => ({ ...w, order: i }),
        );
        return { ...prev, widgets: reordered };
      });
    },
    [setConfig],
  );

  const handleRemove = useCallback(
    (id: string) => {
      setConfig((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === id ? { ...w, enabled: false } : w,
        ),
      }));
    },
    [setConfig],
  );

  const colClass =
    config.columns === 1
      ? "grid-cols-1"
      : config.columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={activeWidgets.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className={cn("grid gap-4 p-4", colClass)}>
          {activeWidgets.map((widget) => (
            <SortableWidget
              key={widget.id}
              widget={widget}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default WidgetGrid;
