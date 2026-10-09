import { describe, expect, it } from "bun:test";
import {
  DEFAULT_ATTACH_DIAGNOSTICS,
  buildIssueBody,
  findLikelyDuplicates,
  getBrowserFamily,
  getOsFamily,
  getRoutePatternFromPath,
  getViewportBucket,
  getAttachedDiagnostics,
  getReportAreaFromPath,
} from "./issue-report";

describe("issue report helpers", () => {
  it("infers the report area from the current route", () => {
    expect(getReportAreaFromPath("/zh/timetable")).toBe("timetable");
    expect(getReportAreaFromPath("/en/courses")).toBe("search");
    expect(getReportAreaFromPath("/en/settings/sync")).toBe("sync-login");
    expect(getReportAreaFromPath("/zh/bus/red")).toBe("bus");
    expect(getReportAreaFromPath("/en/issues")).toBe("other");
  });

  it("keeps expected and actual bug details in the public body", () => {
    expect(
      buildIssueBody({
        description: "Search failed",
        expected: "The course should appear",
        actual: "The result was empty",
      }),
    ).toBe(
      "Search failed\n\n**Expected**\nThe course should appear\n\n**What happened**\nThe result was empty",
    );
  });

  it("offers likely duplicate issues using shared title words", () => {
    expect(
      findLikelyDuplicates("Course search is empty", [
        { id: 1, title: "Course search returns no results" },
        { id: 2, title: "Bus timetable is stale" },
      ]).map((issue) => issue.id),
    ).toEqual([1]);
  });

  it("reports only browser and OS families", () => {
    expect(getBrowserFamily("Mozilla/5.0 Chrome/130.0 Safari/537.36")).toBe(
      "Chrome 130",
    );
    expect(getOsFamily("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "Windows",
    );
  });

  it("uses route patterns and viewport buckets for diagnostics", () => {
    expect(getRoutePatternFromPath("/zh/timetable/123?course=MATH101")).toBe(
      "/[lang]/timetable",
    );
    expect(getViewportBucket(390, 844)).toBe("compact");
    expect(getViewportBucket(1440, 900)).toBe("wide");
  });

  it("keeps diagnostics opt-in and omits them when opted out", () => {
    const diagnostics = { signedIn: true } as never;

    expect(DEFAULT_ATTACH_DIAGNOSTICS).toBe(false);
    expect(getAttachedDiagnostics(false, diagnostics)).toBeUndefined();
    expect(getAttachedDiagnostics(true, diagnostics)).toBe(diagnostics);
  });
});
