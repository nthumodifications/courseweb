import { describe, expect, test } from "bun:test";
import {
  getExpandableFilterLabel,
  getVisibleExpandableFilterItems,
  groupExpandableFilterItems,
  shouldHideExpandableFilter,
  type RefinementItem,
} from "./ExpandableFilter";

const item = (
  value: string,
  count: number,
  overrides: Partial<RefinementItem> = {},
): RefinementItem => ({
  label: value,
  value,
  count,
  isRefined: false,
  ...overrides,
});

describe("ExpandableFilter helpers", () => {
  test("maps facet values to friendly labels without the raw value", () => {
    expect(
      getExpandableFilterLabel(
        item("restriction:undergraduate", 1),
        { "restriction:undergraduate": "Undergraduates only" },
        true,
      ),
    ).toBe("Undergraduates only");
  });

  test("groups items in the requested order and omits empty groups", () => {
    const items = [
      item("priority:undergraduate", 2),
      item("restriction:undergraduate", 3),
    ];

    expect(
      groupExpandableFilterItems(
        items,
        (value) =>
          value.value.startsWith("priority") ? "priority" : "restriction",
        ["restriction", "exclusion", "priority"],
      ),
    ).toEqual([
      { group: "restriction", items: [items[1]] },
      { group: "priority", items: [items[0]] },
    ]);
  });

  test("hides zero-count values while retaining a refined value", () => {
    expect(
      getVisibleExpandableFilterItems(
        [
          item("empty", 0),
          item("selected", 0, { isRefined: true }),
          item("available", 2),
        ],
        true,
      ).map(({ value }) => value),
    ).toEqual(["selected", "available"]);
  });

  test("hides the whole section when the facet is unavailable", () => {
    expect(shouldHideExpandableFilter([], true, true)).toBe(true);
    expect(shouldHideExpandableFilter([item("available", 1)], true, true)).toBe(
      false,
    );
  });
});
