import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DASHBOARD_CONFIG,
  mergeDashboardConfig,
  needsDashboardConfigMigration,
  WIDGET_DEFINITIONS,
} from "./widget";

describe("widget dashboard config migration", () => {
  test("fresh defaults put the five-day agenda and next-class bus first", () => {
    const enabled = DEFAULT_DASHBOARD_CONFIG.widgets
      .filter((widget) => widget.enabled)
      .sort((left, right) => left.order - right.order);

    expect(enabled.slice(0, 2).map((widget) => widget.type)).toEqual([
      "week-agenda",
      "next-class-bus",
    ]);
    expect(
      WIDGET_DEFINITIONS.filter((widget) =>
        ["week-agenda", "next-class-bus"].includes(widget.type),
      ).map((widget) => widget.type),
    ).toEqual(["week-agenda", "next-class-bus"]);
  });

  test("adds new widgets disabled without changing a saved layout", () => {
    const saved = {
      ...DEFAULT_DASHBOARD_CONFIG,
      columns: 3 as const,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets
        .filter(
          (widget) =>
            widget.type !== "week-agenda" && widget.type !== "next-class-bus",
        )
        .map((widget, index) => ({
          ...widget,
          id: `custom-${widget.type}`,
          enabled: index % 2 === 0,
          order: 30 - index,
        })),
    };

    const migrated = mergeDashboardConfig(saved);

    expect(migrated.columns).toBe(3);
    expect(migrated.widgets.slice(0, saved.widgets.length)).toEqual(
      saved.widgets,
    );
    expect(
      migrated.widgets
        .slice(saved.widgets.length)
        .map(({ type, enabled }) => ({ type, enabled })),
    ).toEqual([
      { type: "week-agenda", enabled: false },
      { type: "next-class-bus", enabled: false },
    ]);
    expect(needsDashboardConfigMigration(migrated)).toBe(false);
  });

  test("adds newly missing existing widgets using their configured defaults", () => {
    const saved = {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.filter(
        (widget) => widget.type !== "course-selection",
      ),
    };

    const migrated = mergeDashboardConfig(saved);

    expect(migrated.widgets.slice(0, saved.widgets.length)).toEqual(
      saved.widgets,
    );
    expect(migrated.widgets.at(-1)).toEqual({
      id: "course-selection-default",
      type: "course-selection",
      order: 17,
      enabled: true,
    });
    expect(needsDashboardConfigMigration(saved)).toBe(true);
  });
});
