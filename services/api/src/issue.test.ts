import { afterEach, describe, expect, it, mock } from "bun:test";
import { createJwtMock } from "./test-helpers/module-mocks";

mock.module("@tsndr/cloudflare-worker-jwt", () => createJwtMock());

const {
  filterIssueLabels,
  formatDiagnosticsBlock,
  MAX_ISSUE_REQUEST_BODY_BYTES,
  mapTriageLabels,
  parseIssueDiagnostics,
  redactPublicText,
  sanitizeDiagnosticText,
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
  viewportSize: "390x844",
  online: true,
  serviceWorker: "active",
  serviceWorkerWaiting: false,
  signedIn: false,
  enabledLocalFeatureFlags: [],
  clientErrorCount: 0,
  clientErrorNames: [],
} as const;

const signedInDiagnostics = (overrides: Record<string, unknown> = {}) => ({
  ...issueDiagnostics,
  signedIn: true,
  ...overrides,
});

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

const issuePayload = (overrides: Record<string, unknown> = {}) => ({
  title: "valid title",
  body: "valid description",
  labels: [],
  ...overrides,
});

const submitGithubIssue = async (payload: Record<string, unknown>) => {
  const requests = mockGithub();
  const response = await postIssue(payload, githubEnv);
  const responsePayload = await response.json();
  const githubRequest = JSON.parse(String(requests[1]?.init?.body));
  return { response, responsePayload, githubRequest };
};

const parseTwoColumnCases = (table: string): Array<readonly [string, string]> =>
  table
    .trim()
    .split("\n")
    .map((row) => {
      const separator = row.indexOf("|");
      return [row.slice(0, separator), row.slice(separator + 1)] as const;
    });

type TriageCase = readonly [
  Parameters<typeof mapTriageLabels>[0],
  Parameters<typeof mapTriageLabels>[1],
  Parameters<typeof mapTriageLabels>[2],
  readonly string[],
];

const parseTriageCases = (table: string): TriageCase[] =>
  table
    .trim()
    .split("\n")
    .map((row) => {
      const [reportType, reportArea, route, expected] = row.split("|");
      return [
        reportType || undefined,
        reportArea || undefined,
        route || undefined,
        expected ? expected.split(",") : [],
      ] as TriageCase;
    });

const triageCases = parseTriageCases(`
bug|||bug
missing-data|||bug
suggestion|||enhancement
praise|||commend
|timetable||timetable
|search||search
|sync-login||sync
|bus||apps
|other|/[lang]/calendar|calendar
|other|/[lang]/courses|courses
|other|/[lang]/timetable|timetable
|other|/[lang]/bus|apps
||/[lang]/calendar|calendar
bug|other|/[lang]/timetable|bug,timetable
bug|search|/[lang]/calendar|bug,search
|other|/[lang]/account|
`);

const redactionCases = parseTwoColumnCases(`
student@example.com|[redacted]
109062123|[redacted]
120062123|120062123
119062123|[redacted]
080062123|[redacted]
0912345678|[redacted]
0912-345-678|[redacted]
0912 345 678|[redacted]
甲0912.345.678乙|甲[redacted]乙
甲0912(345)678乙|甲[redacted]乙
甲(0912)345-678乙|甲[redacted]乙
+886 912 345 678|[redacted]
+886-912345678|[redacted]
+886-912-345-678|[redacted]
甲+886.912.345.678乙|甲[redacted]乙
甲+886(912)345.678乙|甲[redacted]乙
甲(+886)912-345-678乙|甲[redacted]乙
學號１０９０６２１２３。|學號[redacted]。
聯絡０９１２３４５６７８！|聯絡[redacted]！
s109062123|[redacted]
S109062123|[redacted]
u109062123|[redacted]
學號109062123|學號[redacted]
id:109062123|id:[redacted]
123456789|123456789
https://example.test/109062123/stack|https://example.test/109062123/stack
?run=109062123|?run=109062123
ERR_509062123|ERR_509062123
1090621234|1090621234
11410CS 135601|11410CS 135601
11410EECS203001|11410EECS203001
11410|11410
https://github.com/nthumodifications/courseweb/issues/951|https://github.com/nthumodifications/courseweb/issues/951
#951|#951
2026-10-12T12:34:56.789Z|2026-10-12T12:34:56.789Z
1728736496789|1728736496789
0123456789abcdef0123456789abcdef01234567|0123456789abcdef0123456789abcdef01234567
1234567|1234567
1920x1080|1920x1080
2026.10.11|2026.10.11
mail a.b+c@x.co, thanks|mail [redacted], thanks
`);

describe("issue creation abuse controls", () => {
  it("rejects oversized issue tag filters before GitHub access", async () => {
    const requests = mockGithub();
    const response = await issue.request(`/?tag=${"x".repeat(201)}`, {}, {});

    expect(response.status).toBe(400);
    expect(requests).toHaveLength(0);
  });

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

  it("rejects an oversized request body before JSON parsing", async () => {
    const response = await postIssue(
      {
        title: "valid title",
        body: "valid description",
        labels: [],
        extra: "x".repeat(MAX_ISSUE_REQUEST_BODY_BYTES),
      },
      {},
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      code: "REQUEST_TOO_LARGE",
    });
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
    const {
      response,
      responsePayload: payload,
      githubRequest,
    } = await submitGithubIssue(
      issuePayload({
        body: "Error code 12345678; contact student@example.com",
        labels: ["generic"],
        reportType: "bug",
        reportArea: "search",
        diagnostics: issueDiagnostics,
      }),
    );

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      applied: ["reportType", "reportArea", "diagnostics"],
    });
    expect(githubRequest.body).toContain("12345678");
    expect(githubRequest.body).not.toContain("student@example.com");
    expect(githubRequest.body).toContain("<details>");
    expect(githubRequest.body).toContain("```text");
    expect(githubRequest.labels).toEqual(["generic", "bug", "search"]);
  });

  it("redacts client-controlled diagnostics before sanitizing their text", async () => {
    const diagnostics = {
      ...issueDiagnostics,
      appVersion: "student@example.com",
      buildCommit: "0912.345.678",
      viewportSize: "s109062123",
    } as const;
    const requests = mockGithub();
    const response = await postIssue(
      issuePayload({
        title: "Report student@example.com 0912.345.678 109062123",
        body: "Contact student@example.com; phone 0912.345.678; id 109062123",
        diagnostics,
      }),
      githubEnv,
    );
    const diagnosticsBlock = formatDiagnosticsBlock({
      ...diagnostics,
      appVersion: "[redacted]",
      buildCommit: "[redacted]",
      viewportSize: "[redacted]",
    });

    expect(response.status).toBe(200);
    expect(requests[1]?.init?.body).toBe(
      JSON.stringify({
        title: "Report [redacted] [redacted] [redacted]",
        body: [
          "Contact [redacted]; phone [redacted]; id [redacted]",
          "",
          diagnosticsBlock,
        ].join("\n"),
        labels: ["courses"],
      }),
    );
    expect(String(requests[1]?.init?.body)).not.toMatch(
      /student@example\.com|0912\.345\.678|109062123/,
    );
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

    expect(githubRequest.labels).toEqual(["generic", "bug", "search"]);
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

    expect(githubRequest.labels).toEqual(["generic", "bug", "sync"]);
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

  for (const [reportType, reportArea, route, expected] of triageCases) {
    it(`maps ${reportType ?? "no type"}/${reportArea ?? "no area"}/${route ?? "no route"}`, () => {
      expect(mapTriageLabels(reportType, reportArea, route)).toEqual(expected);
    });
  }

  for (const [value, expected] of redactionCases) {
    it(`redacts or preserves ${value}`, () => {
      expect(redactPublicText(value)).toBe(expected);
    });
  }

  for (const [value, expected, domain] of [
    ["s109062123@m109.nthu.edu.tw", "[redacted]", "m109.nthu.edu.tw"],
    ["S109062123@oz.nthu.edu.tw", "[redacted]", "oz.nthu.edu.tw"],
    ["109062123@gapp.nthu.edu.tw", "[redacted]", "gapp.nthu.edu.tw"],
    ["u109062123@nthu.edu.tw", "[redacted]", "nthu.edu.tw"],
    ["s１０９０６２１２３@m109.nthu.edu.tw", "[redacted]", "m109.nthu.edu.tw"],
    ["１０９０６２１２３@gapp.nthu.edu.tw", "[redacted]", "gapp.nthu.edu.tw"],
    ["u１０９０６２１２３@nthu.edu.tw", "[redacted]", "nthu.edu.tw"],
  ] as const) {
    it(`redacts the whole NTHU email address: ${value}`, () => {
      const redacted = redactPublicText(value);

      expect(redacted).toBe(expected);
      expect(redacted).not.toContain("@");
      expect(redacted).not.toContain(domain);
    });
  }

  it("redacts a long adversarial input in linear time", () => {
    const value = "x109062123".repeat(1_000);
    const startedAt = performance.now();
    const redacted = redactPublicText(value);

    expect(redacted).toBe(value);
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });

  it("redacts adversarial email inputs in linear time", () => {
    for (const value of ["a.".repeat(5_000), `a@${"a.".repeat(10_000)}`]) {
      const startedAt = performance.now();
      const redacted = redactPublicText(value);

      expect(redacted).toBe(value);
      expect(performance.now() - startedAt).toBeLessThan(100);
    }
  });

  it("redacts title and user text while preserving the full diagnostics block", async () => {
    const diagnostics = {
      ...issueDiagnostics,
      appVersion: "2026.10.11",
      buildCommit: "0123456789abcdef0123456789abcdef01234567",
      route: "/[lang]/calendar",
      viewportSize: "1920x1080",
    } as const;
    const diagnosticsBlock = formatDiagnosticsBlock(diagnostics);
    const { githubRequest } = await submitGithubIssue(
      issuePayload({
        title: "Report 109062123",
        body: "Call 0912-345-678; email student@example.com",
        diagnostics,
      }),
    );

    expect(githubRequest.title).toBe("Report [redacted]");
    expect(githubRequest.body).toBe(
      ["Call [redacted]; email [redacted]", "", diagnosticsBlock].join("\n"),
    );
    expect(githubRequest.labels).toEqual(["calendar"]);
  });

  it("uses only the diagnostics allowlist and drops unknown fields", () => {
    const diagnostics = parseIssueDiagnostics({
      ...signedInDiagnostics(),
      error: "Failed to sync course MATH 101 with token eyJsecret",
      selectedSemester: "1132",
      timetableCourseCount: 3,
    });

    expect(diagnostics).toEqual(signedInDiagnostics());
  });

  it("bounds diagnostics and keeps only fixed error names", () => {
    const diagnostics = parseIssueDiagnostics({
      ...issueDiagnostics,
      appVersion: "v".repeat(160),
      viewportSize: "`@".repeat(80),
      enabledLocalFeatureFlags: ["local-search", "other-safe-flag"],
      clientErrorCount: 7,
      clientErrorNames: ["TypeError", "not-safe"],
      unexpected: "drop me",
    });

    expect(diagnostics?.appVersion).toHaveLength(160);
    expect(diagnostics?.viewportSize).toHaveLength(160);
    expect(diagnostics?.enabledLocalFeatureFlags).toEqual(["local-search"]);
    expect(diagnostics?.clientErrorCount).toBe(7);
    expect(diagnostics?.clientErrorNames).toEqual(["TypeError", "Other"]);
    expect(diagnostics).not.toHaveProperty("unexpected");
    expect(
      parseIssueDiagnostics({
        ...issueDiagnostics,
        appVersion: "v".repeat(161),
      }),
    ).toBeUndefined();
  });

  it("drops an invalid diagnostics snapshot without blocking the report", async () => {
    const {
      response,
      responsePayload: payload,
      githubRequest,
    } = await submitGithubIssue(
      issuePayload({
        diagnostics: { route: "full user URL?student=12345678" },
      }),
    );

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ applied: [] });
    expect(githubRequest.body).not.toContain("Anonymous diagnostics");
  });

  it("collapses diagnostics and neutralizes error injection characters", () => {
    const diagnostics = formatDiagnosticsBlock(
      signedInDiagnostics({
        clientErrorCount: 1,
        clientErrorNames: ["Other"],
      }) as never,
    );

    expect(diagnostics).toContain("<details>");
    expect(diagnostics).toContain("```text");
    expect(diagnostics).toContain('"signedIn": true');
    expect(diagnostics).toContain('"clientErrorNames": [');
  });

  it("keeps signed-in status but excludes account and timetable state", () => {
    const diagnostics = formatDiagnosticsBlock({
      ...signedInDiagnostics(),
      selectedSemester: "1132",
      timetableCourseCount: 3,
    } as never);

    expect(diagnostics).toContain('"signedIn": true');
    expect(diagnostics).not.toContain("1132");
    expect(diagnostics).not.toContain("course count");
  });

  for (const [value, expected] of [
    ["backtick ` and mention @here", "backtick ' and mention [at]here"],
    ["x".repeat(200), "x".repeat(160)],
  ] as const) {
    it(`sanitizes diagnostic text: ${value.slice(0, 20)}`, () => {
      expect(sanitizeDiagnosticText(value)).toBe(expected);
    });
  }
});
