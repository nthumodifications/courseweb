import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DASHBOARD_CONFIG,
  mergeDashboardConfig,
  needsDashboardConfigMigration,
} from "./widget";

describe("widget dashboard config migration", () => {
  test("adds new widget types disabled without changing an existing layout", () => {
    const legacy = {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.slice(0, 6),
    };

    const migrated = mergeDashboardConfig(legacy);

    expect(migrated.widgets.slice(0, 6)).toEqual(legacy.widgets);
    expect(migrated.widgets.slice(6)).toEqual([
      { id: "library-default", type: "library", order: 6, enabled: false },
      { id: "laundry-default", type: "laundry", order: 7, enabled: false },
      {
        id: "sports-venues-default",
        type: "sports-venues",
        order: 8,
        enabled: false,
      },
      { id: "youbike-default", type: "youbike", order: 9, enabled: false },
    ]);
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
    expect(
      needsDashboardConfigMigration(
        DEFAULT_DASHBOARD_CONFIG.widgets.slice(0, 6),
      ),
    ).toBe(true);
    expect(needsDashboardConfigMigration(DEFAULT_DASHBOARD_CONFIG)).toBe(false);
  });
});
