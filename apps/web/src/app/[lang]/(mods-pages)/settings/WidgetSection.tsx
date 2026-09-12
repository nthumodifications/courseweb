import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WidgetConfig,
} from "@/types/widget";
import { Section, Switch } from "@courseweb/ui";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { SegmentedControl } from "@courseweb/ui";
import { SettingItem } from "./SettingItem";

const SortableWidgetRow = ({
  widget,
  onToggle,
}: {
  widget: WidgetConfig;
  onToggle: (id: string, value: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: widget.id });
  const dict = useDictionary();
  const copy =
    dict.settings.calendar.widget_dashboard.widget_options[widget.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-4"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`${copy.title} · ${dict.settings.calendar.widget_dashboard.drag}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <SettingItem
        title={copy.title}
        description={copy.description}
        control={
          <Switch
            checked={widget.enabled}
            onCheckedChange={(value) => onToggle(widget.id, value)}
          />
        }
        className="min-w-0 flex-1 sm:flex-row"
      />
    </div>
  );
};

export const WidgetSection = () => {
  const dict = useDictionary();
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
      setConfig((previous) => ({
        ...previous,
        widgets: previous.widgets.map((widget) =>
          widget.id === id ? { ...widget, enabled } : widget,
        ),
      }));
    },
    [setConfig],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setConfig((previous) => {
        const oldIndex = previous.widgets.findIndex(
          (widget) => widget.id === active.id,
        );
        const newIndex = previous.widgets.findIndex(
          (widget) => widget.id === over.id,
        );
        if (oldIndex === -1 || newIndex === -1) return previous;
        const widgets = arrayMove(previous.widgets, oldIndex, newIndex).map(
          (widget, index) => ({ ...widget, order: index }),
        );
        return { ...previous, widgets };
      });
    },
    [setConfig],
  );

  const handleColumnChange = (columns: "1" | "2" | "3") => {
    setConfig((previous) => ({
      ...previous,
      columns: Number(columns) as DashboardConfig["columns"],
    }));
  };

  const sorted = [...config.widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-3">
      <SettingItem
        title={dict.settings.calendar.widget_dashboard.columns}
        description={
          dict.settings.calendar.widget_dashboard.columns_description
        }
        control={
          <SegmentedControl
            value={String(config.columns) as "1" | "2" | "3"}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
            onValueChange={handleColumnChange}
            aria-label={dict.settings.calendar.widget_dashboard.columns}
            className="sm:w-48"
          />
        }
      />
      <Section
        title={dict.settings.calendar.widget_dashboard.widgets}
        description={
          dict.settings.calendar.widget_dashboard.widgets_description
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((widget) => widget.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
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
      </Section>
    </div>
  );
};
