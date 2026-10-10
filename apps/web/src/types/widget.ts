export type WidgetType =
  | "schedule"
  | "weather"
  | "pinned-apps"
  | "notepad"
  | "countdown"
  | "course-selection"
  | "bus"
  | "library"
  | "laundry"
  | "sports-venues"
  | "youbike"
  | "shops"
  | "upcoming-events"
  | "grades";

export interface WidgetConfig {
  id: string; // unique instance uuid
  type: WidgetType;
  order: number;
  enabled: boolean;
}

export interface DashboardConfig {
  version: 1;
  widgets: WidgetConfig[];
  columns: 1 | 2 | 3;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  version: 1,
  columns: 2,
  widgets: [
    { id: "schedule-default", type: "schedule", order: 0, enabled: true },
    { id: "weather-default", type: "weather", order: 1, enabled: true },
    { id: "apps-default", type: "pinned-apps", order: 2, enabled: true },
    { id: "notepad-default", type: "notepad", order: 3, enabled: true },
    { id: "countdown-default", type: "countdown", order: 4, enabled: true },
    {
      id: "course-selection-default",
      type: "course-selection",
      order: 5,
      enabled: true,
    },
    { id: "bus-default", type: "bus", order: 6, enabled: false },
    { id: "library-default", type: "library", order: 7, enabled: false },
    { id: "laundry-default", type: "laundry", order: 8, enabled: false },
    {
      id: "sports-venues-default",
      type: "sports-venues",
      order: 9,
      enabled: false,
    },
    { id: "youbike-default", type: "youbike", order: 10, enabled: false },
    { id: "shops-default", type: "shops", order: 11, enabled: false },
    {
      id: "upcoming-events-default",
      type: "upcoming-events",
      order: 12,
      enabled: false,
    },
    { id: "grades-default", type: "grades", order: 13, enabled: false },
  ],
};

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  labelZh: string;
  description: string;
  defaultEnabled: boolean;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: "schedule",
    label: "Schedule",
    labelZh: "課程表",
    description: "Today's class schedule",
    defaultEnabled: true,
  },
  {
    type: "weather",
    label: "Weather",
    labelZh: "天氣",
    description: "Current weather in Hsinchu",
    defaultEnabled: true,
  },
  {
    type: "pinned-apps",
    label: "Quick Links",
    labelZh: "快速連結",
    description: "Your pinned apps",
    defaultEnabled: true,
  },
  {
    type: "notepad",
    label: "Notepad",
    labelZh: "便條紙",
    description: "Quick notes",
    defaultEnabled: false,
  },
  {
    type: "countdown",
    label: "Countdown",
    labelZh: "學期倒數",
    description: "Days left in semester",
    defaultEnabled: true,
  },
  {
    type: "course-selection",
    label: "Course selection",
    labelZh: "選課時程",
    description: "Current and upcoming course selection periods",
    defaultEnabled: true,
  },
  {
    type: "bus",
    label: "Bus Schedule",
    labelZh: "公車時刻",
    description: "Next NTHU bus departures",
    defaultEnabled: false,
  },
  {
    type: "library",
    label: "Library Seats",
    labelZh: "圖書館座位",
    description: "Live library vacancy",
    defaultEnabled: false,
  },
  {
    type: "laundry",
    label: "Laundry",
    labelZh: "洗衣機",
    description: "Available dorm laundry machines",
    defaultEnabled: false,
  },
  {
    type: "sports-venues",
    label: "Sports Venues",
    labelZh: "體育場館",
    description: "Current sports venue occupancy",
    defaultEnabled: false,
  },
  {
    type: "youbike",
    label: "YouBike",
    labelZh: "YouBike",
    description: "Your favourite station availability",
    defaultEnabled: false,
  },
  {
    type: "shops",
    label: "Shops open now",
    labelZh: "目前營業中的店家",
    description: "Campus shops and restaurants open now",
    defaultEnabled: false,
  },
  {
    type: "upcoming-events",
    label: "Upcoming events",
    labelZh: "即將到來的行程",
    description: "Your next calendar and academic dates",
    defaultEnabled: false,
  },
  {
    type: "grades",
    label: "Grades and GPA",
    labelZh: "成績與 GPA",
    description: "Estimated semester and cumulative GPA",
    defaultEnabled: false,
  },
];

const widgetTypes = new Set<WidgetType>(
  DEFAULT_DASHBOARD_CONFIG.widgets.map((widget) => widget.type),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWidgetConfig = (value: unknown): value is WidgetConfig => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    widgetTypes.has(value.type as WidgetType) &&
    typeof value.order === "number" &&
    Number.isFinite(value.order) &&
    typeof value.enabled === "boolean"
  );
};

export const needsDashboardConfigMigration = (value: unknown): boolean => {
  if (!isRecord(value)) return true;
  if (value.version !== 1 || ![1, 2, 3].includes(value.columns as number))
    return true;
  if (!Array.isArray(value.widgets) || !value.widgets.every(isWidgetConfig))
    return true;
  return DEFAULT_DASHBOARD_CONFIG.widgets.some(
    (defaultWidget) =>
      !(value.widgets as WidgetConfig[]).some(
        (widget) => widget.type === defaultWidget.type,
      ),
  );
};

/** Add newly shipped widget types without changing an existing user's choices. */
export const mergeDashboardConfig = (value: unknown): DashboardConfig => {
  const source = isRecord(value) ? value : {};
  const widgets = Array.isArray(source.widgets)
    ? source.widgets.filter(isWidgetConfig)
    : [];
  const nextOrder =
    widgets.reduce((max, widget) => Math.max(max, widget.order), -1) + 1;
  const missingWidgets = DEFAULT_DASHBOARD_CONFIG.widgets
    .filter(
      (defaultWidget) =>
        !widgets.some((widget) => widget.type === defaultWidget.type),
    )
    .map((widget, index) => ({
      ...widget,
      order: nextOrder + index,
      enabled: widget.enabled,
    }));

  return {
    version: 1,
    columns: [1, 2, 3].includes(source.columns as number)
      ? (source.columns as 1 | 2 | 3)
      : DEFAULT_DASHBOARD_CONFIG.columns,
    widgets: [...widgets, ...missingWidgets],
  };
};
