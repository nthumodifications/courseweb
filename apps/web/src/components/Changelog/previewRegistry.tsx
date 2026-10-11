import { type ComponentType, type LazyExoticComponent } from "react";
import { lazyWithRetry } from "@/lib/chunk-recovery";

export type ChangelogPreviewProps = { language: "zh" | "en" };
export type ChangelogPreviewComponent = ComponentType<ChangelogPreviewProps>;

export const previews = {
  "city-buses": lazyWithRetry(() => import("./previews/CityBusesPreview")),
  "course-module": lazyWithRetry(
    () => import("./previews/CourseModulePreview"),
  ),
  "prerequisite-graph": lazyWithRetry(
    () => import("./previews/PrerequisiteGraphPreview"),
  ),
  "search-states": lazyWithRetry(
    () => import("./previews/SearchStatesPreview"),
  ),
  "timetable-safe": lazyWithRetry(
    () => import("./previews/TimetableSafePreview"),
  ),
  "smaller-updates": lazyWithRetry(
    () => import("./previews/SmallerUpdatesPreview"),
  ),
  youbike: lazyWithRetry(() => import("./previews/YouBikePreview")),
} satisfies Record<string, LazyExoticComponent<ChangelogPreviewComponent>>;

export type ChangelogVisualId = keyof typeof previews;
export const CHANGELOG_PREVIEW_REGISTRY = previews;
