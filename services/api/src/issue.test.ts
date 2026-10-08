import { afterEach, describe, expect, it, mock } from "bun:test";
import issue, { filterIssueLabels } from "./issue";

const originalFetch = globalThis.fetch;
const originalTurnstileFlag = process.env.ISSUE_REQUIRE_TURNSTILE;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

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
});
