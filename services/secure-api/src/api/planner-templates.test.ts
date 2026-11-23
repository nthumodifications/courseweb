import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { User } from "@prisma/client";
import { requireAdmin } from "../middleware/requireAdmin";

const templateFindMany = mock();
const templateFindUnique = mock();
const templateFindFirst = mock();
const templateGroupBy = mock();
const templateCreate = mock();
const templateUpdateMany = mock();
const templateDeleteMany = mock();
const templateCount = mock();
const reportUpsert = mock();
const reportUpdateMany = mock();
const executeRaw = mock();
const templateUpdate = mock();
const useCreateMany = mock();
const audit = mock(() => Promise.resolve());

const db = {
  plannerTemplate: {
    findMany: templateFindMany,
    findUnique: templateFindUnique,
    findFirst: templateFindFirst,
    groupBy: templateGroupBy,
    create: templateCreate,
    updateMany: templateUpdateMany,
    deleteMany: templateDeleteMany,
    count: templateCount,
    update: templateUpdate,
  },
  plannerTemplateUse: { createMany: useCreateMany },
  plannerTemplateReport: { upsert: reportUpsert, updateMany: reportUpdateMany },
  $executeRaw: executeRaw,
  $transaction: async (callback: (tx: typeof db) => unknown) => callback(db),
};

mock.module("../client", () => ({ default: db }));
mock.module("../../client", () => ({ default: db }));
mock.module("../utils/adminAudit", () => ({ recordAdminAction: audit }));
mock.module("../../utils/adminAudit", () => ({ recordAdminAction: audit }));
const {
  createPlannerTemplatesApp,
  PLANNER_TEMPLATE_DAILY_LIMIT,
  PLANNER_TEMPLATE_USER_LIMIT,
} = await import("./planner-templates");
const { default: adminTemplatesApp } = await import(
  "./admin/planner-templates"
);

const student = { userId: "student-1", role: "USER", banned: false } as User;
const admin = { userId: "admin-1", role: "ADMIN", banned: false } as User;
let requestUser = student;
const auth = async (c: any, next: () => Promise<void>) => {
  c.set("user", requestUser);
  await next();
};
const optionalAuth = async (c: any) =>
  c.req.header("Authorization") ? requestUser : undefined;
const app = createPlannerTemplatesApp({ auth, optionalAuth });

const payload = {
  version: 1,
  folders: [
    {
      key: "root",
      title: "Core",
      parentKey: null,
      min: 10,
      max: 20,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "before",
      order: 0,
      color: null,
    },
  ],
  items: [
    {
      key: "item-1",
      courseId: "CS 135000",
      title: "Intro",
      credits: 3,
      folderKey: "root",
      term: "1-1",
      description: null,
      dependson: [],
    },
  ],
};
const input = {
  title: "Plan",
  description: "Example",
  department: "Department",
  entranceYear: "113",
  requiredCredits: 128,
  payload,
};
const makeTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: "template-1",
  authorId: student.userId,
  title: "Plan",
  description: "Example",
  department: "Department",
  entranceYear: "113",
  requiredCredits: 128,
  payload,
  folderCount: 1,
  courseCount: 1,
  official: false,
  status: "VISIBLE",
  useCount: 0,
  createdAt: new Date("2026-11-20T00:00:00Z"),
  updatedAt: new Date("2026-11-20T00:00:00Z"),
  ...overrides,
});
const req = (router: Hono, path: string, init?: RequestInit) =>
  router.request(path, init);
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const adminRequest = (path: string, init?: RequestInit) => {
  const router = new Hono();
  router.use("*", async (c, next) => {
    c.set("user", admin);
    await next();
  });
  router.use("/", requireAdmin());
  router.route("/", adminTemplatesApp);
  return router.request(path, init);
};

describe("planner templates", () => {
  beforeEach(() => {
    requestUser = student;
    for (const fn of [
      templateFindMany,
      templateFindUnique,
      templateFindFirst,
      templateGroupBy,
      templateCreate,
      templateUpdateMany,
      templateDeleteMany,
      templateCount,
      reportUpsert,
      reportUpdateMany,
      executeRaw,
      templateUpdate,
      useCreateMany,
      audit,
    ])
      fn.mockReset();
    templateFindMany.mockResolvedValue([makeTemplate()]);
    templateFindUnique.mockResolvedValue(makeTemplate());
    templateFindFirst.mockResolvedValue({ id: "template-1" });
    templateGroupBy.mockResolvedValue([
      { department: "Department", entranceYear: "113", _count: { _all: 1 } },
    ]);
    templateCreate.mockImplementation(({ data }: any) =>
      Promise.resolve(makeTemplate(data)),
    );
    templateUpdateMany.mockResolvedValue({ count: 1 });
    templateDeleteMany.mockResolvedValue({ count: 1 });
    templateCount.mockResolvedValue(0);
    reportUpsert.mockResolvedValue({ id: "report-1" });
    reportUpdateMany.mockResolvedValue({ count: 1 });
    executeRaw.mockResolvedValue(0);
    audit.mockResolvedValue(undefined);
    templateUpdate.mockResolvedValue(makeTemplate());
    useCreateMany.mockResolvedValue({ count: 1 });
  });

  test("counts a template use once per signed-in user", async () => {
    const signedIn = { method: "POST", headers: { Authorization: "Bearer t" } };
    expect((await req(app, "/template-1/use", signedIn)).status).toBe(204);
    expect(useCreateMany).toHaveBeenCalledWith({
      data: [{ templateId: "template-1", userId: student.userId }],
      skipDuplicates: true,
    });
    expect(templateUpdate).toHaveBeenCalledTimes(1);

    useCreateMany.mockResolvedValueOnce({ count: 0 });
    expect((await req(app, "/template-1/use", signedIn)).status).toBe(204);
    expect(templateUpdate).toHaveBeenCalledTimes(1);

    expect((await req(app, "/template-1/use", { method: "POST" })).status).toBe(
      204,
    );
    expect(useCreateMany).toHaveBeenCalledTimes(2);

    templateFindFirst.mockResolvedValueOnce(null);
    expect((await req(app, "/missing/use", signedIn)).status).toBe(404);
  });

  test("editing an official template's content clears the badge", async () => {
    await req(app, "/template-1", json("PATCH", { title: "Changed" }));
    expect(templateUpdateMany.mock.calls[0][0].data.official).toBe(false);
    templateUpdateMany.mockClear();
    await req(app, "/template-1", json("PATCH", { description: "Typo fix" }));
    expect(templateUpdateMany.mock.calls[0][0].data.official).toBeUndefined();
  });

  test("validates references, cycles, and payload size before writing", async () => {
    const badReference = structuredClone(input);
    badReference.payload.items[0]!.folderKey = "missing";
    const cycle = structuredClone(input);
    cycle.payload.folders[0]!.parentKey = "root";
    const oversized = structuredClone(input);
    oversized.payload.items[0]!.description = "x".repeat(501);

    expect((await req(app, "/", json("POST", badReference))).status).toBe(400);
    expect((await req(app, "/", json("POST", cycle))).status).toBe(400);
    expect((await req(app, "/", json("POST", oversized))).status).toBe(400);
    expect(templateCreate).not.toHaveBeenCalled();
  });

  test("requires auth, rejects banned users, and applies create caps", async () => {
    const unauthenticated = createPlannerTemplatesApp({
      auth: async (c) => c.json({ error: "unauthorized" }, 401),
    });
    expect((await req(unauthenticated, "/", json("POST", input))).status).toBe(
      401,
    );

    requestUser = { ...student, banned: true } as User;
    expect((await req(app, "/", json("POST", input))).status).toBe(403);
    requestUser = student;
    templateCount.mockResolvedValueOnce(PLANNER_TEMPLATE_USER_LIMIT);
    expect((await req(app, "/", json("POST", input))).status).toBe(409);
    templateCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(PLANNER_TEMPLATE_DAILY_LIMIT);
    expect((await req(app, "/", json("POST", input))).status).toBe(429);
  });

  test("creates sanitized templates with server-computed counts", async () => {
    const response = await req(
      app,
      "/",
      json("POST", { ...input, title: " <b>Plan</b> " }),
    );
    expect(response.status).toBe(201);
    expect(templateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Plan",
          folderCount: 1,
          courseCount: 1,
          authorId: student.userId,
        }),
      }),
    );
  });

  test("limits updates and deletes to the owner", async () => {
    templateUpdateMany.mockResolvedValueOnce({ count: 0 });
    expect(
      (await req(app, "/template-1", json("PATCH", { title: "Changed" })))
        .status,
    ).toBe(404);
    expect((await req(app, "/template-1", { method: "DELETE" })).status).toBe(
      204,
    );
    expect(templateDeleteMany).toHaveBeenCalledWith({
      where: { id: "template-1", authorId: student.userId },
    });
  });

  test("returns hidden templates only to their owner", async () => {
    templateFindUnique.mockResolvedValue(makeTemplate({ status: "HIDDEN" }));
    const hidden = await req(app, "/template-1");
    expect(hidden.status).toBe(404);
    const own = await req(app, "/template-1", {
      headers: { Authorization: "Bearer ok" },
    });
    expect(own.status).toBe(200);
    expect((await own.json()).template.payload.version).toBe(1);
    await req(app, "/?mine=true", { headers: { Authorization: "Bearer ok" } });
    expect(templateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ authorId: student.userId }),
          ]),
        }),
      }),
    );
  });

  test("upserts one report per user and template", async () => {
    const response = await req(
      app,
      "/template-1/report",
      json("POST", { reason: "SPAM", note: "Duplicate" }),
    );
    expect(response.status).toBe(200);
    expect(reportUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          templateId_reporterId: {
            templateId: "template-1",
            reporterId: student.userId,
          },
        },
      }),
    );
  });

  test("admin status and official actions require reasons and are audited", async () => {
    const hidden = await adminRequest(
      "/template-1/status",
      json("POST", { status: "HIDDEN", reason: "Reported issue" }),
    );
    expect(hidden.status).toBe(200);
    const official = await adminRequest(
      "/template-1/official",
      json("POST", { official: true, reason: "Verified plan" }),
    );
    expect(official.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "planner_template.hide",
        targetId: "template-1",
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "planner_template.set_official",
        targetId: "template-1",
      }),
    );
    expect(
      (
        await adminRequest(
          "/template-1/status",
          json("POST", { status: "VISIBLE", reason: " " }),
        )
      ).status,
    ).toBe(400);
  });
});
