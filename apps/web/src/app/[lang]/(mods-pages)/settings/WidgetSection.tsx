import { useLocalStorage } from "usehooks-ts";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WIDGET_DEFINITIONS,
  WidgetConfig,
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
import { useSettings } from "@/hooks/contexts/settings";

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
  const def = WIDGET_DEFINITIONS.find((d) => d.type === widget.type);
  const { language } = useSettings();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium">
          {language === "zh" ? def?.labelZh : def?.label}
        </div>
        <div className="text-xs text-muted-foreground">{def?.description}</div>
      </div>
      <Switch
        checked={widget.enabled}
        onCheckedChange={(val) => onToggle(widget.id, val)}
      />
    </div>
  );
};

export const WidgetSection = () => {
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

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      setConfig((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, enabled } : w)),
      }));
    },
    [setConfig],
  );

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

  const handleColumnChange = (cols: 1 | 2 | 3) => {
    setConfig((prev) => ({ ...prev, columns: cols }));
  };

  const sorted = [...config.widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4">
      {/* Column layout */}
      <div>
        <p className="text-sm font-medium mb-2">Columns / 欄數</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((col) => (
            <button
              key={col}
              onClick={() => handleColumnChange(col)}
              className={`px-4 py-2 text-sm border rounded-lg transition-colors ${config.columns === col ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-muted-foreground"}`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Widget list */}
      <div>
        <p className="text-sm font-medium mb-2">Widgets / 小工具</p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
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
