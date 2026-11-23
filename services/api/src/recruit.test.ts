import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createAuthTestEnvironment } from "./test-auth";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

const insert = mock((row: Record<string, unknown>) => ({
  select: () => ({
    single: async () => ({
      data: {
        id: "application-1",
        role: row.role,
        status: "submitted",
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      },
      error: null,
    }),
  }),
}));

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      insert,
    }),
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob(["%PDF-"]), error: null }),
      }),
    },
  })),
);

const { default: recruit } = await import("./recruit");

const authEnvironment = createAuthTestEnvironment(
  () =>
    mock(async () =>
      Response.json({ active: true, username: "user-1", scope: "openid" }),
    ) as unknown as typeof fetch,
);

beforeEach(() => {
  authEnvironment.setup();
  insert.mockClear();
});
afterEach(authEnvironment.restore);

const env = {
  VENUE_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

const apply = (links: Record<string, string>) =>
  recruit.request(
    "/apply",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "frontend",
        statement: "I would like to help maintain the timetable pages.",
        contactPreference: "email",
        links,
      }),
    },
    env,
  );

describe("recruitment application links", () => {
  it.each([
    ["github", "javascript:alert(document.domain)"],
    ["portfolio", "javascript:alert(document.domain)"],
    ["github", "data:text/html,<script>alert(1)</script>"],
    ["portfolio", "vbscript:msgbox(1)"],
  ])(
    "rejects a %s link that is not http(s) (%s) and stores nothing",
    async (field, url) => {
      const response = await apply({ [field]: url });

      expect(response.status).toBe(400);
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it("stores http(s) links unchanged", async () => {
    const links = {
      github: "https://github.com/example",
      portfolio: "http://example.com/portfolio?page=1",
    };

    const response = await apply(links);

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      applicant_sub: "user-1",
      links,
    });
  });
});
