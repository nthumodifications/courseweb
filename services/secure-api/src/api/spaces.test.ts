import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { User } from "@prisma/client";
import type { MiddlewareHandler } from "hono";
import { createSpacesApp, type BookingNotifier } from "./spaces";

const orgFindMany = mock();
const orgCreate = mock();
const orgMemberFindFirst = mock();
const orgMemberUpsert = mock();
const orgMemberFindMany = mock();
const orgMemberDelete = mock();
const orgMemberCount = mock();
const userFindFirst = mock();
const spaceFindFirst = mock();
const spaceFindUnique = mock();
const spaceCreate = mock();
const spaceUpdate = mock();
const bookingFindMany = mock();
const bookingFindFirst = mock();
const bookingFindUnique = mock();
const bookingCount = mock();
const bookingCreate = mock();
const bookingUpdateMany = mock();
const bookingEventCreate = mock();
const executeRaw = mock();
const spaceDb: any = {
  organisation: { findMany: orgFindMany, create: orgCreate },
  organisationMember: {
    findFirst: orgMemberFindFirst,
    create: mock(),
    upsert: orgMemberUpsert,
    findMany: orgMemberFindMany,
    count: orgMemberCount,
    delete: orgMemberDelete,
  },
  user: { findFirst: userFindFirst },
  space: {
    findFirst: spaceFindFirst,
    findUnique: spaceFindUnique,
    create: spaceCreate,
    update: spaceUpdate,
    updateMany: mock(),
  },
  spaceOpeningHours: { deleteMany: mock() },
  spaceBlackout: { deleteMany: mock() },
  spaceBookingAllowList: { deleteMany: mock() },
  booking: {
    findMany: bookingFindMany,
    findFirst: bookingFindFirst,
    findUnique: bookingFindUnique,
    count: bookingCount,
    create: bookingCreate,
    updateMany: bookingUpdateMany,
  },
  bookingEvent: { create: bookingEventCreate, createMany: mock() },
  $executeRaw: executeRaw,
  $transaction: async (callback: (tx: any) => unknown) => callback(spaceDb),
};

const requester = {
  userId: "student-1",
  name: "Student One",
  nameEn: "Student One",
  email: "student@nthu.edu.tw",
  inschool: true,
  banned: false,
} as User;
let currentUser = requester;

const auth: MiddlewareHandler<any> = async (c, next) => {
  c.set("user", currentUser);
  await next();
};
const noRateLimit: MiddlewareHandler<any> = async (_c, next) => next();
const notifierCalls: Array<Parameters<BookingNotifier["notifyNewRequest"]>[0]> =
  [];
const notifier: BookingNotifier = {
  notifyNewRequest: async (input) => void notifierCalls.push(input),
};
const app = createSpacesApp({
  db: spaceDb,
  auth,
  rateLimit: noRateLimit,
  notifier,
});

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const defaultSpace = (overrides: Record<string, unknown> = {}) => ({
  id: "6e78d4c1-3869-4bf6-8e47-7415806e5e3e",
  organisationId: "organisation-1",
  slug: "meeting-room",
  name: "Meeting room",
  description: "Room for meetings",
  location: "Administration Building 2F",
  venueId: null,
  isPublic: true,
  rules: "Keep the room clean",
  whoCanBook: "ANYONE_SIGNED_IN",
  approvalMode: "APPROVAL",
  slotLengthMinutes: 30,
  minNoticeHours: 0,
  maxLengthMinutes: 120,
  maxActiveBookingsPerUser: 3,
  requireBorrowingUnit: true,
  requirePurpose: true,
  requireHeadcount: true,
  openingHours: [{ weekday: 1, opensAt: "09:00", closesAt: "17:00" }],
  blackouts: [],
  allowList: [],
  organisation: { id: "organisation-1", name: "Club", discordWebhookUrl: null },
  ...overrides,
});

const bookingRequest = () =>
  json({
    spaceId: "6e78d4c1-3869-4bf6-8e47-7415806e5e3e",
    startAt: "2027-01-04T09:00:00+08:00",
    endAt: "2027-01-04T10:00:00+08:00",
    borrowingUnit: "系學會",
    purpose: "Meeting",
    headcount: 5,
  });

describe("space reservation routes", () => {
  beforeEach(() => {
    currentUser = requester;
    notifierCalls.length = 0;
    for (const fn of [
      orgFindMany,
      orgCreate,
      orgMemberFindFirst,
      orgMemberUpsert,
      orgMemberFindMany,
      orgMemberDelete,
      orgMemberCount,
      userFindFirst,
      spaceFindFirst,
      spaceFindUnique,
      spaceCreate,
      spaceUpdate,
      bookingFindMany,
      bookingFindFirst,
      bookingFindUnique,
      bookingCount,
      bookingCreate,
      bookingUpdateMany,
      bookingEventCreate,
      executeRaw,
    ])
      fn.mockReset();
    orgFindMany.mockResolvedValue([]);
    orgMemberUpsert.mockResolvedValue({ id: "member-1" });
    orgMemberDelete.mockResolvedValue({ id: "member-1" });
    orgMemberCount.mockResolvedValue(1);
    orgMemberFindFirst.mockResolvedValue(null);
    bookingCount.mockResolvedValue(0);
    bookingEventCreate.mockResolvedValue({ id: "event-1" });
  });

  test("lists only public verified organisations without authentication", async () => {
    orgFindMany.mockResolvedValue([
      { id: "organisation-1", name: "Club", spaces: [] },
    ]);
    const response = await app.request("/organisations");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      organisations: [{ id: "organisation-1", name: "Club", spaces: [] }],
    });
    expect(orgFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "VERIFIED" }),
      }),
    );
  });

  test("hides member emails and the webhook from approvers on the manage list", async () => {
    const organisation = (role: string) => ({
      role,
      organisation: {
        id: `organisation-${role}`,
        name: "Club",
        slug: `club-${role.toLowerCase()}`,
        discordWebhookUrl: "https://discord.com/api/webhooks/1/secret",
        members: [
          {
            id: "member-1",
            role: "OWNER",
            user: {
              userId: "owner-1",
              name: "Owner",
              nameEn: "Owner",
              email: "owner@example.edu",
            },
          },
        ],
        spaces: [],
      },
    });
    orgMemberFindMany.mockResolvedValue([
      organisation("APPROVER"),
      organisation("MANAGER"),
    ]);
    const response = await app.request("/manage");
    expect(response.status).toBe(200);
    const body = await response.json();
    const [approverView, managerView] = body.organisations;
    expect(approverView.members[0].user).toEqual({
      userId: "owner-1",
      name: "Owner",
      nameEn: "Owner",
    });
    expect(approverView.discordWebhookUrl).toBeNull();
    expect(managerView.members[0].user.email).toBe("owner@example.edu");
  });

  test("maps an organisation slug collision to HTTP 409", async () => {
    orgCreate.mockRejectedValue({ code: "P2002" });
    const response = await app.request(
      "/organisations",
      json({
        name: "Club",
        slug: "club",
        description: "",
        contact: "club@example.edu",
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "slug_taken" });
  });

  test("maps space slug collisions to HTTP 409 on create and patch", async () => {
    orgMemberFindFirst.mockResolvedValue({ role: "OWNER" });
    spaceCreate.mockRejectedValue({ code: "P2002" });
    const createResponse = await app.request(
      "/organisations/organisation-1/spaces",
      json({
        name: "Room",
        slug: "room-1",
        description: "",
        location: "Campus",
        isPublic: true,
        rules: "",
        whoCanBook: "ANYONE_SIGNED_IN",
        approvalMode: "APPROVAL",
        slotLengthMinutes: 30,
        minNoticeHours: 0,
        maxLengthMinutes: 120,
        maxActiveBookingsPerUser: 2,
        requireBorrowingUnit: false,
        requirePurpose: true,
        requireHeadcount: false,
        openingHours: [{ weekday: 1, opensAt: "09:00", closesAt: "17:00" }],
        blackouts: [],
        allowList: [],
      }),
    );
    expect(createResponse.status).toBe(409);
    expect(await createResponse.json()).toEqual({ error: "slug_taken" });

    spaceFindUnique.mockResolvedValue({
      id: "space-1",
      organisationId: "organisation-1",
      slotLengthMinutes: 30,
      maxLengthMinutes: 120,
    });
    spaceUpdate.mockRejectedValue({ code: "P2002" });
    const patchResponse = await app.request("/spaces/space-1", {
      ...json({ slug: "taken-room" }),
      method: "PATCH",
    });
    expect(patchResponse.status).toBe(409);
    expect(await patchResponse.json()).toEqual({ error: "slug_taken" });
  });

  test("limits member role changes to owners and never changes an owner role", async () => {
    userFindFirst.mockResolvedValue({ userId: "invitee-1" });

    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ id: "member-owner", role: "OWNER" });
    const managerAddManager = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "MANAGER" }),
    );
    expect(managerAddManager.status).toBe(403);
    expect(orgMemberUpsert).not.toHaveBeenCalled();

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ role: "MANAGER" });
    const managerChangeManager = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "APPROVER" }),
    );
    expect(managerChangeManager.status).toBe(403);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ role: "OWNER" });
    const managerTouchOwner = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "APPROVER" }),
    );
    expect(managerTouchOwner.status).toBe(403);
    expect(orgMemberUpsert).not.toHaveBeenCalled();

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ role: "OWNER" });
    const ownerChangeOwner = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "APPROVER" }),
    );
    expect(ownerChangeOwner.status).toBe(403);
    expect(orgMemberUpsert).not.toHaveBeenCalled();
  });

  test("owners can add or change managers and managers can manage approvers", async () => {
    userFindFirst.mockResolvedValue({ userId: "invitee-1" });
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce(null);
    const addManager = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "MANAGER" }),
    );
    expect(addManager.status).toBe(201);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ role: "MANAGER" });
    const changeManager = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "APPROVER" }),
    );
    expect(changeManager.status).toBe(201);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ id: "member-manager", role: "MANAGER" });
    const removeManager = await app.request(
      "/organisations/organisation-1/members/manager-1",
      { method: "DELETE" },
    );
    expect(removeManager.status).toBe(200);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ role: "APPROVER" });
    const keepApprover = await app.request(
      "/organisations/organisation-1/members",
      json({ userIdentifier: "invitee-1", role: "APPROVER" }),
    );
    expect(keepApprover.status).toBe(201);
    expect(orgMemberUpsert).toHaveBeenCalledTimes(3);
  });

  test("managers cannot remove owners or managers but may remove approvers and themselves", async () => {
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ id: "member-owner", role: "OWNER" });
    const removeOwner = await app.request(
      "/organisations/organisation-1/members/owner-1",
      { method: "DELETE" },
    );
    expect(removeOwner.status).toBe(403);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ id: "member-manager", role: "MANAGER" });
    const removeManager = await app.request(
      "/organisations/organisation-1/members/manager-2",
      { method: "DELETE" },
    );
    expect(removeManager.status).toBe(403);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ id: "member-approver", role: "APPROVER" });
    const removeApprover = await app.request(
      "/organisations/organisation-1/members/approver-1",
      { method: "DELETE" },
    );
    expect(removeApprover.status).toBe(200);

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "MANAGER" })
      .mockResolvedValueOnce({ id: "member-manager", role: "MANAGER" });
    const removeSelf = await app.request(
      `/organisations/organisation-1/members/${requester.userId}`,
      { method: "DELETE" },
    );
    expect(removeSelf.status).toBe(200);
  });

  test("an owner cannot remove the last owner but may remove another owner", async () => {
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ id: "owner-self", role: "OWNER" })
      .mockResolvedValueOnce({ id: "owner-self", role: "OWNER" });
    orgMemberCount.mockResolvedValueOnce(1);
    const lastOwner = await app.request(
      `/organisations/organisation-1/members/${requester.userId}`,
      { method: "DELETE" },
    );
    expect(lastOwner.status).toBe(409);
    expect(await lastOwner.json()).toEqual({ error: "last_owner" });

    orgMemberFindFirst.mockReset();
    orgMemberFindFirst
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ id: "owner-2", role: "OWNER" })
      .mockResolvedValueOnce({ id: "owner-2", role: "OWNER" });
    orgMemberCount.mockResolvedValueOnce(2);
    const removeOwner = await app.request(
      "/organisations/organisation-1/members/owner-2",
      { method: "DELETE" },
    );
    expect(removeOwner.status).toBe(200);
    expect(executeRaw).toHaveBeenCalled();
  });

  test("creates a valid booking request and notifies the organisation", async () => {
    spaceFindFirst.mockResolvedValue(defaultSpace());
    bookingCreate.mockResolvedValue({ id: "booking-1", status: "REQUESTED" });

    const response = await app.request("/bookings", bookingRequest());

    expect(response.status).toBe(201);
    expect(((await response.json()) as any).booking.status).toBe("REQUESTED");
    expect(bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: requester.userId,
          status: "REQUESTED",
        }),
      }),
    );
    expect(bookingEventCreate).toHaveBeenCalledTimes(1);
    expect(notifierCalls).toHaveLength(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [lockSql, lockedSpaceId, lockedUserId] = executeRaw.mock.calls[0]!;
    expect(String(lockSql.join(" "))).toContain("pg_advisory_xact_lock");
    expect(lockedSpaceId).toBe(defaultSpace().id);
    expect(lockedUserId).toBe(requester.userId);
    expect(bookingCount).toHaveBeenCalledTimes(1);
  });

  test("checks the active booking cap under the advisory transaction lock", async () => {
    spaceFindFirst.mockResolvedValue(
      defaultSpace({ maxActiveBookingsPerUser: 1 }),
    );
    bookingCount.mockResolvedValue(1);

    const response = await app.request("/bookings", bookingRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "booking_rules_failed",
      violations: ["active_booking_limit"],
    });
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(bookingCreate).not.toHaveBeenCalled();
  });

  test("does not approve single or bulk requests that have started, but allows rejection", async () => {
    const past = new Date(Date.now() - 60_000);
    orgMemberFindFirst.mockResolvedValue({ role: "APPROVER" });
    bookingFindUnique.mockResolvedValue({
      id: "booking-1",
      status: "REQUESTED",
      startAt: past,
      space: { organisationId: "organisation-1" },
    });
    const singleApprove = await app.request(
      "/bookings/booking-1/decision",
      json({ action: "APPROVE" }),
    );
    expect(singleApprove.status).toBe(409);
    expect(await singleApprove.json()).toEqual({ error: "already_started" });
    expect(bookingUpdateMany).not.toHaveBeenCalled();

    bookingFindMany.mockResolvedValue([
      {
        id: "6e78d4c1-3869-4bf6-8e47-7415806e5e3e",
        status: "REQUESTED",
        startAt: past,
        space: { organisationId: "organisation-1" },
      },
    ]);
    const bulkApprove = await app.request(
      "/bookings/bulk-decision",
      json({
        bookingIds: ["6e78d4c1-3869-4bf6-8e47-7415806e5e3e"],
        action: "APPROVE",
      }),
    );
    expect(bulkApprove.status).toBe(409);
    expect(await bulkApprove.json()).toEqual({ error: "already_started" });
    expect(bookingUpdateMany).not.toHaveBeenCalled();

    bookingFindUnique.mockResolvedValue({
      id: "booking-1",
      status: "REQUESTED",
      startAt: past,
      space: { organisationId: "organisation-1" },
    });
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    bookingFindUnique
      .mockResolvedValueOnce({
        id: "booking-1",
        status: "REQUESTED",
        startAt: past,
        space: { organisationId: "organisation-1" },
      })
      .mockResolvedValueOnce({ id: "booking-1", status: "REJECTED" });
    const singleReject = await app.request(
      "/bookings/booking-1/decision",
      json({ action: "REJECT", reason: "Review completed" }),
    );
    expect(singleReject.status).toBe(200);

    bookingFindMany.mockResolvedValue([
      {
        id: "6e78d4c1-3869-4bf6-8e47-7415806e5e3e",
        status: "REQUESTED",
        startAt: past,
        space: { organisationId: "organisation-1" },
      },
    ]);
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    const bulkReject = await app.request(
      "/bookings/bulk-decision",
      json({
        bookingIds: ["6e78d4c1-3869-4bf6-8e47-7415806e5e3e"],
        action: "REJECT",
        reason: "Review completed",
      }),
    );
    expect(bulkReject.status).toBe(200);
  });

  test("requester booking views select and serialize without approver identity", async () => {
    bookingFindMany.mockResolvedValue([
      {
        id: "booking-1",
        startAt: new Date("2027-01-04T01:00:00.000Z"),
        endAt: new Date("2027-01-04T02:00:00.000Z"),
        status: "APPROVED",
        decidedBy: "approver-student-id",
        space: {
          id: "space-1",
          slug: "meeting-room",
          name: "Meeting room",
          organisation: {
            name: "Club",
            slug: "club",
            discordWebhookUrl: "https://secret.invalid/webhook",
          },
          allowList: [{ userId: "private-allow-list-id" }],
        },
      },
    ]);
    const mineResponse = await app.request("/mine");
    const mineBody = await mineResponse.json();
    expect(mineResponse.status).toBe(200);
    expect(JSON.stringify(mineBody)).not.toContain("approver-student-id");
    expect(JSON.stringify(mineBody)).not.toContain("discordWebhookUrl");
    expect(JSON.stringify(mineBody)).not.toContain("private-allow-list-id");
    expect(bookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ decidedBy: true }),
      }),
    );

    bookingFindFirst.mockResolvedValue({
      id: "booking-1",
      startAt: new Date("2027-01-04T01:00:00.000Z"),
      endAt: new Date("2027-01-04T02:00:00.000Z"),
      status: "APPROVED",
      purpose: "Meeting",
      decidedBy: "approver-student-id",
      space: { id: "space-1", slug: "meeting-room", name: "Meeting room" },
    });
    const detailResponse = await app.request("/bookings/booking-1");
    const detailBody = await detailResponse.json();
    expect(detailResponse.status).toBe(200);
    expect(JSON.stringify(detailBody)).not.toContain("approver-student-id");
    expect(bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ decidedBy: true }),
      }),
    );
  });

  test("rejects an ineligible student before creating a booking", async () => {
    currentUser = { ...requester, inschool: false } as User;
    spaceFindFirst.mockResolvedValue(defaultSpace({ whoCanBook: "NTHU_ONLY" }));

    const response = await app.request("/bookings", bookingRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "booking_rules_failed",
      violations: ["nthu_only"],
    });
    expect(bookingCreate).not.toHaveBeenCalled();
    expect(notifierCalls).toHaveLength(0);
  });

  test("maps a PostgreSQL approved-booking exclusion violation to HTTP 409", async () => {
    spaceFindFirst.mockResolvedValue(defaultSpace({ approvalMode: "INSTANT" }));
    bookingCreate.mockRejectedValue({
      code: "P2004",
      meta: {
        database_error: "SQLSTATE 23P01 booking_no_overlapping_approved",
      },
    });
    const response = await app.request("/bookings", bookingRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "booking_conflict" });
    expect(notifierCalls).toHaveLength(0);
  });

  test("returns a privacy-safe week view containing only booked times", async () => {
    spaceFindFirst.mockResolvedValue(defaultSpace());
    bookingFindMany.mockResolvedValue([
      {
        startAt: new Date("2026-11-09T01:00:00.000Z"),
        endAt: new Date("2026-11-09T02:00:00.000Z"),
        purpose: "private purpose must not leak",
        user: { name: "Private Name", userId: "private-id" },
      },
    ]);

    const response = await app.request(
      "/organisations/club/spaces/meeting-room/week?start=2026-11-09",
    );
    const payload = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(payload.busy).toEqual([
      {
        startAt: "2026-11-09T01:00:00.000Z",
        endAt: "2026-11-09T02:00:00.000Z",
        status: "booked",
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain("private purpose");
    expect(JSON.stringify(payload)).not.toContain("private-id");
  });

  test("does not let an approver edit a space", async () => {
    orgMemberFindFirst.mockResolvedValue({ role: "APPROVER" });
    const response = await app.request(
      "/organisations/organisation-1/spaces",
      json({
        name: "Room",
        slug: "room-1",
        description: "",
        location: "Campus",
        isPublic: true,
        rules: "",
        whoCanBook: "ANYONE_SIGNED_IN",
        approvalMode: "APPROVAL",
        slotLengthMinutes: 30,
        minNoticeHours: 0,
        maxLengthMinutes: 120,
        maxActiveBookingsPerUser: 2,
        requireBorrowingUnit: false,
        requirePurpose: true,
        requireHeadcount: false,
        openingHours: [{ weekday: 1, opensAt: "09:00", closesAt: "17:00" }],
        blackouts: [],
        allowList: [],
      }),
    );
    expect(response.status).toBe(403);
    expect(spaceCreate).not.toHaveBeenCalled();
  });

  test("cancels only the signed-in user's future active bookings and records an event", async () => {
    bookingFindFirst.mockResolvedValue({
      id: "booking-1",
      userId: requester.userId,
      status: "REQUESTED",
      startAt: new Date(Date.now() + 3_600_000),
    });
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    bookingFindUnique.mockResolvedValue({
      id: "booking-1",
      status: "CANCELLED",
    });

    const response = await app.request("/bookings/booking-1/cancel", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(bookingEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          what: "BOOKING_CANCELLED",
        }),
      }),
    );
  });

  test("does not allow an approver to mark a future booking as a no-show", async () => {
    orgMemberFindFirst.mockResolvedValue({ role: "APPROVER" });
    bookingFindUnique.mockResolvedValue({
      id: "booking-1",
      status: "APPROVED",
      endAt: new Date(Date.now() + 3_600_000),
      space: { organisationId: "organisation-1" },
    });

    const response = await app.request("/bookings/booking-1/no-show", {
      method: "POST",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_finished" });
    expect(bookingUpdateMany).not.toHaveBeenCalled();
  });
});
