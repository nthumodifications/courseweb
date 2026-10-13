import { describe, expect, test } from "bun:test";
import { mergeSyncedValue, validKeys } from "./kv_storage_contract";

describe("KV timetable custom-item contract", () => {
  test("allows the custom timetable storage key", () => {
    expect(validKeys).toContain("timetable_custom_items");
  });

  test("allows the self-reported grades storage key", () => {
    expect(validKeys).toContain("grades");
  });

  test("allows the timetable display settings storage key", () => {
    expect(validKeys).toContain("timetable-display-settings");
  });

  test("merges custom items by id and lets incoming edits win", () => {
    expect(
      mergeSyncedValue(
        "timetable_custom_items",
        {
          "11410": [
            { id: "keep", title: "Keep" },
            { id: "edit", title: "Old title" },
          ],
        },
        {
          "11410": [
            { id: "new", title: "New" },
            { id: "edit", title: "New title" },
          ],
        },
      ),
    ).toEqual({
      "11410": [
        { id: "keep", title: "Keep" },
        { id: "edit", title: "New title" },
        { id: "new", title: "New" },
      ],
    });
  });
});
