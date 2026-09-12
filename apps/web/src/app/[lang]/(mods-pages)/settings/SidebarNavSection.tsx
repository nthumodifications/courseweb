import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
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
import useDictionary from "@/dictionaries/useDictionary";

export type SidebarNavItemId =
  | "today"
  | "timetable"
  | "bus"
  | "apps"
  | "settings";

export interface SidebarNavItemConfig {
  id: SidebarNavItemId;
  enabled: boolean;
}

const SIDEBAR_ITEM_DEFINITIONS: Record<
  SidebarNavItemId,
  { Icon: React.FC<{ className?: string }> }
> = {
  today: {
    Icon: ({ className }) => <LayoutList className={className} />,
  },
  timetable: {
    Icon: ({ className }) => <Calendar className={className} />,
  },
  bus: {
    Icon: ({ className }) => <Bus className={className} />,
  },
  apps: {
    Icon: ({ className }) => <LayoutGrid className={className} />,
  },
  settings: {
    Icon: ({ className }) => <Settings className={className} />,
  },
};

export const DEFAULT_SIDEBAR_NAV_ITEMS: SidebarNavItemConfig[] = [
  { id: "today", enabled: true },
  { id: "timetable", enabled: true },
  { id: "bus", enabled: true },
  { id: "apps", enabled: true },
  { id: "settings", enabled: true },
];

const SortableSidebarRow = ({
  item,
  onToggle,
}: {
  item: SidebarNavItemConfig;
  onToggle: (id: SidebarNavItemId, val: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dict = useDictionary();
  const def = SIDEBAR_ITEM_DEFINITIONS[item.id];
  const label = {
    today: dict.navigation.today,
    timetable: dict.navigation.timetable,
    bus: dict.navigation.bus,
    apps: dict.navigation.apps,
    settings: dict.navigation.settings,
  }[item.id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-row items-center gap-2 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex min-h-10 min-w-10 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors touch-none hover:text-foreground active:cursor-grabbing"
        aria-label={dict.settings.move_item}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <def.Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 text-sm font-medium">{label}</div>
      <Switch
        checked={item.enabled}
        onCheckedChange={(val) => onToggle(item.id, val)}
      />
    </div>
  );
};

export const SidebarNavSection = () => {
  const [items, setItems] = useLocalStorage<SidebarNavItemConfig[]>(
    "sidebar_nav_items",
    DEFAULT_SIDEBAR_NAV_ITEMS,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleToggle = useCallback(
    (id: SidebarNavItemId, enabled: boolean) => {
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="divide-y divide-border">
          {items.map((item) => (
            <SortableSidebarRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
