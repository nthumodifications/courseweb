import { useLocalStorage } from "usehooks-ts";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WidgetConfig,
  ensureDashboardConfig,
} from "@/types/widget";
import { Switch } from "@courseweb/ui";
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";

const SortableWidgetRow = ({
  widget,
  onToggle,
}: {
  widget: WidgetConfig;
  onToggle: (id: string, val: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dict = useDictionary();
  const label =
    dict.settings.calendar.widget_dashboard.widget_options[widget.type].title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-row items-center gap-4 py-4"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex min-h-10 min-w-10 cursor-grab items-center justify-center rounded-md text-muted-foreground touch-none active:cursor-grabbing"
        aria-label={dict.settings.move_item}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
      </div>
      <Switch
        checked={widget.enabled}
        onCheckedChange={(val) => onToggle(widget.id, val)}
      />
    </div>
  );
};

export const WidgetSection = () => {
  const dict = useDictionary();
  const [storedConfig, setConfig] = useLocalStorage<DashboardConfig>(
    "widget_config_v1",
    DEFAULT_DASHBOARD_CONFIG,
  );
  const config = ensureDashboardConfig(storedConfig);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      setConfig((prev) => {
        const normalized = ensureDashboardConfig(prev);
        return {
          ...normalized,
          widgets: normalized.widgets.map((w) =>
            w.id === id ? { ...w, enabled } : w,
          ),
        };
      });
    },
    [setConfig],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setConfig((prev) => {
        const normalized = ensureDashboardConfig(prev);
        const oldIndex = normalized.widgets.findIndex(
          (w) => w.id === active.id,
        );
        const newIndex = normalized.widgets.findIndex((w) => w.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(normalized.widgets, oldIndex, newIndex).map(
          (w, i) => ({ ...w, order: i }),
        );
        return { ...normalized, widgets: reordered };
      });
    },
    [setConfig],
  );

  const handleColumnChange = (cols: 1 | 2 | 3) => {
    setConfig((prev) => ({ ...ensureDashboardConfig(prev), columns: cols }));
  };

  const sorted = [...config.widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col divide-y divide-border">
      {/* Column layout */}
      <div className="flex flex-col gap-2 py-4">
        <h3 className="text-sm font-bold">
          {dict.settings.calendar.widget_dashboard.columns}
        </h3>
        <div className="flex flex-row gap-2">
          {([1, 2, 3] as const).map((col) => (
            <button
              key={col}
              onClick={() => handleColumnChange(col)}
              type="button"
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${config.columns === col ? "border-primary bg-primary/10 font-medium text-primary" : "border-border hover:border-muted-foreground"}`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Widget list */}
      <div className="py-4">
        <h3 className="mb-2 text-sm font-bold">
          {dict.settings.calendar.widget_dashboard.widgets}
        </h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-border">
              {sorted.map((widget) => (
                <SortableWidgetRow
                  key={widget.id}
                  widget={widget}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
