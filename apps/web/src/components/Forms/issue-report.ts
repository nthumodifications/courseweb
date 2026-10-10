import {
  CLIENT_ERROR_NAMES,
  MAX_CLIENT_ERROR_NAMES,
  sanitizeDiagnosticText,
  type ClientErrorName,
} from "../../lib/client-diagnostics";

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
export const MAX_DIAGNOSTIC_FEATURE_FLAGS = 10;
const LOCAL_FEATURE_FLAGS = new Set(["local-search"]);

export type KnownIssue = {
  id: number;
  number?: number;
  title: string;
  html_url?: string;
  state?: string;
};

export type ServiceWorkerState = "none" | "installing" | "waiting" | "active";

export type IssueDiagnostics = {
  appVersion: string;
  buildCommit: string;
  route: ReportRoutePattern;
  language: "en" | "zh";
  theme: "light" | "dark";
  browser: string;
  os: "Android" | "iOS" | "Windows" | "macOS" | "Linux" | "Other";
  viewport: "compact" | "standard" | "wide";
  viewportSize: string;
  online: boolean;
  serviceWorker: ServiceWorkerState;
  serviceWorkerWaiting: boolean;
  signedIn: boolean;
  enabledLocalFeatureFlags: string[];
  clientErrorCount: number;
  clientErrorNames: ClientErrorName[];
};

export type IssueDiagnosticsInput = {
  appVersion: string;
  buildCommit: string;
  route: ReportRoutePattern;
  language: "en" | "zh";
  theme: "light" | "dark";
  browser: string;
  os: IssueDiagnostics["os"];
  viewport: IssueDiagnostics["viewport"];
  viewportSize: string;
  online: boolean;
  serviceWorker: ServiceWorkerState;
  serviceWorkerWaiting: boolean;
  signedIn: boolean;
  enabledLocalFeatureFlags: readonly string[];
  clientErrorCount: number;
  clientErrorNames: readonly string[];
};

export const DIAGNOSTIC_LABEL_KEYS: Record<keyof IssueDiagnostics, string> = {
  appVersion: "diagnostics_app_version",
  buildCommit: "diagnostics_build_commit",
  route: "diagnostics_route",
  language: "diagnostics_language",
  theme: "diagnostics_theme",
  browser: "diagnostics_browser",
  os: "diagnostics_os",
  viewport: "diagnostics_viewport",
  viewportSize: "diagnostics_viewport_size",
  online: "diagnostics_online",
  serviceWorker: "diagnostics_service_worker",
  serviceWorkerWaiting: "diagnostics_service_worker_waiting_worker",
  signedIn: "diagnostics_signed_in",
  enabledLocalFeatureFlags: "diagnostics_enabled_local_feature_flags",
  clientErrorCount: "diagnostics_client_error_count",
  clientErrorNames: "diagnostics_client_error_names",
};

const safeFeatureFlag = (value: string) =>
  LOCAL_FEATURE_FLAGS.has(value) ? value : null;

/** Pick and bound the only diagnostics fields allowed to leave the browser. */
export function allowlistIssueDiagnostics(
  input: IssueDiagnosticsInput,
): IssueDiagnostics {
  const browser = sanitizeDiagnosticText(input.browser);
  const clientErrorNames = [
    ...new Set(
      input.clientErrorNames.map((name) =>
        CLIENT_ERROR_NAMES.includes(name as ClientErrorName)
          ? (name as ClientErrorName)
          : "Other",
      ),
    ),
  ].slice(0, MAX_CLIENT_ERROR_NAMES);
  return {
    appVersion: sanitizeDiagnosticText(input.appVersion),
    buildCommit: sanitizeDiagnosticText(input.buildCommit),
    route: input.route,
    language: input.language,
    theme: input.theme,
    browser: /^(?:Edge|Firefox|Chrome|Safari) \d{1,4}$|^Other$/.test(browser)
      ? browser
      : "Other",
    os: input.os,
    viewport: input.viewport,
    viewportSize: sanitizeDiagnosticText(input.viewportSize),
    online: input.online,
    serviceWorker: input.serviceWorker,
    serviceWorkerWaiting: input.serviceWorkerWaiting,
    signedIn: input.signedIn,
    enabledLocalFeatureFlags: input.enabledLocalFeatureFlags
      .map(safeFeatureFlag)
      .filter((flag): flag is string => flag !== null)
      .slice(0, MAX_DIAGNOSTIC_FEATURE_FLAGS),
    clientErrorCount:
      Number.isFinite(input.clientErrorCount) && input.clientErrorCount > 0
        ? Math.floor(input.clientErrorCount)
        : 0,
    clientErrorNames,
  };
}

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

export const getViewportSize = (width: number, height: number) =>
  `${Math.max(0, Math.floor(width))}x${Math.max(0, Math.floor(height))}`;

export const getEnabledLocalFeatureFlags = (env: {
  VITE_ENABLE_LOCAL_SEARCH?: string;
}): string[] =>
  env.VITE_ENABLE_LOCAL_SEARCH?.trim().toLowerCase() === "true"
    ? ["local-search"]
    : [];

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
