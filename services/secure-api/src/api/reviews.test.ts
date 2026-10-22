import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { User } from "@prisma/client";
import { requireAdmin } from "../middleware/requireAdmin";

const reviewFindMany = mock();
const reviewFindUnique = mock();
const reviewFindFirst = mock();
const reviewCreate = mock();
const reviewUpdate = mock();
const reviewUpdateMany = mock();
const reviewDelete = mock();
const reviewCount = mock();
const reviewAggregate = mock();
const reportFindUnique = mock();
const reportCreate = mock();
const reportCount = mock();
const reportUpdateMany = mock();
const queryRaw = mock();
const executeRaw = mock();
const audit = mock(() => Promise.resolve());

const reviewDb = {
  courseReview: {
    findMany: reviewFindMany,
    findUnique: reviewFindUnique,
    findFirst: reviewFindFirst,
    create: reviewCreate,
    update: reviewUpdate,
    updateMany: reviewUpdateMany,
    delete: reviewDelete,
    count: reviewCount,
    aggregate: reviewAggregate,
  },
  courseReviewReport: {
    findUnique: reportFindUnique,
    create: reportCreate,
    count: reportCount,
    updateMany: reportUpdateMany,
  },
  $queryRaw: queryRaw,
  $executeRaw: executeRaw,
  $transaction: async (callback: (db: typeof reviewDb) => unknown) =>
    callback(reviewDb),
};

const authUser = {
  userId: "student-1",
  role: "USER",
  banned: false,
} as User;
let requestUser = authUser;

mock.module("../client", () => ({ default: reviewDb }));
mock.module("../utils/adminAudit", () => ({ recordAdminAction: audit }));
const { createReviewsApp } = await import("./reviews");
const { default: adminReviewsApp } = await import("./admin/reviews");

const reviewAuth = async (c: any, next: () => Promise<void>) => {
  c.set("user", requestUser);
  await next();
};
const optionalReviewAuth = async (c: any) =>
  c.req.header("Authorization") ? requestUser : undefined;
const reviewsApp = createReviewsApp({
  auth: reviewAuth,
  writeAuth: reviewAuth,
  optionalAuth: optionalReviewAuth,
});

const makeReview = (overrides: Record<string, unknown> = {}) => ({
  id: "review-1",
  userId: "author-1",
  moduleKey: "CS:2104",
  instructor: "王老師",
  semester: "11310",
  coolness: 3,
  sweetness: 4,
  learning: 5,
  attendance: "every_class",
  examStyle: ["written"],
  body: "這是一段足夠長的課程心得，描述課程內容與學習收穫。".repeat(3),
  source: "NATIVE",
  sourceUrl: null,
  sourceAuthor: null,
  sourcePostedAt: null,
  status: "VISIBLE",
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  ...overrides,
});

const request = (path: string, init?: RequestInit) =>
  new Hono().route("/", reviewsApp).request(path, init);

const authRequest = (path: string, init: RequestInit = {}) =>
  request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
      ...init.headers,
    },
  });

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const validInput = {
  moduleKey: "CS:2104",
  instructor: "王老師",
  semester: "11310",
  coolness: 3,
  sweetness: 4,
  learning: 5,
  attendance: "every_class",
  examStyle: ["written"],
  body: "這是一段足夠長的課程心得，描述課程內容與學習收穫。".repeat(3),
};

describe("native course reviews", () => {
  beforeEach(() => {
    requestUser = authUser;
    for (const fn of [
      reviewFindMany,
      reviewFindUnique,
      reviewFindFirst,
      reviewCreate,
      reviewUpdate,
      reviewUpdateMany,
      reviewDelete,
      reviewCount,
      reviewAggregate,
      reportFindUnique,
      reportCreate,
      reportCount,
      reportUpdateMany,
      queryRaw,
      executeRaw,
      audit,
    ])
      fn.mockReset();

    reviewFindMany.mockResolvedValue([makeReview()]);
    reviewCount.mockResolvedValue(1);
    reviewAggregate.mockResolvedValue({
      _avg: { coolness: 3, sweetness: 4, learning: 5 },
      _count: { coolness: 1, sweetness: 1, learning: 1 },
    });
    reportCount.mockResolvedValue(0);
    queryRaw.mockResolvedValue([]);
    reviewCreate.mockResolvedValue(makeReview());
    reviewUpdate.mockResolvedValue(makeReview());
    reviewDelete.mockResolvedValue(makeReview());
    reportCreate.mockResolvedValue({ id: "report-1" });
    reportUpdateMany.mockResolvedValue({ count: 1 });
    audit.mockResolvedValue(undefined);
  });

  test("public output never contains userId and applies the fairness threshold", async () => {
    const response = await request("/?moduleKey=CS:2104");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews[0].userId).toBeUndefined();
    expect(body.reviews[0].mine).toBe(false);
    expect(body.summary).toEqual({
      count: 1,
      coolness: null,
      sweetness: null,
      learning: null,
    });
  });

  test("marks a valid public review as mine only for its author", async () => {
    reviewFindMany.mockResolvedValue([makeReview({ userId: authUser.userId })]);
    const author = await authRequest("/?moduleKey=CS:2104", { method: "GET" });
    expect((await author.json()).reviews[0].mine).toBe(true);

    requestUser = { ...authUser, userId: "another-user" } as User;
    const other = await authRequest("/?moduleKey=CS:2104", { method: "GET" });
    expect((await other.json()).reviews[0].mine).toBe(false);

    const anonymous = await request("/?moduleKey=CS:2104");
    expect((await anonymous.json()).reviews[0].mine).toBe(false);
  });

  test("supports instructor-only public queries", async () => {
    await request("/?instructor=王老師");
    expect(reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "VISIBLE", instructor: "王老師" },
      }),
    );
  });

  test("accepts a ratings-only review but rejects other short bodies", async () => {
    reviewFindFirst.mockResolvedValue(null);
    reviewCount.mockResolvedValue(0);
    reviewCreate.mockResolvedValue(
      makeReview({ userId: authUser.userId, body: "" }),
    );

    const empty = await authRequest("/", json({ ...validInput, body: "   " }));
    expect(empty.status).toBe(201);

    const short = await authRequest(
      "/",
      json({ ...validInput, body: "a".repeat(29) }),
    );
    expect(short.status).toBe(400);
  });

  test("serializes PTT provenance and counts each rating independently", async () => {
    reviewFindMany.mockResolvedValue([
      makeReview({
        id: "ptt-1",
        userId: null,
        source: "PTT",
        sourceUrl: "https://www.ptt.cc/bbs/NTHU_Course/M.1.html",
        sourceAuthor: "ptt-user",
        sourcePostedAt: new Date("2026-10-15T00:00:00.000Z"),
        coolness: null,
        sweetness: 4,
        learning: null,
        attendance: null,
        examStyle: [],
      }),
    ]);
    reviewCount.mockResolvedValue(3);
    reviewAggregate.mockResolvedValue({
      _avg: { coolness: null, sweetness: 4, learning: null },
      _count: { coolness: 2, sweetness: 3, learning: 1 },
    });

    const response = await request("/?moduleKey=CS:2104");
    const body = await response.json();
    expect(body.reviews[0]).toMatchObject({
      source: "ptt",
      sourceUrl: "https://www.ptt.cc/bbs/NTHU_Course/M.1.html",
      sourceAuthor: "ptt-user",
      coolness: null,
      sweetness: 4,
      attendance: null,
      examStyle: [],
      mine: false,
    });
    expect(body.summary).toEqual({
      count: 3,
      coolness: null,
      sweetness: 4,
      learning: null,
    });
  });

  test("does not expose PTT rows to user edit or delete routes", async () => {
    reviewFindFirst.mockResolvedValue(null);
    const patch = await authRequest("/ptt-1", {
      method: "PATCH",
      body: JSON.stringify({ body: validInput.body }),
    });
    const deletion = await authRequest("/ptt-1", { method: "DELETE" });
    expect(patch.status).toBe(404);
    expect(deletion.status).toBe(404);
  });

  test("returns all review statuses from mine", async () => {
    reviewFindMany.mockResolvedValue([
      makeReview({ status: "VISIBLE" }),
      makeReview({ id: "hidden", status: "HIDDEN" }),
      makeReview({ id: "removed", status: "REMOVED" }),
    ]);
    const response = await authRequest("/mine", { method: "GET" });
    expect(response.status).toBe(200);
    expect(
      (await response.json()).reviews.map((review: any) => review.status),
    ).toEqual(["visible", "hidden", "removed"]);
  });

  test("requires at least one public target", async () => {
    const response = await request("/");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing_target" });
  });

  test("rejects invalid input and duplicate reviews", async () => {
    const invalid = await authRequest(
      "/",
      json({ ...validInput, body: "too short" }),
    );
    expect(invalid.status).toBe(400);

    reviewFindFirst.mockResolvedValueOnce(
      makeReview({ userId: authUser.userId }),
    );
    const duplicate = await authRequest("/", json(validInput));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({
      error: "already_reviewed",
      id: "review-1",
    });
  });

  test("creates a review successfully inside a user-locked transaction", async () => {
    reviewFindFirst.mockResolvedValue(null);
    reviewCount.mockResolvedValue(0);
    reviewCreate.mockResolvedValue(makeReview({ userId: authUser.userId }));
    const response = await authRequest("/", json(validInput));

    expect(response.status).toBe(201);
    expect(reviewCreate).toHaveBeenCalled();
    expect(executeRaw).toHaveBeenCalled();
    expect(String(executeRaw.mock.calls[0]?.[0]?.join(""))).toContain(
      "pg_advisory_xact_lock",
    );
  });

  test("rate-limits the sixth review in a rolling day", async () => {
    reviewCount.mockResolvedValue(5);
    const response = await authRequest("/", json(validInput));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  test("patches and deletes an owned review", async () => {
    reviewFindFirst.mockResolvedValue(makeReview({ userId: authUser.userId }));
    queryRaw.mockResolvedValue([makeReview({ userId: authUser.userId })]);
    reviewUpdate.mockResolvedValue(makeReview({ userId: authUser.userId }));
    const patch = await authRequest("/review-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: validInput.body }),
    });
    expect(patch.status).toBe(200);

    const deletion = await authRequest("/review-1", { method: "DELETE" });
    expect(deletion.status).toBe(204);
  });

  test("rejects immutable patch fields and edits to removed reviews", async () => {
    reviewFindFirst.mockResolvedValue(makeReview({ userId: authUser.userId }));
    const immutable = await authRequest("/review-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleKey: "EE:1001",
        instructor: "另一位老師",
        body: validInput.body,
      }),
    });
    expect(immutable.status).toBe(400);

    reviewFindFirst.mockResolvedValue(
      makeReview({ userId: authUser.userId, status: "REMOVED" }),
    );
    queryRaw.mockResolvedValue([
      makeReview({ userId: authUser.userId, status: "REMOVED" }),
    ]);
    const removed = await authRequest("/review-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: validInput.body }),
    });
    expect(removed.status).toBe(409);
    expect(await removed.json()).toEqual({ error: "removed" });
  });

  test("rejects banned review creation and reports", async () => {
    requestUser = { ...authUser, banned: true } as User;
    const create = await authRequest("/", json(validInput));
    expect(create.status).toBe(403);
    expect(await create.json()).toEqual({ error: "banned" });

    const report = await authRequest(
      "/review-1/report",
      json({ reason: "spam" }),
    );
    expect(report.status).toBe(403);
    expect(await report.json()).toEqual({ error: "banned" });

    const invalidCreate = await authRequest("/", json({}));
    expect(invalidCreate.status).toBe(403);
    expect(await invalidCreate.json()).toEqual({ error: "banned" });

    const invalidReport = await authRequest(
      "/review-1/report",
      json({ reason: "invalid" }),
    );
    expect(invalidReport.status).toBe(403);
    expect(await invalidReport.json()).toEqual({ error: "banned" });
  });

  test("hides ownership through 404s for patch and delete", async () => {
    reviewFindFirst.mockResolvedValue(null);
    const patch = await authRequest("/review-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ body: validInput.body }),
    });
    const deletion = await authRequest("/review-1", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(patch.status).toBe(404);
    expect(deletion.status).toBe(404);
  });

  test("checks banned ownership before patch and allows own deletion", async () => {
    requestUser = { ...authUser, banned: true } as User;
    reviewFindFirst.mockResolvedValue(null);

    const otherPatch = await authRequest("/review-1", {
      method: "PATCH",
      body: JSON.stringify({ body: validInput.body }),
    });
    expect(otherPatch.status).toBe(404);

    reviewFindFirst.mockResolvedValue(makeReview({ userId: authUser.userId }));
    const ownPatch = await authRequest("/review-1", {
      method: "PATCH",
      body: JSON.stringify({ body: validInput.body }),
    });
    expect(ownPatch.status).toBe(403);
    expect(await ownPatch.json()).toEqual({ error: "banned" });

    const ownDelete = await authRequest("/review-1", { method: "DELETE" });
    expect(ownDelete.status).toBe(204);
  });

  test("locks and rechecks a review before patching", async () => {
    reviewFindFirst.mockResolvedValue(
      makeReview({ userId: authUser.userId, status: "VISIBLE" }),
    );
    queryRaw.mockResolvedValue([
      makeReview({ userId: authUser.userId, status: "REMOVED" }),
    ]);

    const response = await authRequest("/review-1", {
      method: "PATCH",
      body: JSON.stringify({ body: validInput.body }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "removed" });
    expect(String(queryRaw.mock.calls[0]?.[0]?.join(""))).toContain(
      "FOR UPDATE",
    );
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  test("rejects own reports and makes duplicate reports idempotent", async () => {
    queryRaw.mockResolvedValueOnce([makeReview({ userId: authUser.userId })]);
    const own = await authRequest("/review-1/report", json({ reason: "spam" }));
    expect(own.status).toBe(400);
    expect(await own.json()).toEqual({ error: "own_review" });

    queryRaw.mockResolvedValueOnce([makeReview({ userId: "author-2" })]);
    reportFindUnique.mockResolvedValue({ id: "existing-report" });
    const duplicate = await authRequest(
      "/review-1/report",
      json({ reason: "spam" }),
    );
    expect(duplicate.status).toBe(202);
    expect(await duplicate.json()).toEqual({ ok: true });
    expect(reportCreate).not.toHaveBeenCalled();
  });

  test("auto-hides after three distinct open reports transactionally", async () => {
    queryRaw.mockResolvedValueOnce([makeReview({ userId: "author-2" })]);
    reportFindUnique.mockResolvedValue(null);
    reportCount.mockResolvedValue(3);

    const response = await authRequest(
      "/review-1/report",
      json({ reason: "personal_attack", note: "uncivil" }),
    );
    expect(response.status).toBe(202);
    expect(reviewUpdateMany).toHaveBeenCalledWith({
      where: { id: "review-1", status: "VISIBLE" },
      data: { status: "HIDDEN" },
    });
    expect(executeRaw).toHaveBeenCalled();
    expect(String(executeRaw.mock.calls[0]?.[0]?.join(""))).toContain(
      "pg_advisory_xact_lock",
    );
    expect(String(queryRaw.mock.calls[0]?.[0]?.join(""))).toContain(
      "FOR UPDATE",
    );
  });

  test("does not reveal or hide a removed review when reported", async () => {
    queryRaw.mockResolvedValueOnce([
      makeReview({ status: "REMOVED", userId: "author-2" }),
    ]);
    const response = await authRequest(
      "/review-1/report",
      json({ reason: "spam" }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(reportCreate).not.toHaveBeenCalled();
    expect(reviewUpdate).not.toHaveBeenCalled();
    expect(reportUpdateMany).not.toHaveBeenCalled();
  });

  test("admin moderation resolves reports and records an audit", async () => {
    queryRaw.mockResolvedValue([makeReview({ status: "HIDDEN" })]);
    reviewUpdate.mockResolvedValue(makeReview({ status: "VISIBLE" }));

    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", { ...authUser, userId: "admin-1", role: "ADMIN" } as User);
      await next();
    });
    app.route("/", adminReviewsApp);

    const response = await app.request("/review-1/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "restore",
        reason: "Reviewed and acceptable",
      }),
    });

    expect(response.status).toBe(200);
    expect(queryRaw).toHaveBeenCalled();
    expect(String(queryRaw.mock.calls[0]?.[0]?.join(""))).toContain(
      "FOR UPDATE",
    );
    expect(reportUpdateMany).toHaveBeenCalledWith({
      where: { reviewId: "review-1", resolvedAt: null },
      data: { resolvedAt: expect.any(Date), resolvedById: "admin-1" },
    });
    expect(audit).toHaveBeenCalled();
  });

  test.each(["hide", "remove", "restore"])(
    "admin moderation supports %s and audits it",
    async (action) => {
      queryRaw.mockResolvedValue([makeReview({ status: "VISIBLE" })]);
      reviewUpdate.mockResolvedValue(
        makeReview({
          status:
            action === "hide"
              ? "HIDDEN"
              : action === "remove"
                ? "REMOVED"
                : "VISIBLE",
        }),
      );
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("user", {
          ...authUser,
          userId: "admin-1",
          role: "ADMIN",
        } as User);
        await next();
      });
      app.route("/", adminReviewsApp);

      const response = await app.request("/review-1/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: "Reviewed by staff" }),
      });
      expect(response.status).toBe(200);
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { action, reason: "Reviewed by staff" },
        }),
      );
    },
  );

  test("dismisses an open report and audits the dismissal", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", { ...authUser, userId: "admin-1", role: "ADMIN" } as User);
      await next();
    });
    app.route("/", adminReviewsApp);
    const response = await app.request("/reports/report-1/dismiss", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "course_review.report.dismiss" }),
    );
  });

  test("non-admins receive 403 from the admin gate", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", authUser);
      await next();
    });
    app.use("*", requireAdmin("ADMIN"));
    app.route("/", adminReviewsApp);

    const response = await app.request("/");
    expect(response.status).toBe(403);
  });
});
