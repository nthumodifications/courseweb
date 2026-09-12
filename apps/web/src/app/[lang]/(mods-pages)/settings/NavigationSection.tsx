import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
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
import {
  Bus,
  Calendar,
  GripVertical,
  LayoutGrid,
  LayoutList,
  Settings,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/SegmentedControl";

export type NavItemId = "today" | "timetable" | "bus" | "apps" | "settings";

export interface NavItemConfig {
  id: NavItemId;
  enabled: boolean;
}

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: "today", enabled: true },
  { id: "timetable", enabled: true },
  { id: "bus", enabled: true },
  { id: "apps", enabled: true },
];

export const DEFAULT_SIDEBAR_NAV_ITEMS: NavItemConfig[] = [
  ...DEFAULT_NAV_ITEMS,
  { id: "settings", enabled: true },
];

type Placement = "none" | "bottom" | "side" | "both";

const NAV_ITEM_IDS: NavItemId[] = [
  "today",
  "timetable",
  "bus",
  "apps",
  "settings",
];

const DEFAULT_BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  ...DEFAULT_NAV_ITEMS,
  { id: "settings", enabled: false },
];

const NAV_ICONS: Record<NavItemId, typeof LayoutList> = {
  today: LayoutList,
  timetable: Calendar,
  bus: Bus,
  apps: LayoutGrid,
  settings: Settings,
};

const getCompleteItems = (
  items: NavItemConfig[],
  defaults: NavItemConfig[],
): NavItemConfig[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...items, ...defaults.filter((item) => !byId.has(item.id))].filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.id === item.id) === index,
  );
};

const getPlacement = (
  id: NavItemId,
  bottomItems: NavItemConfig[],
  sideItems: NavItemConfig[],
): Placement => {
  const inBottom = bottomItems.find((item) => item.id === id)?.enabled ?? false;
  const inSide = sideItems.find((item) => item.id === id)?.enabled ?? false;
  if (inBottom && inSide) return "both";
  if (inBottom) return "bottom";
  if (inSide) return "side";
  return "none";
};

const SortableNavigationRow = ({
  id,
  placement,
  onPlacementChange,
}: {
  id: NavItemId;
  placement: Placement;
  onPlacementChange: (placement: Placement) => void;
}) => {
  const dict = useDictionary();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const Icon = NAV_ICONS[id];
  const label = dict.navigation[id];
  const placementOptions: readonly SegmentedControlOption<Placement>[] = [
    { value: "none", label: dict.settings.navigation.locations.none },
    { value: "bottom", label: dict.settings.navigation.locations.bottom },
    { value: "side", label: dict.settings.navigation.locations.side },
    { value: "both", label: dict.settings.navigation.locations.both },
  ];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`${label} · ${dict.settings.navigation.reorder}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <Icon
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {dict.settings.navigation.locations[placement]}
        </div>
      </div>
      <SegmentedControl
        value={placement}
        options={placementOptions}
        onValueChange={onPlacementChange}
        aria-label={`${label} · ${dict.settings.navigation.location}`}
        className="sm:w-72"
      />
    </div>
  );
};

export const NavigationSection = () => {
  const [bottomItems, setBottomItems] = useLocalStorage<NavItemConfig[]>(
    "bottom_nav_items",
    DEFAULT_NAV_ITEMS,
  );
  const [sideItems, setSideItems] = useLocalStorage<NavItemConfig[]>(
    "sidebar_nav_items",
    DEFAULT_SIDEBAR_NAV_ITEMS,
  );

  const completeBottomItems = useMemo(
    () => getCompleteItems(bottomItems, DEFAULT_BOTTOM_NAV_ITEMS),
    [bottomItems],
  );
  const completeSideItems = useMemo(
    () => getCompleteItems(sideItems, DEFAULT_SIDEBAR_NAV_ITEMS),
    [sideItems],
  );
  const orderedIds = useMemo(() => {
    const ids = [...completeBottomItems, ...completeSideItems].map(
      (item) => item.id,
    );
    return ids.filter(
      (id, index, all) =>
        NAV_ITEM_IDS.includes(id) && all.indexOf(id) === index,
    );
  }, [completeBottomItems, completeSideItems]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handlePlacementChange = useCallback(
    (id: NavItemId, placement: Placement) => {
      const inBottom = placement === "bottom" || placement === "both";
      const inSide = placement === "side" || placement === "both";
      setBottomItems((items) =>
        getCompleteItems(items, DEFAULT_BOTTOM_NAV_ITEMS).map((item) =>
          item.id === id ? { ...item, enabled: inBottom } : item,
        ),
      );
      setSideItems((items) =>
        getCompleteItems(items, DEFAULT_SIDEBAR_NAV_ITEMS).map((item) =>
          item.id === id ? { ...item, enabled: inSide } : item,
        ),
      );
    },
    [setBottomItems, setSideItems],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderedIds.indexOf(active.id as NavItemId);
      const newIndex = orderedIds.indexOf(over.id as NavItemId);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextOrder = arrayMove(orderedIds, oldIndex, newIndex);
      const order = new Map(nextOrder.map((id, index) => [id, index]));
      setBottomItems((items) =>
        getCompleteItems(items, DEFAULT_BOTTOM_NAV_ITEMS).sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
        ),
      );
      setSideItems((items) =>
        getCompleteItems(items, DEFAULT_SIDEBAR_NAV_ITEMS).sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
        ),
      );
    },
    [orderedIds, setBottomItems, setSideItems],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3">
          {orderedIds.map((id) => (
            <SortableNavigationRow
              key={id}
              id={id}
              placement={getPlacement(
                id,
                completeBottomItems,
                completeSideItems,
              )}
              onPlacementChange={(placement) =>
                handlePlacementChange(id, placement)
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default NavigationSection;
