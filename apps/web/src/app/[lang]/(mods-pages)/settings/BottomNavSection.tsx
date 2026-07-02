import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useSettings } from "@/hooks/contexts/settings";
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
import {
  GripVertical,
  LayoutList,
  Calendar,
  Bus,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { Switch } from "@courseweb/ui";

export type NavItemId = "today" | "timetable" | "bus" | "apps" | "settings";

export interface NavItemConfig {
  id: NavItemId;
  enabled: boolean;
}

const NAV_ITEM_DEFINITIONS: Record<
  NavItemId,
  { label: string; labelZh: string; Icon: React.FC<{ className?: string }> }
> = {
  today: {
    label: "Today",
    labelZh: "今天",
    Icon: ({ className }) => <LayoutList className={className} />,
  },
  timetable: {
    label: "Timetable",
    labelZh: "課表",
    Icon: ({ className }) => <Calendar className={className} />,
  },
  bus: {
    label: "Bus",
    labelZh: "公車",
    Icon: ({ className }) => <Bus className={className} />,
  },
  apps: {
    label: "Apps",
    labelZh: "應用程式",
    Icon: ({ className }) => <LayoutGrid className={className} />,
  },
  settings: {
    label: "Settings",
    labelZh: "設定",
    Icon: ({ className }) => <Settings className={className} />,
  },
};

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: "today", enabled: true },
  { id: "timetable", enabled: true },
  { id: "bus", enabled: true },
  { id: "apps", enabled: true },
];

const SortableNavRow = ({
  item,
  onToggle,
}: {
  item: NavItemConfig;
  onToggle: (id: NavItemId, val: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { language } = useSettings();
  const def = NAV_ITEM_DEFINITIONS[item.id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <def.Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 text-sm font-medium text-foreground">
        {language === "zh" ? def.labelZh : def.label}
      </div>
      <Switch
        checked={item.enabled}
        onCheckedChange={(val) => onToggle(item.id, val)}
      />
    </div>
  );
};

export const BottomNavSection = () => {
  const [items, setItems] = useLocalStorage<NavItemConfig[]>(
    "bottom_nav_items",
    DEFAULT_NAV_ITEMS,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleToggle = useCallback(
    (id: NavItemId, enabled: boolean) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, enabled } : item)),
      );
    },
    [setItems],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [setItems],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Drag to reorder • Toggle to show/hide items in the mobile bottom
        navigation bar
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <SortableNavRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
