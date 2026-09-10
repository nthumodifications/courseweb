import { describe, expect, test } from "bun:test";
import {
  classifyCustomTimetableSlot,
  timetableGridEnd,
  timetableGridStart,
} from "./timetable";
import { CustomTimetableItem } from "@/types/timetable";

const slot = (start: string, end: string) => ({
  day: 0,
  start,
  end,
});

describe("custom timetable slot grid classification", () => {
  test("classifies a slot fully inside the grid as grid", () => {
    expect(classifyCustomTimetableSlot(slot("09:00", "10:00"))).toBe("grid");
    expect(classifyCustomTimetableSlot(slot("18:30", "21:00"))).toBe("grid");
  });

  test("classifies a slot starting before the grid as off-grid", () => {
    expect(classifyCustomTimetableSlot(slot("07:30", "08:30"))).toBe(
      "off-grid",
    );
  });

  test("classifies a slot ending after the grid as off-grid", () => {
    expect(classifyCustomTimetableSlot(slot("22:00", "23:30"))).toBe(
      "off-grid",
    );
  });

  test("classifies a slot entirely before the grid as off-grid", () => {
    expect(classifyCustomTimetableSlot(slot("06:00", "07:30"))).toBe(
      "off-grid",
    );
  });

  test("classifies a slot entirely after the grid as off-grid", () => {
    expect(classifyCustomTimetableSlot(slot("23:00", "23:30"))).toBe(
      "off-grid",
    );
  });

  test("includes slots that exactly touch either grid boundary", () => {
    expect(
      classifyCustomTimetableSlot(
        slot("08:00", "09:00"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("grid");
    expect(
      classifyCustomTimetableSlot(
        slot("21:20", "22:20"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("grid");
  });

  test("classifies each slot independently when one item splits", () => {
    const item: CustomTimetableItem = {
      id: "split-item",
      title: "Split activity",
      color: "#123456",
      slots: [slot("10:00", "11:00"), slot("06:00", "07:30")],
    };

    expect(
      item.slots.map((value) => classifyCustomTimetableSlot(value)),
    ).toEqual(["grid", "off-grid"]);
  });
});
