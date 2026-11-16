import { describe, expect, test } from "bun:test";
import {
  canManageOrganisation,
  canReviewBookings,
  isPostgresExclusionViolation,
  validateBookingRules,
  type BookingEligibility,
  type BookingRules,
} from "./spaces.rules";

const rules: BookingRules = {
  whoCanBook: "ANYONE_SIGNED_IN",
  slotLengthMinutes: 30,
  minNoticeHours: 2,
  maxLengthMinutes: 120,
  maxActiveBookingsPerUser: 2,
  requireBorrowingUnit: true,
  requirePurpose: true,
  requireHeadcount: true,
  openingHours: [{ weekday: 1, opensAt: "09:00", closesAt: "17:00" }],
  blackouts: [],
};
const eligible: BookingEligibility = {
  isNthuStudent: true,
  isOrganisationMember: true,
  isAllowListed: true,
  activeBookingCount: 0,
};
const candidate = (start: string, end: string) => ({
  startAt: new Date(start),
  endAt: new Date(end),
  borrowingUnit: "系學會",
  purpose: "社團會議",
  headcount: 5,
});
const now = new Date("2026-11-08T00:00:00.000Z"); // Sunday, 08:00 on Monday in Taipei.

describe("space booking rules", () => {
  test("accepts aligned bookings inside Taipei opening hours", () => {
    expect(
      validateBookingRules(
        rules,
        candidate("2026-11-09T01:00:00.000Z", "2026-11-09T02:00:00.000Z"),
        eligible,
        now,
      ),
    ).toEqual([]);
  });

  test("aligns slots relative to the configured opening time", () => {
    const morningRules = {
      ...rules,
      slotLengthMinutes: 45,
      openingHours: [{ weekday: 1, opensAt: "09:30", closesAt: "17:00" }],
    };
    expect(
      validateBookingRules(
        morningRules,
        candidate("2026-11-09T01:30:00.000Z", "2026-11-09T02:15:00.000Z"),
        eligible,
        now,
      ),
    ).not.toContain("slot_alignment");
    expect(
      validateBookingRules(
        morningRules,
        candidate("2026-11-09T02:00:00.000Z", "2026-11-09T02:45:00.000Z"),
        eligible,
        now,
      ),
    ).toContain("slot_alignment");
  });

  test("rejects invalid and reversed ranges", () => {
    expect(
      validateBookingRules(
        rules,
        candidate("2026-11-09T02:00:00.000Z", "2026-11-09T01:00:00.000Z"),
        eligible,
        now,
      ),
    ).toContain("invalid_range");
  });

  test("enforces notice, maximum length, slot alignment and opening hours", () => {
    const errors = validateBookingRules(
      rules,
      candidate("2026-11-09T00:35:00.000Z", "2026-11-09T03:05:00.000Z"),
      eligible,
      new Date("2026-11-09T00:30:00.000Z"),
    );
    expect(errors).toEqual(
      expect.arrayContaining(["too_soon", "too_long", "slot_alignment"]),
    );
    expect(
      validateBookingRules(
        rules,
        candidate("2026-11-09T09:30:00.000Z", "2026-11-09T10:00:00.000Z"),
        eligible,
        now,
      ),
    ).toContain("outside_opening_hours");
  });

  test("rejects bookings that cross local dates and blackout dates", () => {
    const crossDate = validateBookingRules(
      rules,
      candidate("2026-11-09T15:00:00.000Z", "2026-11-09T16:00:00.000Z"),
      eligible,
      now,
    );
    expect(crossDate).toContain("outside_opening_hours");

    expect(
      validateBookingRules(
        {
          ...rules,
          blackouts: [{ startDate: "2026-11-09", endDate: "2026-11-10" }],
        },
        candidate("2026-11-09T01:00:00.000Z", "2026-11-09T02:00:00.000Z"),
        eligible,
        now,
      ),
    ).toContain("blackout");
  });

  test("applies NTHU, membership, allow-list and active booking caps", () => {
    for (const [whoCanBook, eligibility, error] of [
      ["NTHU_ONLY", { ...eligible, isNthuStudent: false }, "nthu_only"],
      ["MEMBERS", { ...eligible, isOrganisationMember: false }, "members_only"],
      ["ALLOW_LIST", { ...eligible, isAllowListed: false }, "allow_list_only"],
      [
        "ANYONE_SIGNED_IN",
        { ...eligible, activeBookingCount: 2 },
        "active_booking_limit",
      ],
    ] as const) {
      expect(
        validateBookingRules(
          { ...rules, whoCanBook },
          candidate("2026-11-09T01:00:00.000Z", "2026-11-09T02:00:00.000Z"),
          eligibility,
          now,
        ),
      ).toContain(error);
    }
  });

  test("requires configured request fields and positive headcount", () => {
    expect(
      validateBookingRules(
        rules,
        {
          ...candidate("2026-11-09T01:00:00.000Z", "2026-11-09T02:00:00.000Z"),
          borrowingUnit: " ",
          purpose: "",
          headcount: 0,
        },
        eligible,
        now,
      ),
    ).toEqual(
      expect.arrayContaining([
        "borrowing_unit_required",
        "purpose_required",
        "invalid_headcount",
      ]),
    );
  });
});

describe("space permissions and database conflict errors", () => {
  test("only owners and managers can edit, while approvers can review", () => {
    expect(canManageOrganisation("OWNER")).toBe(true);
    expect(canManageOrganisation("MANAGER")).toBe(true);
    expect(canManageOrganisation("APPROVER")).toBe(false);
    expect(canReviewBookings("APPROVER")).toBe(true);
    expect(canReviewBookings(undefined)).toBe(false);
  });

  test("finds PostgreSQL exclusion violations inside Prisma error metadata", () => {
    expect(
      isPostgresExclusionViolation({
        code: "P2004",
        meta: {
          database_error:
            'SQLSTATE 23P01: exclusion constraint "booking_no_overlapping_approved"',
        },
      }),
    ).toBe(true);
    expect(isPostgresExclusionViolation({ code: "P2002" })).toBe(false);
  });
});
