import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { WidgetType } from "@/types/widget";

type SettingsExport = keyof typeof import("./WidgetSettings");
type SettingsComponent = LazyExoticComponent<ComponentType>;

const lazySettings = (name: SettingsExport): SettingsComponent =>
  lazy(async () => {
    const settings = await import("./WidgetSettings");
    return { default: settings[name] as ComponentType };
  });

export const WIDGET_SETTINGS_REGISTRY: Partial<
  Record<WidgetType, SettingsComponent>
> = {
  bus: lazySettings("BusWidgetSettings"),
  weather: lazySettings("WeatherWidgetSettings"),
  countdown: lazySettings("CountdownWidgetSettings"),
  library: lazySettings("LibraryWidgetSettings"),
  laundry: lazySettings("LaundryWidgetSettings"),
  "sports-venues": lazySettings("SportsWidgetSettings"),
  youbike: lazySettings("YouBikeWidgetSettings"),
  shops: lazySettings("ShopsWidgetSettings"),
  "upcoming-events": lazySettings("UpcomingEventsWidgetSettings"),
};
