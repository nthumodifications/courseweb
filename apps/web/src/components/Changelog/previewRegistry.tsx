import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type ChangelogPreviewProps = { language: "zh" | "en" };
export type ChangelogPreviewComponent = ComponentType<ChangelogPreviewProps>;

export const previews = {
  "city-buses": lazy(() => import("./previews/CityBusesPreview")),
  "course-module": lazy(() => import("./previews/CourseModulePreview")),
  "prerequisite-graph": lazy(
    () => import("./previews/PrerequisiteGraphPreview"),
  ),
  "search-states": lazy(() => import("./previews/SearchStatesPreview")),
  "timetable-safe": lazy(() => import("./previews/TimetableSafePreview")),
  "smaller-updates": lazy(() => import("./previews/SmallerUpdatesPreview")),
  youbike: lazy(() => import("./previews/YouBikePreview")),
} satisfies Record<string, LazyExoticComponent<ChangelogPreviewComponent>>;

export type ChangelogVisualId = keyof typeof previews;
export const CHANGELOG_PREVIEW_REGISTRY = previews;
