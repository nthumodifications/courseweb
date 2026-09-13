import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { User } from "@prisma/client";
import type { AdminEnv } from "./env";

const supabaseFrom = mock();
const supabaseInsert = mock();
const supabaseSelect = mock();
const supabaseSingle = mock();
const recordAdminAction = mock(() => Promise.resolve());

mock.module("../../config/supabase", () => ({
  default: {
    from: supabaseFrom,
  },
}));

mock.module("../../utils/adminAudit", () => ({ recordAdminAction }));

const { default: announcementsApp } = await import("./announcements");

const makeUser = () =>
  ({ userId: "admin-id", role: "ADMIN", banned: false }) as User;

const requestAsAdmin = (body: unknown) => {
  const app = new Hono<AdminEnv>();
  app.use("*", async (c, next) => {
    c.set("user", makeUser());
    await next();
  });
  app.route("/", announcementsApp);
  return app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const validBody = (link_url: string | undefined) => ({
  title: "Scheduled maintenance",
  description: "The service will be briefly unavailable.",
  link_url,
  severity: "info",
  start_date: "2026-09-10T00:00:00+00:00",
  end_date: "2026-09-11T00:00:00+00:00",
  active: true,
  dismissible: true,
  priority: 0,
});

describe("admin announcements API", () => {
  beforeEach(() => {
    supabaseFrom.mockReset();
    supabaseInsert.mockReset();
    supabaseSelect.mockReset();
    supabaseSingle.mockReset();
    recordAdminAction.mockClear();

    supabaseSingle.mockResolvedValue({
      data: { id: 7 },
      error: null,
    });
    supabaseSelect.mockReturnValue({ single: supabaseSingle });
    supabaseInsert.mockReturnValue({ select: supabaseSelect });
    supabaseFrom.mockReturnValue({ insert: supabaseInsert });
  });

  test("rejects javascript links before writing to Supabase", async () => {
    const response = await requestAsAdmin(validBody("javascript:alert(1)"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "link_url must be an in-app path or an http(s) URL",
    });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  test("accepts an in-app path", async () => {
    const response = await requestAsAdmin(validBody("/recruit"));

    expect(response.status).toBe(201);
    expect(supabaseFrom).toHaveBeenCalledWith("alerts");
    expect(supabaseInsert).toHaveBeenCalled();
  });

  test("accepts an https URL", async () => {
    const response = await requestAsAdmin(validBody("https://example.com"));

    expect(response.status).toBe(201);
    expect(supabaseFrom).toHaveBeenCalledWith("alerts");
    expect(supabaseInsert).toHaveBeenCalled();
  });

  test("rejects a start date after the end date before writing to Supabase", async () => {
    const response = await requestAsAdmin({
      ...validBody("/recruit"),
      start_date: "2026-09-12T00:00:00+00:00",
      end_date: "2026-09-11T00:00:00+00:00",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "start_date must fall before end_date",
    });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });
});
