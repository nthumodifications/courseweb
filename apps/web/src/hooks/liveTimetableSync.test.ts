import { describe, expect, it } from "bun:test";
import {
  getLiveTimetablePayload,
  getLiveTimetablePayloadKey,
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

  it("matches an already-published live share without scheduling an update", () => {
    const share = {
      semesters: ["11510"],
      courses: { "11510": ["11510CS 101000"] },
      customItems: { "11510": [] },
    } as const;
    const payload = getLiveTimetablePayload(
      share.semesters,
      share.courses,
      share.customItems,
    );

    expect(getLiveTimetablePayloadKey(payload)).toBe(
      getLiveTimetablePayloadKey(getPublishedLiveTimetablePayload(share)),
    );
  });
});
