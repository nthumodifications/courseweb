import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { z } from "zod";
import { env } from "hono/adapter";
import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";

type GithubEnv = {
  GITHUB_CLIENT_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_INSTALLATION_ID: string;
  TURNSTILE_SECRET_KEY: string;
  ISSUE_REQUIRE_TURNSTILE?: string;
};

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;
const REPORT_TYPES = ["bug", "missing-data", "suggestion", "praise"] as const;
const REPORT_AREAS = [
  "timetable",
  "search",
  "sync-login",
  "bus",
  "other",
] as const;
type ReportLabel =
  | (typeof REPORT_TYPES)[number]
  | (typeof REPORT_AREAS)[number];
const REPORT_ROUTE_PATTERNS = [
  "/[lang]/timetable",
  "/[lang]/calendar",
  "/[lang]/courses",
  "/[lang]/account",
  "/[lang]/bus",
  "/[lang]/issues",
  "/[lang]/contribute",
  "/[lang]/other",
] as const;
const PROVISIONED_TRIAGE_LABELS = new Set(["bug", "search", "timetable"]);
const ALLOWED_ISSUE_LABELS = new Set(["generic"]);

export const filterIssueLabels = (labels: string[]) => [
  ...new Set(labels.filter((label) => ALLOWED_ISSUE_LABELS.has(label))),
];

export const mapTriageLabels = (
  reportType?: (typeof REPORT_TYPES)[number],
  reportArea?: (typeof REPORT_AREAS)[number],
) =>
  [reportType, reportArea].filter(
    (label): label is ReportLabel =>
      label !== undefined && PROVISIONED_TRIAGE_LABELS.has(label),
  );

const sensitivePublicTextPatterns = [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g];

export const redactPublicText = (value: string) =>
  sensitivePublicTextPatterns.reduce(
    (result, pattern) => result.replace(pattern, "[redacted]"),
    value,
  );

const diagnosticsSchema = z.object({
  appVersion: z.string().regex(/^[A-Za-z0-9._+-]{1,50}$/),
  buildCommit: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
  route: z.enum(REPORT_ROUTE_PATTERNS),
  language: z.enum(["en", "zh"]),
  theme: z.enum(["light", "dark"]),
  browser: z.string().regex(/^(?:Edge|Firefox|Chrome|Safari) \d{1,4}$|^Other$/),
  os: z.enum(["Android", "iOS", "Windows", "macOS", "Linux", "Other"]),
  viewport: z.enum(["compact", "standard", "wide"]),
  online: z.boolean(),
  serviceWorker: z.enum([
    "not-supported",
    "unregistered",
    "active",
    "update-available",
  ]),
  signedIn: z.boolean(),
});

type IssueDiagnostics = z.infer<typeof diagnosticsSchema>;

export const parseIssueDiagnostics = (value: unknown) =>
  diagnosticsSchema.parse(value);

export const formatDiagnosticsBlock = (diagnostics: IssueDiagnostics) => {
  const lines = [
    "### Anonymous diagnostics",
    `- App version: ${redactPublicText(diagnostics.appVersion)}`,
    `- Build commit: ${redactPublicText(diagnostics.buildCommit)}`,
    `- Route: ${redactPublicText(diagnostics.route)}`,
    `- Language: ${diagnostics.language}`,
    `- Theme: ${diagnostics.theme}`,
    `- Browser: ${diagnostics.browser}`,
    `- OS: ${diagnostics.os}`,
    `- Viewport: ${diagnostics.viewport}`,
    `- Online: ${diagnostics.online ? "yes" : "no"}`,
    `- Service worker: ${diagnostics.serviceWorker}`,
    `- Signed in: ${diagnostics.signedIn ? "yes" : "no"}`,
  ];

  return lines.join("\n");
};

type ErrorResponse = {
  error: string;
  code?: string;
  details?: string;
};

type GithubIssue = {
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  labels: string[];
  state: string;
  locked: boolean;
  assignee: null;
  assignees: [];
  milestone: null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: null;
  author_association: string;
  active_lock_reason: null;
  draft: boolean;
  pull_request: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    merged_at: null;
  };
  body: null;
  reactions: {
    url: string;
    total_count: number;
    "+1": number;
    "-1": number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  timeline_url: string;
  performed_via_github_app: null;
  state_reason: null;
};

type PublicGithubIssue = Pick<
  GithubIssue,
  "id" | "number" | "title" | "html_url" | "state"
>;

type AppliedIssueField = "reportType" | "reportArea" | "diagnostics";

const projectPublicIssue = (issue: GithubIssue): PublicGithubIssue => ({
  id: issue.id,
  number: issue.number,
  title: issue.title,
  html_url: issue.html_url,
  state: issue.state,
});

const getJwt = (client_id: string, privateKey: string) => {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: client_id,
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  return token;
};

const getInstallationAccessToken = async (
  client_id: string,
  privateKey: string,
  installation_id: string,
) => {
  const jwtToken = await getJwt(client_id, privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${installation_id}/access_tokens`,
    {
      method: "POST",
      headers: {
        "User-Agent": "nthumods-app",
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get installation access token: ${response.status} ${response.statusText}`,
    );
  }
  const text = await response.text();

  const data = JSON.parse(text) as { token: string; expires_at: string };

  return data.token;
};

const verifyTurnstile = async (token: string, secretKey: string) => {
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  try {
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });
    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch {
    return false;
  }
};

// Only the routes that cost something are limited; reads stay open.
const issueRateLimit = rateLimitMiddleware({
  limiter: "ISSUE_RATE_LIMITER",
  errorMessage: "Too many issue requests. Please try again in a minute.",
});

const app = new Hono<{ Bindings: Bindings }>()
  .post(
    "/",
    issueRateLimit,
    zValidator(
      "json",
      z.object({
        title: z.string().max(MAX_TITLE_LENGTH),
        body: z.string().max(MAX_BODY_LENGTH),
        labels: z.array(z.string()),
        turnstileToken: z.string().optional(),
        reportType: z.enum(REPORT_TYPES).optional(),
        reportArea: z.enum(REPORT_AREAS).optional(),
        diagnostics: diagnosticsSchema.optional(),
      }),
    ),
    async (c) => {
      const {
        title,
        body,
        labels,
        turnstileToken,
        reportType,
        reportArea,
        diagnostics,
      } = c.req.valid("json");

      const {
        GITHUB_CLIENT_ID,
        GITHUB_APP_PRIVATE_KEY,
        GITHUB_INSTALLATION_ID,
        TURNSTILE_SECRET_KEY,
        ISSUE_REQUIRE_TURNSTILE,
      } = env<GithubEnv>(c);

      if (ISSUE_REQUIRE_TURNSTILE === "true" && !turnstileToken) {
        return c.json(
          {
            error: "Turnstile verification is required",
            code: "TURNSTILE_REQUIRED",
            details: "Please complete the verification and try again",
          } as ErrorResponse,
          400,
        );
      }

      // Verify Turnstile token if provided, or always when enforcement is on.
      if (turnstileToken) {
        const isValid = await verifyTurnstile(
          turnstileToken,
          TURNSTILE_SECRET_KEY,
        );
        if (!isValid) {
          return c.json(
            {
              error: "Invalid Turnstile verification",
              code: "TURNSTILE_VERIFICATION_FAILED",
              details: "Please refresh the page and try again",
            } as ErrorResponse,
            400,
          );
        }
      }

      if (!title || title.length < 7) {
        return c.json(
          {
            error: "Title is required and must be at least 7 characters long",
            code: "INVALID_TITLE",
          } as ErrorResponse,
          400,
        );
      }

      if (!body || body.trim().length < 10) {
        return c.json(
          {
            error:
              "Description is required and must be at least 10 characters long",
            code: "INVALID_DESCRIPTION",
          } as ErrorResponse,
          400,
        );
      }

      // Redact sensitive identifiers from the public report content.
      const publicTitle = redactPublicText(title);
      const publicBody = redactPublicText(
        [body, diagnostics ? formatDiagnosticsBlock(diagnostics) : ""]
          .filter(Boolean)
          .join("\n\n"),
      );

      if (!publicTitle || publicTitle.length < 7) {
        return c.json(
          {
            error: "Title is required and must be at least 7 characters long",
            code: "INVALID_TITLE",
          } as ErrorResponse,
          400,
        );
      }

      if (publicBody.length > MAX_BODY_LENGTH) {
        return c.json(
          {
            error: `Description must be at most ${MAX_BODY_LENGTH} characters long`,
            code: "DESCRIPTION_TOO_LONG",
          } as ErrorResponse,
          400,
        );
      }

      // base64 encoded private key to utf8, not using buffer
      const privateKey = atob(GITHUB_APP_PRIVATE_KEY);

      let accessToken: string;
      try {
        accessToken = await getInstallationAccessToken(
          GITHUB_CLIENT_ID,
          privateKey,
          GITHUB_INSTALLATION_ID,
        );
      } catch (error) {
        console.error("Failed to get GitHub access token:", error);
        return c.json(
          {
            error: "Failed to authenticate with GitHub",
            code: "GITHUB_AUTH_FAILED",
            details: "Please try again later",
          } as ErrorResponse,
          500,
        );
      }
      const repoOwner = "nthumodifications";
      const repoName = "courseweb";
      const safeLabels = [
        ...filterIssueLabels(labels),
        ...mapTriageLabels(reportType, reportArea),
      ];
      const deduplicatedLabels = [...new Set(safeLabels)];

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
          {
            method: "POST",
            headers: {
              "User-Agent": "nthumods-app",
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify({
              title: publicTitle,
              body: publicBody,
              labels: deduplicatedLabels,
            }),
          },
        );

        if (!response.ok) {
          console.error("GitHub API error", response.status);

          let errorResponse: ErrorResponse;

          switch (response.status) {
            case 401:
              errorResponse = {
                error: "Authentication failed with GitHub",
                code: "GITHUB_AUTH_INVALID",
                details: "Please refresh and try again",
              };
              break;
            case 403:
              errorResponse = {
                error: "Access denied by GitHub",
                code: "GITHUB_ACCESS_DENIED",
                details: "Rate limit exceeded or insufficient permissions",
              };
              break;
            case 422:
              errorResponse = {
                error: "Invalid issue data",
                code: "GITHUB_VALIDATION_ERROR",
                details: "The issue data was rejected by GitHub",
              };
              break;
            default:
              errorResponse = {
                error: "Failed to create GitHub issue",
                code: "GITHUB_API_ERROR",
                details: `HTTP ${response.status}: ${response.statusText}`,
              };
          }

          return c.json(errorResponse, response.status as any);
        }

        const data = (await response.json()) as GithubIssue;
        const applied = [
          reportType ? ("reportType" as const) : undefined,
          reportArea ? ("reportArea" as const) : undefined,
          diagnostics ? ("diagnostics" as const) : undefined,
        ].filter((field): field is AppliedIssueField => field !== undefined);

        return c.json({ ...data, applied });
      } catch (error) {
        console.error("Error creating GitHub issue:", error);
        return c.json(
          {
            error: "Failed to submit issue",
            code: "NETWORK_ERROR",
            details: "Please check your connection and try again",
          } as ErrorResponse,
          500,
        );
      }
    },
  )
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        tag: z.string(),
      }),
    ),
    async (c) => {
      const { tag } = c.req.valid("query");

      // Validate tag parameter
      if (!tag || tag.trim().length === 0) {
        return c.json(
          {
            error: "Tag parameter is required",
            code: "MISSING_TAG",
          } as ErrorResponse,
          400,
        );
      }

      const {
        GITHUB_CLIENT_ID,
        GITHUB_APP_PRIVATE_KEY,
        GITHUB_INSTALLATION_ID,
      } = env<GithubEnv>(c);
      const privateKey = atob(GITHUB_APP_PRIVATE_KEY);

      let accessToken: string;
      try {
        accessToken = await getInstallationAccessToken(
          GITHUB_CLIENT_ID,
          privateKey,
          GITHUB_INSTALLATION_ID,
        );
      } catch (error) {
        console.error("Failed to get GitHub access token for GET:", error);
        return c.json(
          {
            error: "Failed to authenticate with GitHub",
            code: "GITHUB_AUTH_FAILED",
            details: "Please try again later",
          } as ErrorResponse,
          500,
        );
      }

      const repoOwner = "nthumodifications";
      const repoName = "courseweb";

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/issues?filter=all&labels=${encodeURIComponent(tag)}&state=open`,
          {
            method: "GET",
            headers: {
              "User-Agent": "nthumods-app",
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          },
        );

        if (!response.ok) {
          console.error("GitHub API GET error", response.status);

          let errorResponse: ErrorResponse;

          switch (response.status) {
            case 401:
              errorResponse = {
                error: "Authentication failed with GitHub",
                code: "GITHUB_AUTH_INVALID",
                details: "Please refresh and try again",
              };
              break;
            case 403:
              errorResponse = {
                error: "Access denied by GitHub",
                code: "GITHUB_ACCESS_DENIED",
                details: "Rate limit exceeded or insufficient permissions",
              };
              break;
            case 404:
              errorResponse = {
                error: "Repository not found",
                code: "GITHUB_REPO_NOT_FOUND",
                details: "The repository may have been moved or deleted",
              };
              break;
            default:
              errorResponse = {
                error: "Failed to fetch issues from GitHub",
                code: "GITHUB_API_ERROR",
                details: `HTTP ${response.status}: ${response.statusText}`,
              };
          }

          return c.json(errorResponse, Math.min(response.status, 500) as any);
        }

        const data = (await response.json()) as GithubIssue[];

        // Validate response data
        if (!Array.isArray(data)) {
          return c.json(
            {
              error: "Invalid response from GitHub",
              code: "INVALID_GITHUB_RESPONSE",
              details: "Expected an array of issues",
            } as ErrorResponse,
            502,
          );
        }

        return c.json(data.map(projectPublicIssue));
      } catch (error) {
        console.error("Error fetching GitHub issues:", error);
        return c.json(
          {
            error: "Failed to fetch issues",
            code: "NETWORK_ERROR",
            details: "Please check your connection and try again",
          } as ErrorResponse,
          500,
        );
      }
    },
  );

export default app;
