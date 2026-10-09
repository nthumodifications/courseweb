export const REPORT_TYPES = [
  "bug",
  "missing-data",
  "suggestion",
  "praise",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_AREAS = [
  "timetable",
  "search",
  "sync-login",
  "bus",
  "other",
] as const;

export type ReportArea = (typeof REPORT_AREAS)[number];

export const REPORT_ROUTE_PATTERNS = [
  "/[lang]/timetable",
  "/[lang]/calendar",
  "/[lang]/courses",
  "/[lang]/account",
  "/[lang]/bus",
  "/[lang]/issues",
  "/[lang]/contribute",
  "/[lang]/other",
] as const;

export type ReportRoutePattern = (typeof REPORT_ROUTE_PATTERNS)[number];

export const DEFAULT_ATTACH_DIAGNOSTICS = false;

export const ISSUE_TITLE_PREFIX = "[UI Submitted]: ";
export const MAX_ISSUE_TITLE_LENGTH = 180;
export const MAX_ISSUE_BODY_LENGTH = 10000;

export type KnownIssue = {
  id: number;
  number?: number;
  title: string;
  html_url?: string;
  state?: string;
};

export type IssueDiagnostics = {
  appVersion: string;
  buildCommit: string;
  route: ReportRoutePattern;
  language: "en" | "zh";
  theme: "light" | "dark";
  browser: string;
  os: "Android" | "iOS" | "Windows" | "macOS" | "Linux" | "Other";
  viewport: "compact" | "standard" | "wide";
  online: boolean;
  serviceWorker:
    | "not-supported"
    | "unregistered"
    | "active"
    | "update-available";
  signedIn: boolean;
};

export const getRoutePatternFromPath = (
  pathname: string,
): ReportRoutePattern => {
  const path = pathname.split(/[?#]/, 1)[0].toLowerCase();

  if (path.includes("timetable")) return "/[lang]/timetable";
  if (path.includes("calendar")) return "/[lang]/calendar";
  if (path.includes("course") || path.includes("search")) {
    return "/[lang]/courses";
  }
  if (
    path.includes("sync") ||
    path.includes("login") ||
    path.includes("planner") ||
    path.includes("account")
  ) {
    return "/[lang]/account";
  }
  if (path.includes("bus")) return "/[lang]/bus";
  if (path.includes("issue")) return "/[lang]/issues";
  if (path.includes("contribute")) return "/[lang]/contribute";
  return "/[lang]/other";
};

export const getViewportBucket = (
  width: number,
  height: number,
): IssueDiagnostics["viewport"] => {
  if (width < 600) return "compact";
  if (width < 1200) return "standard";
  return "wide";
};

const getBrowserLabel = (
  userAgent: string,
  family: string,
  browserToken: string,
) => {
  const majorVersion = userAgent.match(
    new RegExp(`${browserToken}/(\\d+)`, "i"),
  )?.[1];
  return majorVersion ? `${family} ${majorVersion}` : "Other";
};

export function getReportAreaFromPath(pathname: string): ReportArea {
  const path = pathname.toLowerCase();

  if (path.includes("timetable") || path.includes("calendar")) {
    return "timetable";
  }
  if (path.includes("course") || path.includes("search")) {
    return "search";
  }
  if (
    path.includes("sync") ||
    path.includes("login") ||
    path.includes("planner") ||
    path.includes("account")
  ) {
    return "sync-login";
  }
  if (path.includes("bus")) return "bus";
  return "other";
}

export function buildIssueBody({
  description,
  expected,
  actual,
}: {
  description: string;
  expected: string;
  actual: string;
}) {
  return [
    description.trim(),
    expected.trim() ? `\n\n**Expected**\n${expected.trim()}` : "",
    actual.trim() ? `\n\n**What happened**\n${actual.trim()}` : "",
  ]
    .filter(Boolean)
    .join("");
}

export function findLikelyDuplicates(
  title: string,
  issues: KnownIssue[],
): KnownIssue[] {
  const titleWords = new Set(
    title
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 3),
  );
  if (titleWords.size === 0) return [];

  return issues.filter((issue) => {
    const issueWords = new Set(
      issue.title
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 3),
    );
    const sharedWords = [...titleWords].filter((word) => issueWords.has(word));
    return (
      issue.title.toLowerCase().includes(title.toLowerCase().trim()) ||
      sharedWords.length >= 2 ||
      sharedWords.length / Math.min(titleWords.size, issueWords.size) >= 0.5
    );
  });
}

export function getBrowserFamily(userAgent: string): string {
  const userAgentLower = userAgent.toLowerCase();
  if (userAgentLower.includes("edg/")) {
    return getBrowserLabel(userAgent, "Edge", "edg");
  }
  if (userAgentLower.includes("firefox/")) {
    return getBrowserLabel(userAgent, "Firefox", "firefox");
  }
  if (userAgentLower.includes("chrome/") || userAgentLower.includes("crios/")) {
    const token = userAgentLower.includes("crios/") ? "crios" : "chrome";
    return getBrowserLabel(userAgent, "Chrome", token);
  }
  if (userAgentLower.includes("safari/")) {
    return getBrowserLabel(userAgent, "Safari", "version");
  }
  return "Other";
}

export function getOsFamily(userAgent: string): IssueDiagnostics["os"] {
  const userAgentLower = userAgent.toLowerCase();
  if (userAgentLower.includes("android")) return "Android";
  if (userAgentLower.includes("iphone") || userAgentLower.includes("ipad")) {
    return "iOS";
  }
  if (userAgentLower.includes("windows")) return "Windows";
  if (userAgentLower.includes("mac os")) return "macOS";
  if (userAgentLower.includes("linux")) return "Linux";
  return "Other";
}

export const getAttachedDiagnostics = <T>(
  attachDiagnostics: boolean,
  diagnostics: T,
) => (attachDiagnostics ? diagnostics : undefined);
