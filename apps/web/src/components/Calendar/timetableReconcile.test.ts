import { CalendarEvent } from "./calendar.types";
import {
  getTimetableSyncSemesters,
  reconcileTimetableEvents,
} from "./timetableReconcile";

const start = new Date("2026-09-07T01:00:00.000Z");
const end = new Date("2026-09-07T02:00:00.000Z");

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "11410-course-a-1-2",
  title: "Course A",
  details: "",
  location: "Room 101",
  allDay: false,
  start,
  end,
  repeat: {
    type: "weekly",
    interval: 1,
    mode: "date",
    value: new Date("2026-12-27T00:00:00.000Z").getTime(),
  },
  color: "#112233",
  tag: "course",
  courseId: "11410-course-a",
  ...overrides,
});

const persisted = (value: CalendarEvent) => ({ ...value });

describe("timetable event reconciliation", () => {
  test("deletes a dropped course while preserving another course", () => {
    const courseA = event();
    const courseB = event({
      id: "11410-course-b-2-3",
      title: "Course B",
      courseId: "11410-course-b",
    });

    expect(
      reconcileTimetableEvents({
        generated: [courseA],
        persisted: [persisted(courseA), persisted(courseB)],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [], toDelete: [courseB.id] });
  });

  test("deletes the old slot and inserts the changed slot", () => {
    const oldEvent = event();
    const newEvent = event({
      id: "11410-course-a-1-3",
      start: new Date("2026-09-07T02:00:00.000Z"),
      end: new Date("2026-09-07T03:00:00.000Z"),
    });

    expect(
      reconcileTimetableEvents({
        generated: [newEvent],
        persisted: [persisted(oldEvent)],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [newEvent], toDelete: [oldEvent.id] });
  });

  test("upserts changed colour, title, and venue without deleting the slot", () => {
    const oldEvent = event();
    const newEvent = event({
      title: "Course A (updated)",
      location: "Room 202",
      color: "#445566",
    });

    expect(
      reconcileTimetableEvents({
        generated: [newEvent],
        persisted: [persisted(oldEvent)],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [newEvent], toDelete: [] });
  });

  test("deletes every generated event for an empty semester", () => {
    const courseA = event();
    const courseB = event({
      id: "11410-course-b-2-3",
      courseId: "11410-course-b",
    });

    expect(
      reconcileTimetableEvents({
        generated: [],
        persisted: [persisted(courseA), persisted(courseB)],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [], toDelete: [courseA.id, courseB.id] });
  });

  test("visits a removed semester through the checkpoint union and cleans it", () => {
    const removedSemesterEvent = event({
      id: "11320-course-a-1-2",
      courseId: "11320-course-a",
    });
    const semesters = getTimetableSyncSemesters(
      ["11410"],
      [{ semester: "11320" }],
    );

    expect(semesters).toEqual(["11410", "11320"]);
    expect(
      reconcileTimetableEvents({
        generated: [],
        persisted: [persisted(removedSemesterEvent)],
        semester: "11320",
      }),
    ).toEqual({ toUpsert: [], toDelete: [removedSemesterEvent.id] });
  });

  test("never touches hand-made events, even when ids resemble timetable events", () => {
    const generated = event();
    const handMadeWithGeneratedId = event({ courseId: null });
    const handMadeWithoutCourseId = event({
      id: "hand-made-event",
      courseId: undefined,
    });

    expect(
      reconcileTimetableEvents({
        generated: [generated],
        persisted: [
          persisted(handMadeWithGeneratedId),
          persisted(handMadeWithoutCourseId),
        ],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [], toDelete: [] });
  });

  test("returns no writes for an unchanged timetable", () => {
    const current = event();
    const migratedShape = {
      ...current,
      details: "",
      excludedDates: [],
      parentId: "",
    };

    expect(
      reconcileTimetableEvents({
        generated: [current],
        persisted: [persisted(migratedShape)],
        semester: "11410",
      }),
    ).toEqual({ toUpsert: [], toDelete: [] });
  });
});
