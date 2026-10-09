import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DASHBOARD_CONFIG,
  mergeDashboardConfig,
  needsDashboardConfigMigration,
} from "./widget";

describe("widget dashboard config migration", () => {
  test("adds missing widget types with their defaults without changing layout", () => {
    const legacy = {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.slice(0, 5),
    };

    const migrated = mergeDashboardConfig(legacy);

    expect(migrated.widgets.slice(0, 5)).toEqual(legacy.widgets);
    expect(migrated.widgets.slice(5)).toEqual([
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
    ]);
  });

  test("enables a missing course-selection widget without changing existing widgets", () => {
    const stored = {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.filter(
        (widget) => widget.type !== "course-selection",
      ),
    };

    expect(mergeDashboardConfig(stored)).toEqual({
      ...stored,
      widgets: [
        ...stored.widgets,
        {
          id: "course-selection-default",
          type: "course-selection",
          order: 11,
          enabled: true,
        },
      ],
    });
  });

  test("keeps an already configured new widget unchanged", () => {
    const existing = mergeDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    const configured = {
      ...existing,
      widgets: existing.widgets.map((widget) =>
        widget.type === "library"
          ? { ...widget, enabled: true, order: 0 }
          : widget,
      ),
    };

    expect(mergeDashboardConfig(configured)).toEqual(configured);
    expect(needsDashboardConfigMigration(configured)).toBe(false);
  });

  test("recognizes an old stored config as needing migration", () => {
    const storedWithoutCourseSelection = {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.filter(
        (widget) => widget.type !== "course-selection",
      ),
    };

    expect(needsDashboardConfigMigration(storedWithoutCourseSelection)).toBe(
      true,
    );
    expect(needsDashboardConfigMigration(DEFAULT_DASHBOARD_CONFIG)).toBe(false);
  });
});
