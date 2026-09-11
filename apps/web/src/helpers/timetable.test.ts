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

describe("custom timetable slot start-time classification", () => {
  test("starts during school hours and stays in the grid", () => {
    expect(classifyCustomTimetableSlot(slot("09:00", "10:00"))).toBe("grid");
  });

  test("starts during school hours and remains in the grid when it runs late", () => {
    expect(classifyCustomTimetableSlot(slot("21:00", "23:30"))).toBe("grid");
  });

  test("starts before school and belongs to the start region", () => {
    expect(classifyCustomTimetableSlot(slot("06:15", "07:30"))).toBe("start");
  });

  test("starts at or after school end and belongs to the end region", () => {
    expect(classifyCustomTimetableSlot(slot("22:40", "23:50"))).toBe("end");
  });

  test("uses half-open school-hour boundaries", () => {
    expect(
      classifyCustomTimetableSlot(
        slot("08:00", "09:00"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("grid");
    expect(
      classifyCustomTimetableSlot(
        slot("22:20", "23:00"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("end");
  });

  test("classifies each slot independently when one item splits regions", () => {
    const item: CustomTimetableItem = {
      id: "split-item",
      title: "Split activity",
      color: "#123456",
      slots: [
        slot("09:00", "10:00"),
        slot("06:15", "07:30"),
        slot("22:40", "23:50"),
      ],
    };

    expect(
      item.slots.map((value) => classifyCustomTimetableSlot(value)),
    ).toEqual(["grid", "start", "end"]);
  });
});

describe("extended timetable band geometry", () => {
  test("finds the earliest start-region time and latest end-region time", () => {
    expect(
      getTimetableOffGridBounds([
        activity("06:15", "07:30"),
        activity("21:00", "23:30"),
        activity("05:45", "07:00"),
        activity("22:40", "23:50"),
      ]),
    ).toEqual({ preStart: 345, lateEnd: 1430 });
  });

  test("creates a late region for a grid-starting activity that runs late", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("09:00", "10:00"), activity("21:00", "23:30")],
      860,
    );

    expect(geometry.pre).toBeNull();
    expect(geometry.late).not.toBeNull();
  });

  test("does not create either region when there are no out-of-hours activities", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("09:00", "10:00")],
      860,
    );

    expect(geometry.pre).toBeNull();
    expect(geometry.late).toBeNull();
  });

  test("keeps a grid-starting late block continuous across the boundary", () => {
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

  test("supports a start-region block and an end-region block in one item", () => {
    const item: CustomTimetableItem = {
      id: "split-item",
      title: "Split activity",
      color: "#123456",
      slots: [slot("06:15", "07:30"), slot("22:40", "23:50")],
    };
    const geometry = getTimetableExtendedHoursGeometry(
      item.slots.map((customSlot) => ({ customSlot }) as CourseTimeslotData),
      860,
    );

    expect(geometry.pre?.start).toBe(375);
    expect(geometry.late?.end).toBe(1430);
  });
});
