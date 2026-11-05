import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { User } from "@prisma/client";
import { requireAdmin } from "../middleware/requireAdmin";

const fns = {
  profileFindUnique: mock(),
  profileUpsert: mock(),
  profileDeleteMany: mock(),
  membershipFindUnique: mock(),
  membershipFindFirst: mock(),
  membershipFindMany: mock(),
  membershipUpsert: mock(),
  membershipUpdate: mock(),
  membershipDeleteMany: mock(),
  blockFindMany: mock(),
  blockUpsert: mock(),
  blockDeleteMany: mock(),
  linkFindMany: mock(),
  linkFindFirst: mock(),
  linkCreate: mock(),
  linkDeleteMany: mock(),
  linkUpdate: mock(),
  reportCreate: mock(),
  reportFindMany: mock(),
  reportFindUnique: mock(),
  reportUpdate: mock(),
  userFindUnique: mock(),
  userUpdate: mock(),
  tokenDeleteMany: mock(),
  sessionsDeleteMany: mock(),
  audit: mock(),
};

const db = {
  classPageProfile: {
    findUnique: fns.profileFindUnique,
    upsert: fns.profileUpsert,
    deleteMany: fns.profileDeleteMany,
  },
  classPageMembership: {
    findUnique: fns.membershipFindUnique,
    findFirst: fns.membershipFindFirst,
    findMany: fns.membershipFindMany,
    upsert: fns.membershipUpsert,
    update: fns.membershipUpdate,
    deleteMany: fns.membershipDeleteMany,
  },
  classPageBlock: {
    findMany: fns.blockFindMany,
    upsert: fns.blockUpsert,
    deleteMany: fns.blockDeleteMany,
  },
  classPageLink: {
    findMany: fns.linkFindMany,
    findFirst: fns.linkFindFirst,
    create: fns.linkCreate,
    deleteMany: fns.linkDeleteMany,
    update: fns.linkUpdate,
  },
  classPageReport: {
    create: fns.reportCreate,
    findMany: fns.reportFindMany,
    findUnique: fns.reportFindUnique,
    update: fns.reportUpdate,
  },
  user: { findUnique: fns.userFindUnique, update: fns.userUpdate },
  token: { deleteMany: fns.tokenDeleteMany },
  authSessions: { deleteMany: fns.sessionsDeleteMany },
  $transaction: async (operation: any) =>
    Array.isArray(operation) ? Promise.all(operation) : operation(db),
} as any;

const authUser = { userId: "student-1", role: "USER", banned: false } as User;
const requestAuth = async (c: any, next: () => Promise<void>) => {
  c.set("user", authUser);
  await next();
};
const adminAuth = async (c: any, next: () => Promise<void>) => {
  c.set("user", { ...authUser, role: "ADMIN" });
  await next();
};
const authOnly = async (c: any, _next: () => Promise<void>) =>
  c.json({ error: "unauthorized" }, 401);
const rateLimit = async (_c: any, next: () => Promise<void>) => next();
const courses = { "11510": ["11510-CS101"] };
const getTimetable = async () => courses;
const { createClassPagesApp } = await import("./class-pages");
const { createAdminClassPagesApp } = await import("./admin/class-pages");
const app = createClassPagesApp({
  auth: requestAuth,
  rateLimit,
  db,
  getTimetable,
});
const adminApp = createAdminClassPagesApp({ db, audit: fns.audit as any });
const adminRoot = new Hono().use("*", adminAuth).route("/", adminApp);
const ordinaryUserRoot = new Hono()
  .use("*", requestAuth)
  .use("*", requireAdmin())
  .route("/", adminApp);
const unauthenticatedAdminRoot = new Hono()
  .use("*", authOnly)
  .use("*", requireAdmin())
  .route("/", adminApp);

const request = (path: string, init?: RequestInit) =>
  new Hono().route("/", app).request(path, init);
const adminRequest = (path: string, init?: RequestInit) =>
  adminRoot.request(path, init);
const json = (value: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
const U4 = "44444444-4444-4444-8444-444444444444";
const U5 = "55555555-5555-4555-8555-555555555555";

const profile = {
  id: U5,
  displayName: "Alex",
  department: "CS",
  year: "3",
  contacts: [{ label: "LINE", value: "@alex" }],
  displayNameVisible: true,
  departmentVisible: false,
  yearVisible: true,
  contactsVisible: true,
};
const profileInput = (({ id: _id, ...input }) => input)(profile);
const member = { id: U1, lookingForPartners: false, selfDeclared: true };

beforeEach(() => {
  for (const fn of Object.values(fns)) fn.mockReset();
  fns.profileFindUnique.mockResolvedValue(profile);
  fns.profileUpsert.mockImplementation(async (arg: any) => ({
    id: U5,
    userId: "student-1",
    ...arg.create,
  }));
  fns.profileDeleteMany.mockResolvedValue({ count: 1 });
  fns.membershipFindUnique.mockResolvedValue(member);
  fns.membershipFindFirst.mockResolvedValue({
    id: U1,
    userId: "student-1",
    semester: "11510",
    courseId: "11510-CS101",
  });
  fns.membershipFindMany.mockResolvedValue([]);
  fns.membershipUpsert.mockResolvedValue(member);
  fns.membershipUpdate.mockResolvedValue({
    ...member,
    lookingForPartners: true,
  });
  fns.membershipDeleteMany.mockResolvedValue({ count: 1 });
  fns.blockFindMany.mockResolvedValue([]);
  fns.blockUpsert.mockResolvedValue({ id: U5 });
  fns.blockDeleteMany.mockResolvedValue({ count: 1 });
  fns.linkFindMany.mockResolvedValue([]);
  fns.linkFindFirst.mockResolvedValue({ id: U3 });
  fns.linkCreate.mockResolvedValue({
    id: U3,
    label: "Notes",
    url: "https://example.com",
    createdAt: new Date("2026-11-01T00:00:00Z"),
  });
  fns.linkDeleteMany.mockResolvedValue({ count: 1 });
  fns.linkUpdate.mockResolvedValue({ id: U3 });
  fns.reportCreate.mockResolvedValue({ id: U4 });
  fns.reportFindMany.mockResolvedValue([]);
  fns.reportFindUnique.mockResolvedValue({
    id: U4,
    targetMembership: null,
    targetLink: { id: U3, authorId: "student-2" },
  });
  fns.reportUpdate.mockResolvedValue({ id: U4 });
  fns.userFindUnique.mockResolvedValue({ role: "USER" });
  fns.userUpdate.mockResolvedValue({});
  fns.tokenDeleteMany.mockResolvedValue({ count: 1 });
  fns.sessionsDeleteMany.mockResolvedValue({ count: 1 });
  fns.audit.mockResolvedValue(undefined);
});

describe("class pages", () => {
  test("requires authentication on every student route", async () => {
    const protectedApp = createClassPagesApp({
      auth: authOnly,
      rateLimit,
      db,
      getTimetable,
    });
    const root = new Hono().route("/", protectedApp);
    const cases: Array<[string, RequestInit?]> = [
      ["/profile"],
      ["/profile", json(profile, "PUT")],
      ["/profile", { method: "DELETE" }],
      ["/memberships", json({ semester: "11510", courseId: "11510-CS101" })],
      ["/memberships/join-all", json({ semester: "11510" })],
      ["/membership/11510/11510-CS101"],
      ["/membership/11510/11510-CS101", { method: "DELETE" }],
      ["/class/11510/11510-CS101"],
      [
        "/class/11510/11510-CS101/links",
        json({ label: "Notes", url: "https://example.com" }),
      ],
      [`/memberships/${U1}`, json({ lookingForPartners: true }, "PATCH")],
      [`/memberships/${U1}`, { method: "DELETE" }],
      [`/links/${U1}`, { method: "DELETE" }],
      [
        "/reports",
        json({
          semester: "11510",
          courseId: "11510-CS101",
          targetType: "member",
          targetId: U1,
          reason: "spam",
        }),
      ],
      [
        "/blocks",
        json({ semester: "11510", courseId: "11510-CS101", membershipId: U1 }),
      ],
      [`/blocks/${U1}`, { method: "DELETE" }],
    ];
    for (const [path, init] of cases)
      expect((await root.request(path, init)).status).toBe(401);
  });

  test("stores an opt-in profile and rejects invalid contact URLs and handles", async () => {
    const invalid = await request(
      "/profile",
      json(
        {
          ...profileInput,
          contacts: [{ label: "site", value: "javascript:alert(1)" }],
        },
        "PUT",
      ),
    );
    expect(invalid.status).toBe(400);
    const response = await request("/profile", json(profileInput, "PUT"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.profile).not.toHaveProperty("userId");
    expect(body.profile.displayName).toBe("Alex");
    expect(fns.profileUpsert).toHaveBeenCalledTimes(1);
  });

  test("keeps profiles off until the owner opts in and requires one before joining", async () => {
    fns.profileFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const current = await request("/profile");
    expect(await current.json()).toEqual({ profile: null });
    const join = await request(
      "/memberships",
      json({ semester: "11510", courseId: "11510-CS101" }),
    );
    expect(join.status).toBe(409);
    expect(await join.json()).toEqual({ error: "profile_required" });
  });

  test("leaving deletes authored links, all memberships, and profile in one transaction", async () => {
    const response = await request("/profile", { method: "DELETE" });
    expect(response.status).toBe(200);
    expect(fns.linkDeleteMany).toHaveBeenCalledWith({
      where: { authorId: "student-1" },
    });
    expect(fns.membershipDeleteMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
    });
    expect(fns.profileDeleteMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
    });
  });

  test("only joins a course in the server-stored timetable and marks it self-declared", async () => {
    const invalid = await request(
      "/memberships",
      json({ semester: "11510", courseId: "outside" }),
    );
    expect(invalid.status).toBe(403);
    expect(fns.membershipUpsert).not.toHaveBeenCalled();
    const valid = await request(
      "/memberships",
      json({ semester: "11510", courseId: "11510-CS101" }),
    );
    expect(valid.status).toBe(201);
    expect(fns.membershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ selfDeclared: true }),
      }),
    );
    expect(await valid.text()).not.toContain("student-1");
  });

  test("join-all reads the saved semester and rejects an empty stored list", async () => {
    const noCourses = createClassPagesApp({
      auth: requestAuth,
      rateLimit,
      db,
      getTimetable: async () => ({ "11510": [] }),
    });
    const empty = await new Hono()
      .route("/", noCourses)
      .request("/memberships/join-all", json({ semester: "11510" }));
    expect(empty.status).toBe(400);
    const joined = await request(
      "/memberships/join-all",
      json({ semester: "11510" }),
    );
    expect(joined.status).toBe(200);
    expect(await joined.json()).toEqual({ joined: 1 });
  });

  test("allows only an owner's own eligible membership to change partner seeking or leave", async () => {
    fns.membershipFindFirst.mockResolvedValueOnce(null);
    expect(
      (
        await request(
          `/memberships/${U1}`,
          json({ lookingForPartners: true }, "PATCH"),
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(`/memberships/${U1}`, { method: "DELETE" })).status,
    ).toBe(200);
    expect(fns.membershipDeleteMany).toHaveBeenCalledWith({
      where: { id: U1, userId: "student-1" },
    });
    expect(
      (
        await request(
          "/memberships/not-a-uuid",
          json({ lookingForPartners: true }, "PATCH"),
        )
      ).status,
    ).toBe(400);
  });

  test("membership lookup returns only the caller's own membership and eligibility", async () => {
    const response = await request("/membership/11510/11510-CS101");
    expect(await response.json()).toEqual({
      eligible: true,
      membership: member,
    });
    const outsideApp = createClassPagesApp({
      auth: requestAuth,
      rateLimit,
      db,
      getTimetable: async () => ({}),
    });
    const outside = await new Hono()
      .route("/", outsideApp)
      .request("/membership/11510/11510-CS101");
    expect(await outside.json()).toEqual({ eligible: false, membership: null });
  });

  test("class page is unavailable until the caller has timetable eligibility and membership", async () => {
    const outsideApp = createClassPagesApp({
      auth: requestAuth,
      rateLimit,
      db,
      getTimetable: async () => ({}),
    });
    expect(
      (
        await new Hono()
          .route("/", outsideApp)
          .request("/class/11510/11510-CS101")
      ).status,
    ).toBe(404);
    fns.membershipFindUnique.mockResolvedValueOnce(null);
    expect((await request("/class/11510/11510-CS101")).status).toBe(404);
    expect(fns.membershipFindMany).not.toHaveBeenCalled();
  });

  test("a dropped course removes the caller's own membership and nobody else's", async () => {
    const droppedApp = new Hono().route(
      "/",
      createClassPagesApp({
        auth: requestAuth,
        rateLimit,
        db,
        getTimetable: async () => ({ "11510": [] }),
      }),
    );
    const expected = {
      where: {
        userId: "student-1",
        semester: "11510",
        courseId: "11510-CS101",
      },
    };

    expect((await droppedApp.request("/class/11510/11510-CS101")).status).toBe(
      404,
    );
    expect(fns.membershipDeleteMany).toHaveBeenLastCalledWith(expected);

    fns.membershipDeleteMany.mockClear();
    const lookup = await droppedApp.request("/membership/11510/11510-CS101");
    expect(await lookup.json()).toEqual({ eligible: false, membership: null });
    expect(fns.membershipDeleteMany).toHaveBeenLastCalledWith(expected);

    fns.membershipDeleteMany.mockClear();
    const leave = await request("/membership/11510/11510-CS101", {
      method: "DELETE",
    });
    expect(leave.status).toBe(200);
    expect(fns.membershipDeleteMany).toHaveBeenCalledTimes(1);
    expect(fns.membershipDeleteMany).toHaveBeenLastCalledWith(expected);
  });

  test("link, report, and block writes all require membership in the shared offering", async () => {
    fns.membershipFindUnique.mockResolvedValue(null);
    const link = await request(
      "/class/11510/11510-CS101/links",
      json({ label: "Notes", url: "https://example.com" }),
    );
    const report = await request(
      "/reports",
      json({
        semester: "11510",
        courseId: "11510-CS101",
        targetType: "member",
        targetId: U2,
        reason: "spam",
      }),
    );
    const block = await request(
      "/blocks",
      json({ semester: "11510", courseId: "11510-CS101", membershipId: U2 }),
    );
    expect([link.status, report.status, block.status]).toEqual([404, 404, 404]);
    expect(fns.linkCreate).not.toHaveBeenCalled();
    expect(fns.reportCreate).not.toHaveBeenCalled();
    expect(fns.blockUpsert).not.toHaveBeenCalled();
  });

  test("class responses omit user IDs, hidden fields, and both directions of blocked members", async () => {
    fns.blockFindMany.mockResolvedValue([
      { blockerId: "student-1", blockedId: "student-2" },
      { blockerId: "student-3", blockedId: "student-1" },
    ]);
    fns.membershipFindMany.mockResolvedValue([
      {
        id: U1,
        user: {
          userId: "student-1",
          banned: false,
          classProfile: { ...profile, departmentVisible: false },
        },
        lookingForPartners: false,
        selfDeclared: true,
      },
      {
        id: U2,
        user: { userId: "student-2", banned: false, classProfile: profile },
        lookingForPartners: true,
        selfDeclared: true,
      },
      {
        id: U3,
        user: { userId: "student-3", banned: false, classProfile: profile },
        lookingForPartners: false,
        selfDeclared: true,
      },
      {
        id: U4,
        user: {
          userId: "student-4",
          banned: false,
          classProfile: { ...profile, departmentVisible: false },
        },
        lookingForPartners: true,
        selfDeclared: true,
      },
    ]);
    fns.linkFindMany.mockResolvedValue([
      {
        id: U5,
        label: "Visible",
        url: "https://example.com",
        createdAt: new Date(),
        authorId: "student-4",
        membershipId: U4,
        membership: { id: U4, userId: "student-4" },
      },
      {
        id: U2,
        label: "Blocked",
        url: "https://example.com/blocked",
        createdAt: new Date(),
        authorId: "student-2",
        membershipId: U2,
        membership: { id: U2, userId: "student-2" },
      },
    ]);
    const response = await request("/class/11510/11510-CS101");
    const raw = await response.text();
    const body = JSON.parse(raw);
    expect(body.members.map((row: any) => row.id)).toEqual([U1, U4]);
    expect(body.members[0].department).toBeNull();
    expect(body.links.map((row: any) => row.id)).toEqual([U5]);
    expect(raw).not.toContain("student-1");
    expect(raw).not.toContain("userId");
    expect(raw).not.toContain("authorId");
  });

  test("shared links require class access, an HTTPS URL, and author ownership for removal", async () => {
    const invalid = await request(
      "/class/11510/11510-CS101/links",
      json({ label: "Notes", url: "http://example.com" }),
    );
    expect(invalid.status).toBe(400);
    const valid = await request(
      "/class/11510/11510-CS101/links",
      json({ label: "Notes", url: "https://example.com" }),
    );
    expect(valid.status).toBe(201);
    expect(fns.linkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: "student-1",
          membershipId: U1,
        }),
      }),
    );
    expect((await request(`/links/${U3}`, { method: "DELETE" })).status).toBe(
      200,
    );
    expect(fns.linkDeleteMany).toHaveBeenCalledWith({
      where: { id: U3, authorId: "student-1" },
    });
  });

  test("reports require shared class access, a reason, and a different target member", async () => {
    fns.membershipFindFirst.mockResolvedValueOnce({
      id: U2,
      userId: "student-2",
    });
    const valid = await request(
      "/reports",
      json({
        semester: "11510",
        courseId: "11510-CS101",
        targetType: "member",
        targetId: U2,
        reason: "harassment",
        note: "details",
      }),
    );
    expect(valid.status).toBe(201);
    expect(fns.reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "student-1",
          targetType: "MEMBER",
          membershipId: U2,
          reason: "HARASSMENT",
        }),
      }),
    );
    expect(await valid.text()).not.toContain("student-1");
    fns.membershipFindFirst.mockResolvedValueOnce({
      id: U1,
      userId: "student-1",
    });
    expect(
      (
        await request(
          "/reports",
          json({
            semester: "11510",
            courseId: "11510-CS101",
            targetType: "member",
            targetId: U1,
            reason: "spam",
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/reports",
          json({
            semester: "11510",
            courseId: "11510-CS101",
            targetType: "member",
            targetId: U2,
            reason: "made_up",
          }),
        )
      ).status,
    ).toBe(400);
    fns.linkFindFirst.mockResolvedValueOnce({ id: U3, authorId: "student-2" });
    const linkReport = await request(
      "/reports",
      json({
        semester: "11510",
        courseId: "11510-CS101",
        targetType: "link",
        targetId: U3,
        reason: "spam",
      }),
    );
    expect(linkReport.status).toBe(201);
    expect(fns.reportCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetType: "LINK",
          linkId: U3,
          targetUserId: "student-2",
          targetSemester: "11510",
          targetCourseId: "11510-CS101",
        }),
      }),
    );
  });

  test("blocks a classmate by opaque membership ID and permits removing only your own block", async () => {
    fns.membershipFindFirst.mockResolvedValueOnce({
      id: U2,
      userId: "student-2",
    });
    const blocked = await request(
      "/blocks",
      json({ semester: "11510", courseId: "11510-CS101", membershipId: U2 }),
    );
    expect(blocked.status).toBe(201);
    expect(await blocked.json()).toEqual({ block: { id: U5 } });
    expect(fns.blockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          blockerId_blockedId: {
            blockerId: "student-1",
            blockedId: "student-2",
          },
        },
      }),
    );
    expect((await request(`/blocks/${U5}`, { method: "DELETE" })).status).toBe(
      200,
    );
    expect(fns.blockDeleteMany).toHaveBeenCalledWith({
      where: { id: U5, blockerId: "student-1" },
    });
  });
});

describe("class page report moderation", () => {
  test("admin report routes reject anonymous and non-staff requests", async () => {
    expect((await unauthenticatedAdminRoot.request("/reports")).status).toBe(
      401,
    );
    expect((await ordinaryUserRoot.request("/reports")).status).toBe(403);
    expect(fns.reportFindMany).not.toHaveBeenCalled();
  });

  test("lists report data for staff and rejects invalid filters", async () => {
    fns.reportFindMany.mockResolvedValue([]);
    expect((await adminRequest("/reports?status=reported")).status).toBe(200);
    expect(fns.reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { resolvedAt: null } }),
    );
    expect((await adminRequest("/reports?status=unknown")).status).toBe(400);
  });

  test("resolves, hides a link, or bans through the existing ban fields and writes audit records", async () => {
    fns.reportFindUnique.mockResolvedValue({
      id: U4,
      targetMembership: null,
      targetLink: { id: U3, authorId: "student-2" },
    });
    expect(
      (
        await adminRequest(
          `/reports/${U4}/moderate`,
          json({ action: "hide_link", reason: "spam" }),
        )
      ).status,
    ).toBe(200);
    expect(fns.linkUpdate).toHaveBeenCalledWith({
      where: { id: U3 },
      data: { status: "HIDDEN" },
    });
    expect(fns.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "class_page.report.hide_link",
        targetId: U4,
      }),
    );

    fns.audit.mockClear();
    expect(
      (
        await adminRequest(
          `/reports/${U4}/moderate`,
          json({ action: "ban_user", reason: "repeat abuse" }),
        )
      ).status,
    ).toBe(200);
    expect(fns.userUpdate).toHaveBeenCalledWith({
      where: { userId: "student-2" },
      data: { banned: true, bannedReason: "repeat abuse" },
    });
    expect(fns.tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "student-2" },
    });
    expect(fns.sessionsDeleteMany).toHaveBeenCalledWith({
      where: { userId: "student-2" },
    });
    expect(fns.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.ban", targetId: "student-2" }),
    );

    fns.audit.mockClear();
    expect(
      (
        await adminRequest(
          `/reports/${U4}/moderate`,
          json({ action: "resolve", reason: "reviewed" }),
        )
      ).status,
    ).toBe(200);
    expect(fns.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "class_page.report.resolve" }),
    );
  });

  test("rejects moderation without a valid action and cannot ban the acting admin", async () => {
    expect(
      (
        await adminRequest(
          `/reports/${U4}/moderate`,
          json({ action: "dismiss", reason: "done" }),
        )
      ).status,
    ).toBe(400);
    fns.reportFindUnique.mockResolvedValue({
      id: U4,
      targetMembership: { userId: authUser.userId },
      targetLink: null,
    });
    expect(
      (
        await adminRequest(
          `/reports/${U4}/moderate`,
          json({ action: "ban_user", reason: "reason" }),
        )
      ).status,
    ).toBe(400);
  });

  test("can still moderate a report after its class membership has been deleted", async () => {
    fns.reportFindUnique.mockResolvedValue({
      id: U4,
      targetMembership: null,
      targetLink: null,
      targetUserId: "student-2",
    });
    const response = await adminRequest(
      `/reports/${U4}/moderate`,
      json({ action: "ban_user", reason: "reported abuse" }),
    );
    expect(response.status).toBe(200);
    expect(fns.userUpdate).toHaveBeenCalledWith({
      where: { userId: "student-2" },
      data: { banned: true, bannedReason: "reported abuse" },
    });
  });
});
