import { describe, expect, test } from "bun:test";
import {
  classifyCustomTimetableSlot,
  getTimetableExtendedHoursGeometry,
  getTimetableOffGridBounds,
  getTimetableTimeRangePosition,
  timetableGridEnd,
  timetableGridStart,
} from "./timetable";
import { CourseTimeslotData, CustomTimetableItem } from "@/types/timetable";

const slot = (start: string, end: string) => ({
  day: 0,
  start,
  end,
});

const activity = (start: string, end: string) =>
  ({ customSlot: slot(start, end) }) as CourseTimeslotData;

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

describe("extended timetable band geometry", () => {
  test("finds the earliest pre-grid start and latest post-grid end", () => {
    expect(
      getTimetableOffGridBounds([
        activity("07:30", "08:30"),
        activity("22:00", "23:30"),
        activity("06:15", "07:00"),
        activity("23:00", "23:15"),
      ]),
    ).toEqual({ preStart: 375, lateEnd: 1410 });
  });

  test("does not create either band when every activity fits the grid", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("08:00", "09:00"), activity("21:20", "22:20")],
      860,
    );

    expect(geometry.pre).toBeNull();
    expect(geometry.late).toBeNull();
  });

  test("keeps a late block continuous across the period-row boundary", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("21:00", "23:30")],
      860,
    );

    expect(getTimetableTimeRangePosition(1260, 1410, geometry)).toEqual({
      start: 780,
      end: 930,
      size: 150,
    });
  });

  test("clamps short bands to the minimum and long bands to the maximum", () => {
    const shortBand = getTimetableExtendedHoursGeometry(
      [activity("07:59", "08:00")],
      860,
    );
    const longBand = getTimetableExtendedHoursGeometry(
      [activity("00:00", "03:00")],
      860,
    );

    expect(shortBand.pre?.size).toBe(48);
    expect(longBand.pre?.size).toBe(240);
  });
});
