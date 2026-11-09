import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { User } from "@prisma/client";
import type { MiddlewareHandler } from "hono";
import { createSpacesApp, type BookingNotifier } from "./spaces";

const orgFindMany = mock();
const orgMemberFindFirst = mock();
const userFindFirst = mock();
const spaceFindFirst = mock();
const spaceCreate = mock();
const bookingFindMany = mock();
const bookingFindFirst = mock();
const bookingFindUnique = mock();
const bookingCount = mock();
const bookingCreate = mock();
const bookingUpdateMany = mock();
const bookingEventCreate = mock();
const spaceDb: any = {
  organisation: { findMany: orgFindMany },
  organisationMember: {
    findFirst: orgMemberFindFirst,
    create: mock(),
    upsert: mock(),
    findMany: mock(),
    count: mock(),
    delete: mock(),
  },
  user: { findFirst: userFindFirst },
  space: {
    findFirst: spaceFindFirst,
    findUnique: mock(),
    create: spaceCreate,
    update: mock(),
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
      orgMemberFindFirst,
      userFindFirst,
      spaceFindFirst,
      spaceCreate,
      bookingFindMany,
      bookingFindFirst,
      bookingFindUnique,
      bookingCount,
      bookingCreate,
      bookingUpdateMany,
      bookingEventCreate,
    ])
      fn.mockReset();
    orgFindMany.mockResolvedValue([]);
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
