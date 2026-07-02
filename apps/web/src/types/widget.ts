export type WidgetType =
  | "schedule"
  | "weather"
  | "pinned-apps"
  | "notepad"
  | "countdown"
  | "bus";

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
    { id: "bus-default", type: "bus", order: 5, enabled: false },
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
    type: "bus",
    label: "Bus Schedule",
    labelZh: "公車時刻",
    description: "Next NTHU bus departures",
    defaultEnabled: false,
  },
];
