import { describe, it, expect } from "bun:test";
import {
  generateTimetableIcs,
  courseToEvents,
  escapeIcsText,
  foldLine,
  formatDateTime,
  taipeiTimeToUtc,
  firstOccurrence,
  pad,
  EMPTY_CALENDAR,
  SCHEDULE_TIME_SLOTS,
  SEMESTER_INFO,
  type CourseRow,
} from "./timetable-ics";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Unfold continuation lines (RFC 5545 §3.1) so every logical line is one string. */
function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "");
}

/** Split an ICS string into logical (unfolded) lines. */
function icsLines(ics: string): string[] {
  return unfold(ics)
    .split("\r\n")
    .filter((l) => l.length > 0);
}

/** Extract all VEVENT blocks as arrays of property lines. */
function extractVEvents(ics: string): string[][] {
  const lines = icsLines(ics);
  const events: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = [];
    } else if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      current.push(line);
    }
  }
  return events;
}

/**
 * Perform a comprehensive RFC 5545 structural validation on an ICS string.
 * Returns an array of error messages (empty = valid).
 */
function validateIcs(ics: string): string[] {
  const errors: string[] = [];

  // ── 1. Line ending: every line MUST end with CRLF (RFC 5545 §3.1) ──────
  // Split on bare \n; if the file only uses \r\n every piece before \n will
  // end with \r.  A bare \n (without preceding \r) is a violation.
  const rawLines = ics.split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]!;
    // Last split element may be empty string after trailing \n – skip it
    if (i === rawLines.length - 1 && raw === "") continue;
    if (!raw.endsWith("\r")) {
      errors.push(
        `Line ${i + 1}: Missing CRLF line ending (found bare LF). Content: "${raw.slice(0, 60)}"`,
      );
    }
  }

  // ── 2. Unfolded logical lines for the rest of the checks ───────────────
  const lines = icsLines(ics);

  // ── 3. VCALENDAR wrapper (RFC 5545 §3.4) ───────────────────────────────
  if (lines[0] !== "BEGIN:VCALENDAR") {
    errors.push(
      `Line 1 must be "BEGIN:VCALENDAR", got "${lines[0] ?? "(empty)"}"`,
    );
  }
  if (lines[lines.length - 1] !== "END:VCALENDAR") {
    errors.push(
      `Last line must be "END:VCALENDAR", got "${lines[lines.length - 1] ?? "(empty)"}"`,
    );
  }

  // ── 4. Required VCALENDAR properties (RFC 5545 §3.6) ──────────────────
  const hasVersion = lines.some((l) => l.startsWith("VERSION:"));
  const hasProdId = lines.some((l) => l.startsWith("PRODID:"));
  if (!hasVersion) errors.push("Missing required VCALENDAR property: VERSION");
  if (!hasProdId) errors.push("Missing required VCALENDAR property: PRODID");

  // ── 5. Validate each VEVENT (RFC 5545 §3.6.1) ─────────────────────────
  const vevents = extractVEvents(ics);
  const seenUids = new Set<string>();

  for (let i = 0; i < vevents.length; i++) {
    const props = vevents[i]!;
    const label = `VEVENT #${i + 1}`;

    const propMap = new Map<string, string[]>();
    for (const p of props) {
      const colonIdx = p.indexOf(":");
      if (colonIdx === -1) {
        errors.push(`${label}: Malformed property line "${p.slice(0, 60)}"`);
        continue;
      }
      // Property name may contain parameters (e.g. DTSTART;VALUE=DATE:…)
      const key = p.slice(0, colonIdx).split(";")[0]!;
      if (!propMap.has(key)) propMap.set(key, []);
      propMap.get(key)!.push(p.slice(colonIdx + 1));
    }

    // Required: UID
    const uidValues = propMap.get("UID");
    if (!uidValues || uidValues.length === 0) {
      errors.push(`${label}: Missing REQUIRED property UID`);
    } else {
      if (uidValues.length > 1) {
        errors.push(`${label}: UID must not appear more than once`);
      }
      const uid = uidValues[0]!;
      if (seenUids.has(uid)) {
        errors.push(`${label}: Duplicate UID "${uid}"`);
      }
      seenUids.add(uid);
    }

    // Required: DTSTAMP
    const dtstampValues = propMap.get("DTSTAMP");
    if (!dtstampValues || dtstampValues.length === 0) {
      errors.push(`${label}: Missing REQUIRED property DTSTAMP`);
    } else {
      if (dtstampValues.length > 1) {
        errors.push(`${label}: DTSTAMP must not appear more than once`);
      }
      // Must be a valid UTC datetime
      if (!/^\d{8}T\d{6}Z$/.test(dtstampValues[0]!)) {
        errors.push(
          `${label}: DTSTAMP value "${dtstampValues[0]}" is not a valid UTC datetime (expected YYYYMMDDTHHmmssZ)`,
        );
      }
    }

    // Required: DTSTART
    const dtstartValues = propMap.get("DTSTART");
    if (!dtstartValues || dtstartValues.length === 0) {
      errors.push(`${label}: Missing REQUIRED property DTSTART`);
    } else {
      if (!/^\d{8}T\d{6}Z$/.test(dtstartValues[0]!)) {
        errors.push(
          `${label}: DTSTART value "${dtstartValues[0]}" is not a valid UTC datetime`,
        );
      }
    }

    // DTEND (not strictly required by RFC but expected for timetable events)
    const dtendValues = propMap.get("DTEND");
    if (dtendValues && dtendValues.length > 0) {
      if (!/^\d{8}T\d{6}Z$/.test(dtendValues[0]!)) {
        errors.push(
          `${label}: DTEND value "${dtendValues[0]}" is not a valid UTC datetime`,
        );
      }
    }

    // SUMMARY should be present
    if (!propMap.has("SUMMARY")) {
      errors.push(`${label}: Missing SUMMARY property (recommended)`);
    }

    // RRULE validation (basic)
    const rruleValues = propMap.get("RRULE");
    if (rruleValues && rruleValues.length > 0) {
      const rrule = rruleValues[0]!;
      if (!rrule.includes("FREQ=")) {
        errors.push(`${label}: RRULE missing FREQ component`);
      }
    }
  }

  // ── 6. Content line length (RFC 5545 §3.1): max 75 octets ─────────────
  // Check the raw (folded) lines, not the unfolded ones
  const foldedLines = ics.split("\r\n");
  for (let i = 0; i < foldedLines.length; i++) {
    const octets = new TextEncoder().encode(foldedLines[i]!).length;
    if (octets > 75) {
      errors.push(
        `Physical line ${i + 1} exceeds 75 octets (${octets}): "${foldedLines[i]!.slice(0, 40)}…"`,
      );
    }
  }

  // ── 7. Nesting: BEGIN/END must be balanced ─────────────────────────────
  let depth = 0;
  for (const line of lines) {
    if (line.startsWith("BEGIN:")) depth++;
    if (line.startsWith("END:")) depth--;
    if (depth < 0) {
      errors.push("Unbalanced BEGIN/END: encountered END without matching BEGIN");
      break;
    }
  }
  if (depth !== 0) {
    errors.push(`Unbalanced BEGIN/END: ${depth} unclosed component(s)`);
  }

  return errors;
}

// ─── Test data ───────────────────────────────────────────────────────────────

const SEMESTER_11320 = SEMESTER_INFO.find((s) => s.id === "11320")!;

const SAMPLE_COURSE: CourseRow = {
  raw_id: "11320CS 135700",
  name_zh: "資料結構",
  name_en: "Data Structures",
  times: ["M3M4"],
  venues: ["台達館105"],
  teacher_zh: ["王大明"],
  teacher_en: ["Da-Ming Wang"],
};

const MULTI_DAY_COURSE: CourseRow = {
  raw_id: "11320EE 230100",
  name_zh: "電路學",
  name_en: "Circuit Theory",
  times: ["T1T2", "R1R2"],
  venues: ["工程一館201", "工程一館201"],
  teacher_zh: ["李小華"],
  teacher_en: ["Xiao-Hua Li"],
};

const EVENING_COURSE: CourseRow = {
  raw_id: "11320GE 110100",
  name_zh: "通識課程",
  name_en: "General Education",
  times: ["Wa"],
  venues: ["人社院A202"],
  teacher_zh: ["張三"],
  teacher_en: ["San Zhang"],
};

const SPECIAL_CHARS_COURSE: CourseRow = {
  raw_id: "11320MATH 290000",
  name_zh: "數學;專題,研究\\探索",
  name_en: "Math; Seminar, Research\\Exploration",
  times: ["F5F6"],
  venues: ["綜合三館R301; Room A"],
  teacher_zh: ["陳, 老師"],
  teacher_en: ["Prof. Chen, Jr."],
};

const NO_TIMES_COURSE: CourseRow = {
  raw_id: "11320CS 999900",
  name_zh: "獨立研究",
  name_en: "Independent Study",
  times: null,
  venues: null,
  teacher_zh: ["指導教授"],
  teacher_en: ["Advisor"],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("validateIcs helper (sanity check)", () => {
  it("accepts the EMPTY_CALENDAR constant", () => {
    const errors = validateIcs(EMPTY_CALENDAR);
    expect(errors).toEqual([]);
  });

  it("rejects a completely empty string", () => {
    const errors = validateIcs("");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("BEGIN:VCALENDAR"))).toBe(true);
  });

  it("rejects an ICS with bare LF line endings", () => {
    const bad = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n";
    const errors = validateIcs(bad);
    expect(errors.some((e) => e.includes("CRLF"))).toBe(true);
  });
});

describe("generateTimetableIcs – RFC 5545 compliance", () => {
  it("produces a valid ICS for a single course", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
  });

  it("produces a valid ICS for multiple courses", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE, EVENING_COURSE],
      SEMESTER_11320,
    );
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
  });

  it("produces a valid ICS when courses contain special characters", () => {
    const ics = generateTimetableIcs([SPECIAL_CHARS_COURSE], SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
  });

  it("returns EMPTY_CALENDAR for courses with no scheduled times", () => {
    const ics = generateTimetableIcs([NO_TIMES_COURSE], SEMESTER_11320);
    expect(ics).toBe(EMPTY_CALENDAR);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
  });

  it("returns EMPTY_CALENDAR for an empty courses array", () => {
    const ics = generateTimetableIcs([], SEMESTER_11320);
    expect(ics).toBe(EMPTY_CALENDAR);
  });

  it("starts with BEGIN:VCALENDAR", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });

  it("ends with END:VCALENDAR followed by CRLF", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("uses CRLF line endings exclusively", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE],
      SEMESTER_11320,
    );
    // After replacing all \r\n with nothing, there should be no remaining \n or \r
    const stripped = ics.replace(/\r\n/g, "");
    expect(stripped).not.toContain("\n");
    expect(stripped).not.toContain("\r");
  });
});

describe("generateTimetableIcs – VEVENT required properties", () => {
  it("every VEVENT has a UID", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE],
      SEMESTER_11320,
    );
    const vevents = extractVEvents(ics);
    expect(vevents.length).toBeGreaterThan(0);
    for (const props of vevents) {
      expect(props.some((p) => p.startsWith("UID:"))).toBe(true);
    }
  });

  it("every VEVENT has a DTSTAMP", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE],
      SEMESTER_11320,
    );
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      expect(props.some((p) => p.startsWith("DTSTAMP:"))).toBe(true);
    }
  });

  it("every VEVENT has a DTSTART", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      expect(props.some((p) => p.startsWith("DTSTART:"))).toBe(true);
    }
  });

  it("every VEVENT has a DTEND", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      expect(props.some((p) => p.startsWith("DTEND:"))).toBe(true);
    }
  });

  it("every VEVENT has a SUMMARY", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      expect(props.some((p) => p.startsWith("SUMMARY:"))).toBe(true);
    }
  });

  it("UIDs are unique across all VEVENTs", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE, EVENING_COURSE],
      SEMESTER_11320,
    );
    const vevents = extractVEvents(ics);
    const uids = vevents.map(
      (props) => props.find((p) => p.startsWith("UID:"))!,
    );
    const uniqueUids = new Set(uids);
    expect(uniqueUids.size).toBe(uids.length);
  });

  it("DTSTAMP values are valid UTC datetime format", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      const dtstamp = props
        .find((p) => p.startsWith("DTSTAMP:"))!
        .replace("DTSTAMP:", "");
      expect(dtstamp).toMatch(/^\d{8}T\d{6}Z$/);
    }
  });
});

describe("generateTimetableIcs – event count", () => {
  it("produces 1 event for a single-day course", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    // M3M4 = one block on Monday
    expect(vevents.length).toBe(1);
  });

  it("produces 2 events for a course with 2 separate time strings", () => {
    const ics = generateTimetableIcs([MULTI_DAY_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    // T1T2 and R1R2 = 2 events (Tuesday + Thursday)
    expect(vevents.length).toBe(2);
  });

  it("produces correct total events for multiple courses", () => {
    const ics = generateTimetableIcs(
      [SAMPLE_COURSE, MULTI_DAY_COURSE, EVENING_COURSE],
      SEMESTER_11320,
    );
    const vevents = extractVEvents(ics);
    // 1 + 2 + 1 = 4
    expect(vevents.length).toBe(4);
  });
});

describe("generateTimetableIcs – RRULE recurrence", () => {
  it("includes weekly recurrence rule", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    for (const props of vevents) {
      const rrule = props.find((p) => p.startsWith("RRULE:"));
      expect(rrule).toBeDefined();
      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("INTERVAL=1");
      expect(rrule).toContain("UNTIL=");
    }
  });

  it("uses correct BYDAY abbreviation for Monday", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const rrule = vevents[0]!.find((p) => p.startsWith("RRULE:"))!;
    expect(rrule).toContain("BYDAY=MO");
  });

  it("uses correct BYDAY abbreviation for Tuesday and Thursday", () => {
    const ics = generateTimetableIcs([MULTI_DAY_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const rrules = vevents.map((p) => p.find((l) => l.startsWith("RRULE:"))!);
    const bydays = rrules.map((r) => r.match(/BYDAY=(\w+)/)?.[1]);
    expect(bydays).toContain("TU");
    expect(bydays).toContain("TH");
  });
});

describe("generateTimetableIcs – content correctness", () => {
  it("includes the course name in SUMMARY", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const summary = vevents[0]!.find((p) => p.startsWith("SUMMARY:"))!;
    expect(summary).toContain("資料結構");
  });

  it("includes the venue in LOCATION", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const location = vevents[0]!.find((p) => p.startsWith("LOCATION:"))!;
    expect(location).toContain("台達館105");
  });

  it("includes teacher names in DESCRIPTION", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const desc = vevents[0]!.find((p) => p.startsWith("DESCRIPTION:"))!;
    expect(desc).toContain("Da-Ming Wang");
  });

  it("includes course URL in DESCRIPTION", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const desc = vevents[0]!.find((p) => p.startsWith("DESCRIPTION:"))!;
    expect(desc).toContain("https://nthumods.com/courses/");
  });

  it("falls back to name_en when name_zh is null", () => {
    const course: CourseRow = {
      ...SAMPLE_COURSE,
      name_zh: null,
    };
    const ics = generateTimetableIcs([course], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const summary = vevents[0]!.find((p) => p.startsWith("SUMMARY:"))!;
    expect(summary).toContain("Data Structures");
  });

  it("falls back to 'Course' when both names are null", () => {
    const course: CourseRow = {
      ...SAMPLE_COURSE,
      name_zh: null,
      name_en: null,
    };
    const ics = generateTimetableIcs([course], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const summary = vevents[0]!.find((p) => p.startsWith("SUMMARY:"))!;
    expect(summary).toBe("SUMMARY:Course");
  });
});

describe("escapeIcsText", () => {
  it("escapes backslashes", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
  });

  it("escapes semicolons", () => {
    expect(escapeIcsText("a;b")).toBe("a\\;b");
  });

  it("escapes commas", () => {
    expect(escapeIcsText("a,b")).toBe("a\\,b");
  });

  it("escapes newlines", () => {
    expect(escapeIcsText("a\nb")).toBe("a\\nb");
  });

  it("handles multiple special characters together", () => {
    expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeIcsText("Hello World 123")).toBe("Hello World 123");
  });
});

describe("generateTimetableIcs – special character escaping in output", () => {
  it("escapes special characters in SUMMARY", () => {
    const ics = generateTimetableIcs([SPECIAL_CHARS_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const summary = vevents[0]!.find((p) => p.startsWith("SUMMARY:"))!;
    // Raw semicolons and commas must be escaped
    expect(summary).not.toMatch(/(?<!\\);/);
    expect(summary).not.toMatch(/(?<!\\),/);
  });

  it("escapes special characters in LOCATION", () => {
    const ics = generateTimetableIcs([SPECIAL_CHARS_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const location = vevents[0]!.find((p) => p.startsWith("LOCATION:"))!;
    expect(location).not.toMatch(/(?<!\\);/);
  });

  it("escapes special characters in DESCRIPTION", () => {
    const ics = generateTimetableIcs([SPECIAL_CHARS_COURSE], SEMESTER_11320);
    const vevents = extractVEvents(ics);
    const desc = vevents[0]!.find((p) => p.startsWith("DESCRIPTION:"))!;
    // Commas in teacher names must be escaped
    expect(desc).not.toMatch(/(?<!\\),/);
  });

  it("passes full RFC validation with special characters", () => {
    const ics = generateTimetableIcs([SPECIAL_CHARS_COURSE], SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
  });
});

describe("foldLine", () => {
  it("does not modify short lines", () => {
    const short = "SUMMARY:Hello";
    expect(foldLine(short)).toBe(short);
  });

  it("does not modify a line at exactly 75 characters", () => {
    const exact = "X".repeat(75);
    expect(foldLine(exact)).toBe(exact);
  });

  it("folds a line longer than 75 characters", () => {
    const long = "DESCRIPTION:" + "A".repeat(100);
    const folded = foldLine(long);
    // Each physical line should be ≤75 octets
    const physicalLines = folded.split("\r\n");
    for (const pl of physicalLines) {
      expect(new TextEncoder().encode(pl).length).toBeLessThanOrEqual(75);
    }
  });

  it("continuation lines start with a space", () => {
    const long = "SUMMARY:" + "B".repeat(200);
    const folded = foldLine(long);
    const physicalLines = folded.split("\r\n");
    for (let i = 1; i < physicalLines.length; i++) {
      expect(physicalLines[i]![0]).toBe(" ");
    }
  });

  it("can be unfolded back to the original content", () => {
    const original = "DESCRIPTION:" + "Test content with many characters. ".repeat(10);
    const folded = foldLine(original);
    const unfolded = unfold(folded);
    expect(unfolded).toBe(original);
  });
});

describe("formatDateTime", () => {
  it("formats a UTC date correctly", () => {
    const d = new Date(Date.UTC(2025, 1, 17, 0, 0, 0));
    expect(formatDateTime(d)).toBe("20250217T000000Z");
  });

  it("zero-pads single digit months and days", () => {
    const d = new Date(Date.UTC(2025, 0, 5, 8, 5, 3));
    expect(formatDateTime(d)).toBe("20250105T080503Z");
  });

  it("handles end-of-year dates", () => {
    const d = new Date(Date.UTC(2024, 11, 31, 23, 59, 59));
    expect(formatDateTime(d)).toBe("20241231T235959Z");
  });
});

describe("taipeiTimeToUtc", () => {
  it("converts Taipei 08:00 to UTC 00:00", () => {
    expect(taipeiTimeToUtc("08:00")).toEqual({ hours: 0, minutes: 0 });
  });

  it("converts Taipei 13:20 to UTC 05:20", () => {
    expect(taipeiTimeToUtc("13:20")).toEqual({ hours: 5, minutes: 20 });
  });

  it("converts Taipei 00:00 to UTC 16:00 (previous day)", () => {
    expect(taipeiTimeToUtc("00:00")).toEqual({ hours: 16, minutes: 0 });
  });

  it("converts Taipei 21:30 to UTC 13:30", () => {
    expect(taipeiTimeToUtc("21:30")).toEqual({ hours: 13, minutes: 30 });
  });
});

describe("pad", () => {
  it("pads single digits", () => {
    expect(pad(0)).toBe("00");
    expect(pad(5)).toBe("05");
    expect(pad(9)).toBe("09");
  });

  it("does not pad double digits", () => {
    expect(pad(10)).toBe("10");
    expect(pad(31)).toBe("31");
    expect(pad(99)).toBe("99");
  });
});

describe("courseToEvents", () => {
  it("returns empty array for a course with no times", () => {
    expect(courseToEvents(NO_TIMES_COURSE)).toEqual([]);
  });

  it("parses a single time block", () => {
    const events = courseToEvents(SAMPLE_COURSE);
    expect(events.length).toBe(1);
    expect(events[0]!.dayOfWeek).toBe(0); // M = Monday = index 0
    expect(events[0]!.venue).toBe("台達館105");
  });

  it("groups consecutive slots on the same day", () => {
    const events = courseToEvents(SAMPLE_COURSE);
    // M3M4 should be one event with startTime=2 (slot "3") endTime=3 (slot "4")
    expect(events[0]!.startTime).toBe(2); // "3" is index 2
    expect(events[0]!.endTime).toBe(3); // "4" is index 3
  });

  it("parses multiple time strings into separate events", () => {
    const events = courseToEvents(MULTI_DAY_COURSE);
    expect(events.length).toBe(2);
    // T = Tuesday = index 1, R = Thursday = index 3
    const days = events.map((e) => e.dayOfWeek).sort();
    expect(days).toEqual([1, 3]);
  });

  it("handles evening slots", () => {
    const events = courseToEvents(EVENING_COURSE);
    expect(events.length).toBe(1);
    expect(events[0]!.dayOfWeek).toBe(2); // W = Wednesday = index 2
    // "a" is the evening slot at index 10
    expect(events[0]!.startTime).toBe(10);
    expect(events[0]!.endTime).toBe(10);
  });

  it("handles empty time strings gracefully", () => {
    const course: CourseRow = {
      ...SAMPLE_COURSE,
      times: ["", "M1"],
      venues: ["", "Room A"],
    };
    const events = courseToEvents(course);
    expect(events.length).toBe(1);
    expect(events[0]!.venue).toBe("Room A");
  });
});

describe("firstOccurrence", () => {
  it("finds Monday from a Sunday start", () => {
    // Taipei Feb 17, 2025 (Mon) → semStart = Feb 16 16:00 UTC (Sun UTC)
    const semStart = new Date(Date.UTC(2025, 1, 16, 16, 0, 0));
    const monday = firstOccurrence(semStart, 0); // 0 = Mon in MTWRFS
    expect(monday.getUTCDay()).toBe(1); // JS 1 = Monday
    expect(monday.getUTCDate()).toBe(17);
  });

  it("finds Saturday from a Sunday start", () => {
    const semStart = new Date(Date.UTC(2025, 1, 16, 16, 0, 0));
    const saturday = firstOccurrence(semStart, 5); // 5 = Sat in MTWRFS
    expect(saturday.getUTCDay()).toBe(6); // JS 6 = Saturday
    expect(saturday.getUTCDate()).toBe(22);
  });
});

describe("generateTimetableIcs – all semesters", () => {
  it("produces valid ICS for every defined semester", () => {
    for (const sem of SEMESTER_INFO) {
      const ics = generateTimetableIcs([SAMPLE_COURSE], sem);
      const errors = validateIcs(ics);
      if (errors.length > 0) {
        // Provide a helpful failure message
        throw new Error(
          `Semester ${sem.id} produced invalid ICS:\n${errors.join("\n")}`,
        );
      }
    }
  });
});

describe("generateTimetableIcs – edge cases", () => {
  it("handles a course with only null fields gracefully", () => {
    const minimal: CourseRow = {
      raw_id: "11320XX 000000",
      name_zh: null,
      name_en: null,
      times: ["M1"],
      venues: null,
      teacher_zh: null,
      teacher_en: null,
    };
    const ics = generateTimetableIcs([minimal], SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
    const vevents = extractVEvents(ics);
    expect(vevents.length).toBe(1);
    const summary = vevents[0]!.find((p) => p.startsWith("SUMMARY:"))!;
    expect(summary).toBe("SUMMARY:Course");
  });

  it("handles many courses without UID collision", () => {
    const courses: CourseRow[] = [];
    for (let i = 0; i < 20; i++) {
      courses.push({
        raw_id: `11320CS ${String(i).padStart(6, "0")}`,
        name_zh: `課程${i}`,
        name_en: `Course ${i}`,
        times: ["M1M2"],
        venues: [`Room ${i}`],
        teacher_zh: [`教師${i}`],
        teacher_en: [`Teacher ${i}`],
      });
    }
    const ics = generateTimetableIcs(courses, SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
    const vevents = extractVEvents(ics);
    expect(vevents.length).toBe(20);
  });

  it("handles a course spanning many consecutive slots", () => {
    const longCourse: CourseRow = {
      raw_id: "11320CS 888800",
      name_zh: "長時段課程",
      name_en: "Long Course",
      // 6 consecutive morning slots: 1,2,3,4,n,5
      times: ["M1M2M3M4MnM5"],
      venues: ["教室"],
      teacher_zh: ["教師"],
      teacher_en: ["Teacher"],
    };
    const ics = generateTimetableIcs([longCourse], SEMESTER_11320);
    const errors = validateIcs(ics);
    expect(errors).toEqual([]);
    const vevents = extractVEvents(ics);
    // Should be one continuous block
    expect(vevents.length).toBe(1);
  });

  it("VCALENDAR contains VERSION and PRODID", () => {
    const ics = generateTimetableIcs([SAMPLE_COURSE], SEMESTER_11320);
    const lines = icsLines(ics);
    expect(lines).toContain("VERSION:2.0");
    expect(lines.some((l) => l.startsWith("PRODID:"))).toBe(true);
  });
});
