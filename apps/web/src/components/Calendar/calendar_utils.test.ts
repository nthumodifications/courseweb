import { describe, expect, test } from "bun:test";
import {
  eventsToDisplay,
  getActualEndDate,
  getDisplayEndDate,
  getRepeatDefinitionBefore,
  getRepeatedStartDays,
  reanchorSeriesEdit,
} from "./calendar_utils";
import type { CalendarEvent } from "./calendar.types";
import { eventFormSchema } from "./eventFormSchema";
import { fromZonedTime } from "date-fns-tz";

const TAIPEI_TIME_ZONE = "Asia/Taipei";

const localDate = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
) =>
  fromZonedTime(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00.000`,
    TAIPEI_TIME_ZONE,
  );

const makeEvent = (
  start: Date,
  end: Date,
  repeat: CalendarEvent["repeat"],
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: "event-1",
  title: "Calendar event",
  allDay: false,
  start,
  end,
  repeat,
  color: "#000000",
  tag: "other",
  ...overrides,
});

const dates = (values: Date[]) => values.map((date) => date.toISOString());

describe("calendar recurrence", () => {
  test("includes the final calendar date for a date-mode rule", () => {
    const event = makeEvent(
      localDate(2026, 9, 10, 9),
      localDate(2026, 9, 10, 10),
      {
        type: "daily",
        interval: 1,
        mode: "date",
        value: localDate(2026, 9, 12).getTime(),
      },
    );

    const displayed = eventsToDisplay(
      [event],
      localDate(2026, 9, 10),
      localDate(2026, 9, 13),
    );

    expect(dates(displayed.map(({ displayStart }) => displayStart))).toEqual(
      dates([
        localDate(2026, 9, 10, 9),
        localDate(2026, 9, 11, 9),
        localDate(2026, 9, 12, 9),
      ]),
    );
  });

  test("rejects a date-mode repeat end before the event start date", () => {
    const result = eventFormSchema.safeParse({
      id: "event-1",
      title: "Calendar event",
      details: "",
      location: "",
      allDay: false,
      start: localDate(2026, 9, 10, 9),
      end: localDate(2026, 9, 10, 10),
      repeat: {
        type: "daily",
        interval: 1,
        mode: "date",
        value: localDate(2026, 9, 9).getTime(),
      },
      color: "#000000",
      tag: "other",
    });

    expect(result.success).toBe(false);
  });

  test("anchors monthly occurrences and clamps missing days to month end", () => {
    const event = makeEvent(
      localDate(2026, 1, 31, 9),
      localDate(2026, 1, 31, 10),
      { type: "monthly", interval: 1, mode: "count", value: 3 },
    );

    const occurrences = Array.from(
      getRepeatedStartDays(event, localDate(2026, 1, 1), localDate(2026, 4, 1)),
    );

    expect(dates(occurrences)).toEqual(
      dates([
        localDate(2026, 1, 31, 9),
        localDate(2026, 2, 28, 9),
        localDate(2026, 3, 31, 9),
      ]),
    );
  });

  test("anchors yearly leap-day occurrences and re-enters leap years", () => {
    const event = makeEvent(
      localDate(2024, 2, 29, 9),
      localDate(2024, 2, 29, 10),
      { type: "yearly", interval: 1, mode: "count", value: 5 },
    );

    const occurrences = Array.from(
      getRepeatedStartDays(event, localDate(2024, 1, 1), localDate(2029, 1, 1)),
    );

    expect(dates(occurrences)).toEqual(
      dates([
        localDate(2024, 2, 29, 9),
        localDate(2025, 2, 28, 9),
        localDate(2026, 2, 28, 9),
        localDate(2027, 2, 28, 9),
        localDate(2028, 2, 29, 9),
      ]),
    );
  });

  test("clamps a weekly date-mode display end backwards to the cutoff", () => {
    const event = makeEvent(
      localDate(2026, 9, 14, 9),
      localDate(2026, 9, 14, 10),
      {
        type: "weekly",
        interval: 1,
        mode: "date",
        value: localDate(2026, 9, 20).getTime(),
      },
    );

    expect(getDisplayEndDate(event)).toEqual(localDate(2026, 9, 14, 10));
  });

  test("deleting following occurrences preserves count semantics", () => {
    const event = makeEvent(
      localDate(2026, 9, 10, 9),
      localDate(2026, 9, 10, 10),
      { type: "daily", interval: 1, mode: "count", value: 5 },
    );

    const repeatBeforeThird = getRepeatDefinitionBefore(
      event,
      localDate(2026, 9, 12, 9),
    );

    expect(repeatBeforeThird).toEqual({
      type: "daily",
      interval: 1,
      mode: "count",
      value: 2,
    });
    expect(
      dates(
        Array.from(
          getRepeatedStartDays(
            { ...event, repeat: repeatBeforeThird },
            localDate(2026, 9, 10),
            localDate(2026, 9, 20),
          ),
        ),
      ),
    ).toEqual(dates([localDate(2026, 9, 10, 9), localDate(2026, 9, 11, 9)]));

    const deletedThis = {
      ...event,
      excludedDates: [localDate(2026, 9, 11, 9)],
    };
    expect(
      dates(
        eventsToDisplay(
          [deletedThis],
          localDate(2026, 9, 10),
          localDate(2026, 9, 20),
        ).map(({ displayStart }) => displayStart),
      ),
    ).toEqual(
      dates([
        localDate(2026, 9, 10, 9),
        localDate(2026, 9, 12, 9),
        localDate(2026, 9, 13, 9),
        localDate(2026, 9, 14, 9),
      ]),
    );
  });

  test("edit-all keeps the series root date while applying the edited time", () => {
    const root = makeEvent(
      localDate(2026, 9, 10, 9),
      localDate(2026, 9, 10, 10),
      { type: "daily", interval: 1, mode: "count", value: 3 },
    );
    const editedOccurrence = {
      ...root,
      title: "Edited series",
      start: localDate(2026, 9, 12, 11),
      end: localDate(2026, 9, 12, 12),
    };

    const reanchored = reanchorSeriesEdit(root, editedOccurrence);

    expect(reanchored.start).toEqual(localDate(2026, 9, 10, 11));
    expect(reanchored.end).toEqual(localDate(2026, 9, 10, 12));
    expect(reanchored.title).toBe("Edited series");
  });

  test("range-bounds expansion without restarting a count at the range", () => {
    const event = makeEvent(
      localDate(2020, 1, 1, 9),
      localDate(2020, 1, 1, 10),
      { type: "daily", interval: 1, mode: "count", value: 1_000_000_000 },
    );
    const rangeStart = localDate(2026, 9, 10);
    const rangeEnd = localDate(2026, 9, 17, 23, 59);

    const displayed = eventsToDisplay([event], rangeStart, rangeEnd);

    expect(dates(displayed.map(({ displayStart }) => displayStart))).toEqual(
      dates([
        localDate(2026, 9, 10, 9),
        localDate(2026, 9, 11, 9),
        localDate(2026, 9, 12, 9),
        localDate(2026, 9, 13, 9),
        localDate(2026, 9, 14, 9),
        localDate(2026, 9, 15, 9),
        localDate(2026, 9, 16, 9),
        localDate(2026, 9, 17, 9),
      ]),
    );

    const shortRule = makeEvent(
      localDate(2026, 9, 1, 9),
      localDate(2026, 9, 1, 10),
      { type: "daily", interval: 1, mode: "count", value: 3 },
    );
    expect(eventsToDisplay([shortRule], rangeStart, rangeEnd)).toHaveLength(0);
  });

  test("uses the recurrence bound for actualEnd", () => {
    const event = makeEvent(
      localDate(2026, 1, 31, 9),
      localDate(2026, 1, 31, 10),
      { type: "monthly", interval: 1, mode: "count", value: 3 },
    );

    expect(getActualEndDate(event)).toBe(
      localDate(2026, 3, 31, 10).toISOString(),
    );
  });

  test("places recurrence occurrences using Taipei wall-clock time", () => {
    const event = makeEvent(
      localDate(2026, 1, 31, 9),
      localDate(2026, 1, 31, 10),
      { type: "monthly", interval: 1, mode: "count", value: 3 },
    );

    expect(
      eventsToDisplay(
        [event],
        localDate(2026, 3, 1),
        localDate(2026, 4, 1),
      ).map(({ displayStart }) => displayStart.toISOString()),
    ).toEqual([localDate(2026, 3, 31, 9).toISOString()]);
  });

  test("clips a cross-midnight event into both Taipei calendar days", () => {
    const event = makeEvent(
      localDate(2026, 9, 10, 23, 30),
      localDate(2026, 9, 11, 1),
      null,
    );

    const firstDay = eventsToDisplay(
      [event],
      localDate(2026, 9, 10),
      localDate(2026, 9, 10, 23, 59),
    );
    const secondDay = eventsToDisplay(
      [event],
      localDate(2026, 9, 11),
      localDate(2026, 9, 11, 23, 59),
    );

    expect(firstDay).toHaveLength(1);
    expect(firstDay[0].displayStart.toISOString()).toBe(
      localDate(2026, 9, 10, 23, 30).toISOString(),
    );
    expect(firstDay[0].displayEnd.toISOString()).toBe(
      localDate(2026, 9, 10, 23, 59).toISOString(),
    );
    expect(secondDay).toHaveLength(1);
    expect(secondDay[0].displayStart.toISOString()).toBe(
      localDate(2026, 9, 11).toISOString(),
    );
    expect(secondDay[0].displayEnd.toISOString()).toBe(
      localDate(2026, 9, 11, 1).toISOString(),
    );
  });
});
