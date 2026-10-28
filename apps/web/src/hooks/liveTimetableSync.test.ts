import { describe, expect, it } from "bun:test";
import { valuesEqual } from "./syncedStorage";
import {
  getLiveTimetablePayload,
  getPublishedLiveTimetablePayload,
} from "./liveTimetableSync";

describe("live timetable payloads", () => {
  it("publishes only selected semesters and keeps empty semesters for deletions", () => {
    const payload = getLiveTimetablePayload(
      ["11510", "11420"],
      {
        "11510": ["11510CS 101000"],
        "11310": ["11310CS 101000"],
      },
      {
        "11510": [
          {
            id: "lab",
            title: "Lab",
            color: "#123456",
            slots: [{ day: 1, start: "09:00", end: "10:00" }],
          },
        ],
      },
    );

    expect(payload).toEqual({
      courses: { "11510": ["11510CS 101000"], "11420": [] },
      customItems: {
        "11510": [
          {
            id: "lab",
            title: "Lab",
            color: "#123456",
            slots: [{ day: 1, start: "09:00", end: "10:00" }],
          },
        ],
        "11420": [],
      },
    });
  });

  it("matches an already-published live share without key-order differences", () => {
    const share = {
      semesters: ["11510"],
      courses: { "11510": ["11510CS 101000"] },
      customItems: {
        "11510": [
          {
            title: "Lab",
            id: "lab",
            slots: [{ day: 1, start: "09:00", end: "10:00" }],
            color: "#123456",
          },
        ],
      },
    } as const;
    const payload = getLiveTimetablePayload(share.semesters, share.courses, {
      "11510": [
        {
          id: "lab",
          color: "#123456",
          slots: [{ day: 1, start: "09:00", end: "10:00" }],
          title: "Lab",
        },
      ],
    });

    expect(valuesEqual(payload, getPublishedLiveTimetablePayload(share))).toBe(
      true,
    );
  });

  it("keeps array order significant in live payload values", () => {
    const payload = getLiveTimetablePayload(
      ["11510"],
      { "11510": ["course-a", "course-b"] },
      {},
    );

    expect(
      valuesEqual(payload, {
        courses: { "11510": ["course-b", "course-a"] },
        customItems: { "11510": [] },
      }),
    ).toBe(false);
  });
});
