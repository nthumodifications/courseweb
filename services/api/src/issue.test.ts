import { afterEach, describe, expect, it, mock } from "bun:test";
mock.module("@tsndr/cloudflare-worker-jwt", () => ({
  default: { sign: () => "test-jwt" },
}));

const {
  filterIssueLabels,
  formatDiagnosticsBlock,
  mapTriageLabels,
  parseIssueDiagnostics,
  redactPublicText,
} = await import("./issue");
const { default: issue } = await import("./issue");

const originalFetch = globalThis.fetch;
const originalTurnstileFlag = process.env.ISSUE_REQUIRE_TURNSTILE;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const originalGithubEnv = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
  GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalTurnstileFlag === undefined) {
    delete process.env.ISSUE_REQUIRE_TURNSTILE;
  } else {
    process.env.ISSUE_REQUIRE_TURNSTILE = originalTurnstileFlag;
  }
  if (originalTurnstileSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
  }
  for (const [key, value] of Object.entries(originalGithubEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const postIssue = (
  body: Record<string, unknown>,
  env: Record<string, string>,
) =>
  issue.request(
    "/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

const issueDiagnostics = {
  appVersion: "0.1.0",
  buildCommit: "abc123",
  route: "/[lang]/courses",
  language: "en",
  theme: "light",
  browser: "Chrome 130",
  os: "Windows",
  viewport: "standard",
  online: true,
  serviceWorker: "active",
  signedIn: false,
} as const;

const githubIssue = {
  id: 42,
  number: 123,
  title: "[UI Submitted]: Search issue",
  html_url: "https://github.com/nthumodifications/courseweb/issues/123",
  state: "open",
};

const githubEnv = {
  GITHUB_CLIENT_ID: "test-client",
  GITHUB_APP_PRIVATE_KEY: "dGVzdC1rZXk=",
  GITHUB_INSTALLATION_ID: "test-installation",
};

const mockGithub = (issueResponse = githubIssue) => {
  Object.assign(process.env, githubEnv);
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = mock(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.includes("/access_tokens")) {
        return Response.json({ token: "installation-token" });
      }
      return Response.json(issueResponse);
    },
  ) as unknown as typeof fetch;
  return requests;
};

describe("issue creation abuse controls", () => {
  it("rejects titles and bodies over their size limits", async () => {
    const titleResponse = await postIssue(
      { title: "x".repeat(201), body: "valid description", labels: [] },
      {},
    );
    const bodyResponse = await postIssue(
      { title: "valid title", body: "x".repeat(10001), labels: [] },
      {},
    );

    expect(titleResponse.status).toBe(400);
    expect(bodyResponse.status).toBe(400);
  });

  it("rejects a short user description before adding diagnostics or calling GitHub", async () => {
    const requests = mockGithub();
    const response = await postIssue(
      {
        title: "valid title",
        body: "short",
        labels: [],
        diagnostics: issueDiagnostics,
      },
      {},
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ code: "INVALID_DESCRIPTION" });
    expect(requests).toHaveLength(0);
  });

  it("echoes applied optional fields and redacts only email addresses in the GitHub payload", async () => {
    const requests = mockGithub();
    const response = await postIssue(
      {
        title: "valid title",
        body: "Error code 12345678; contact student@example.com",
        labels: ["generic"],
        reportType: "bug",
        reportArea: "search",
        diagnostics: issueDiagnostics,
      },
      githubEnv,
    );
    const payload = await response.json();
    const githubRequest = JSON.parse(String(requests[1]?.init?.body));

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      applied: ["reportType", "reportArea", "diagnostics"],
    });
    expect(githubRequest.body).toContain("12345678");
    expect(githubRequest.body).not.toContain("student@example.com");
    expect(githubRequest.labels).toEqual(["generic", "bug", "search"]);
  });

  it("derives triage labels from validated report fields, not client labels", async () => {
    const requests = mockGithub();
    await postIssue(
      {
        title: "valid title",
        body: "valid description",
        labels: ["generic", "bug", "praise", "timetable", "other"],
        reportType: "missing-data",
        reportArea: "search",
      },
      githubEnv,
    );
    const githubRequest = JSON.parse(String(requests[1]?.init?.body));

    expect(githubRequest.labels).toEqual(["generic", "search"]);
  });

  it("emits only labels provisioned in the GitHub repository", async () => {
    const requests = mockGithub();
    await postIssue(
      {
        title: "valid title",
        body: "valid description",
        labels: ["generic"],
        reportType: "missing-data",
        reportArea: "sync-login",
      },
      githubEnv,
    );
    const githubRequest = JSON.parse(String(requests[1]?.init?.body));

    expect(githubRequest.labels).toEqual(["generic"]);
  });

  it("accepts an old client payload and reports no optional fields applied", async () => {
    mockGithub();
    const response = await postIssue(
      { title: "valid title", body: "valid description", labels: [] },
      githubEnv,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ applied: [] });
  });

  it("projects known issues at the API response boundary", async () => {
    const requests = mockGithub([
      {
        ...githubIssue,
        body: "private report body",
        user: { login: "reporter", email: "student@example.com" },
        comments: 4,
      },
    ]);
    const response = await issue.request(
      "/?tag=display",
      { method: "GET" },
      githubEnv,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(requests).toHaveLength(2);
    expect(payload).toEqual([
      {
        id: 42,
        number: 123,
        title: "[UI Submitted]: Search issue",
        html_url: "https://github.com/nthumodifications/courseweb/issues/123",
        state: "open",
      },
    ]);
  });

  it("requires Turnstile only when the feature flag is enabled", async () => {
    process.env.ISSUE_REQUIRE_TURNSTILE = "true";
    const response = await postIssue(
      { title: "valid title", body: "valid description", labels: [] },
      { ISSUE_REQUIRE_TURNSTILE: "true" },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ code: "TURNSTILE_REQUIRED" });
  });

  it("rejects an invalid required Turnstile token", async () => {
    process.env.ISSUE_REQUIRE_TURNSTILE = "true";
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    globalThis.fetch = mock(async () =>
      Response.json({ success: false }),
    ) as unknown as typeof fetch;

    const response = await postIssue(
      {
        title: "valid title",
        body: "valid description",
        labels: [],
        turnstileToken: "invalid-token",
      },
      { ISSUE_REQUIRE_TURNSTILE: "true" },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: "TURNSTILE_VERIFICATION_FAILED",
    });
  });

  it("silently drops labels outside the web label allowlist", () => {
    expect(filterIssueLabels(["generic", "admin", "security"])).toEqual([
      "generic",
    ]);
  });

  it("maps report type and area to fixed triage labels", () => {
    expect(mapTriageLabels("bug", "search")).toEqual(["bug", "search"]);
    expect(mapTriageLabels("missing-data", "sync-login")).toEqual([]);
    expect(mapTriageLabels()).toEqual([]);
  });

  it("redacts emails but preserves non-contact numeric report data", () => {
    const publicText = redactPublicText(
      "Contact student@example.com; error code 12345678.",
    );
    expect(publicText).not.toContain("student@example.com");
    expect(publicText).toContain("12345678");
  });

  it("uses only the diagnostics allowlist and drops unknown fields", () => {
    const diagnostics = parseIssueDiagnostics({
      appVersion: "0.1.0",
      buildCommit: "abc123",
      route: "/[lang]/timetable",
      language: "en",
      theme: "light",
      browser: "Chrome 130",
      os: "Windows",
      viewport: "standard",
      online: true,
      serviceWorker: "active",
      signedIn: true,
      error: "Failed to sync course MATH 101 with token eyJsecret",
      selectedSemester: "1132",
      timetableCourseCount: 3,
    });

    expect(diagnostics).toEqual({
      appVersion: "0.1.0",
      buildCommit: "abc123",
      route: "/[lang]/timetable",
      language: "en",
      theme: "light",
      browser: "Chrome 130",
      os: "Windows",
      viewport: "standard",
      online: true,
      serviceWorker: "active",
      signedIn: true,
    });
  });

  it("does not publish free-form client errors", () => {
    const diagnostics = formatDiagnosticsBlock({
      appVersion: "0.1.0",
      buildCommit: "abc123",
      route: "/[lang]/timetable",
      language: "en",
      theme: "light",
      browser: "Chrome 130",
      os: "Windows",
      viewport: "standard",
      online: true,
      serviceWorker: "active",
      signedIn: true,
      recentClientErrors: [
        {
          component: "sync",
          message: "Failed to sync course MATH 101 with token eyJsecret",
        },
      ],
    } as never);

    expect(diagnostics).toContain("Signed in: yes");
    expect(diagnostics).not.toContain("MATH 101");
    expect(diagnostics).not.toContain("eyJsecret");
  });

  it("keeps signed-in status but excludes account and timetable state", () => {
    const diagnostics = formatDiagnosticsBlock({
      appVersion: "0.1.0",
      buildCommit: "abc123",
      route: "/[lang]/timetable",
      language: "en",
      theme: "light",
      browser: "Chrome 130",
      os: "Windows",
      viewport: "standard",
      online: true,
      serviceWorker: "active",
      signedIn: true,
      selectedSemester: "1132",
      timetableCourseCount: 3,
    } as never);

    expect(diagnostics).toContain("Signed in: yes");
    expect(diagnostics).not.toContain("1132");
    expect(diagnostics).not.toContain("course count");
  });
});
