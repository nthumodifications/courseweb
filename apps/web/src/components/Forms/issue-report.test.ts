import { describe, expect, it } from "bun:test";
import {
  DEFAULT_ATTACH_DIAGNOSTICS,
  DIAGNOSTIC_LABEL_KEYS,
  allowlistIssueDiagnostics,
  buildIssueBody,
  findLikelyDuplicates,
  getBrowserFamily,
  getEnabledLocalFeatureFlags,
  getOsFamily,
  getRoutePatternFromPath,
  getViewportBucket,
  getViewportSize,
  getAttachedDiagnostics,
  getReportAreaFromPath,
  type IssueDiagnosticsInput,
} from "./issue-report";
import {
  normalizeClientErrorName,
  sanitizeDiagnosticText,
} from "../../lib/client-diagnostics";

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
    expect(getViewportSize(390, 844)).toBe("390x844");
  });

  it("allowlists diagnostics, bounds values, and keeps only safe values", () => {
    const input = {
      appVersion: "v".repeat(300),
      buildCommit: "build-123",
      route: "/[lang]/courses",
      language: "en",
      theme: "light",
      browser: "Chrome 130",
      os: "Windows",
      viewport: "standard",
      viewportSize: "390x844",
      online: true,
      serviceWorker: "active",
      serviceWorkerWaiting: false,
      signedIn: false,
      enabledLocalFeatureFlags: ["local-search", "other-safe-flag"],
      clientErrorCount: 7.9,
      clientErrorNames: ["TypeError", "not-safe"],
      unexpected: "must not leave the allowlist",
    } as IssueDiagnosticsInput & { unexpected: string };
    const diagnostics = allowlistIssueDiagnostics(input);

    expect(Object.keys(diagnostics)).toEqual([
      "appVersion",
      "buildCommit",
      "route",
      "language",
      "theme",
      "browser",
      "os",
      "viewport",
      "viewportSize",
      "online",
      "serviceWorker",
      "serviceWorkerWaiting",
      "signedIn",
      "enabledLocalFeatureFlags",
      "clientErrorCount",
      "clientErrorNames",
    ]);
    expect(diagnostics.appVersion).toHaveLength(160);
    expect(Object.keys(DIAGNOSTIC_LABEL_KEYS)).toEqual(
      Object.keys(diagnostics),
    );
    expect(diagnostics.enabledLocalFeatureFlags).toEqual(["local-search"]);
    expect(diagnostics.clientErrorCount).toBe(7);
    expect(diagnostics.clientErrorNames).toEqual(["TypeError", "Other"]);
  });

  it("reports only enabled local feature flags", () => {
    expect(
      getEnabledLocalFeatureFlags({ VITE_ENABLE_LOCAL_SEARCH: "true" }),
    ).toEqual(["local-search"]);
    expect(
      getEnabledLocalFeatureFlags({ VITE_ENABLE_LOCAL_SEARCH: "false" }),
    ).toEqual([]);
  });

  it("keeps diagnostics opt-in and omits them when opted out", () => {
    const diagnostics = { signedIn: true } as never;

    expect(DEFAULT_ATTACH_DIAGNOSTICS).toBe(false);
    expect(
      getAttachedDiagnostics(DEFAULT_ATTACH_DIAGNOSTICS, diagnostics),
    ).toBe(undefined);
    expect(getAttachedDiagnostics(false, diagnostics)).toBeUndefined();
    expect(getAttachedDiagnostics(true, diagnostics)).toBe(diagnostics);
  });

  for (const [value, expected] of [
    ["backtick ` and mention @here", "backtick ' and mention [at]here"],
    ["x".repeat(200), "x".repeat(160)],
  ] as const) {
    it(`sanitizes diagnostic text: ${value.slice(0, 20)}`, () => {
      expect(sanitizeDiagnosticText(value)).toBe(expected);
    });
  }

  for (const [value, expected] of [
    ["TypeError", "TypeError"],
    [{ name: "NotOnTheList" }, "Other"],
    ["unexpected-name", "Other"],
  ] as const) {
    it(`allowlists client error names: ${String(value)}`, () => {
      expect(normalizeClientErrorName(value)).toBe(expected);
    });
  }
});
