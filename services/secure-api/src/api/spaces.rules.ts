export type BookingRules = {
  whoCanBook: "ANYONE_SIGNED_IN" | "NTHU_ONLY" | "MEMBERS" | "ALLOW_LIST";
  slotLengthMinutes: number;
  minNoticeHours: number;
  maxLengthMinutes: number;
  maxActiveBookingsPerUser: number;
  requireBorrowingUnit: boolean;
  requirePurpose: boolean;
  requireHeadcount: boolean;
  openingHours: Array<{ weekday: number; opensAt: string; closesAt: string }>;
  blackouts: Array<{ startDate: string; endDate: string }>;
};

export type BookingCandidate = {
  startAt: Date;
  endAt: Date;
  borrowingUnit?: string | null;
  purpose?: string | null;
  headcount?: number | null;
};

export type BookingEligibility = {
  isNthuStudent: boolean;
  isOrganisationMember: boolean;
  isAllowListed: boolean;
  activeBookingCount: number;
};

export type BookingRuleError =
  | "invalid_range"
  | "too_soon"
  | "too_long"
  | "slot_alignment"
  | "outside_opening_hours"
  | "blackout"
  | "active_booking_limit"
  | "nthu_only"
  | "members_only"
  | "allow_list_only"
  | "borrowing_unit_required"
  | "purpose_required"
  | "headcount_required"
  | "invalid_headcount";

const TAIPEI_TIME = "Asia/Taipei";

const partsInTaipei = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI_TIME,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday") ?? "",
  );
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday,
    minuteOfDay: Number(get("hour")) * 60 + Number(get("minute")),
    second: Number(get("second")),
  };
};

const minutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
};

export const validateBookingRules = (
  rules: BookingRules,
  candidate: BookingCandidate,
  eligibility: BookingEligibility,
  now = new Date(),
): BookingRuleError[] => {
  const errors: BookingRuleError[] = [];
  const { startAt, endAt } = candidate;
  const durationMs = endAt.getTime() - startAt.getTime();
  if (
    !Number.isFinite(startAt.getTime()) ||
    !Number.isFinite(endAt.getTime()) ||
    durationMs <= 0
  ) {
    return ["invalid_range"];
  }

  if (startAt.getTime() < now.getTime() + rules.minNoticeHours * 3_600_000) {
    errors.push("too_soon");
  }
  const durationMinutes = durationMs / 60_000;
  if (durationMinutes > rules.maxLengthMinutes) errors.push("too_long");

  const localStart = partsInTaipei(startAt);
  const localEnd = partsInTaipei(endAt);
  const hours = rules.openingHours.find(
    (entry) => entry.weekday === localStart.weekday,
  );
  const openingMinute = hours ? minutes(hours.opensAt) : Number.NaN;
  const aligned = (value: Date, part: ReturnType<typeof partsInTaipei>) =>
    Number.isFinite(openingMinute) &&
    (part.minuteOfDay - openingMinute) % rules.slotLengthMinutes === 0 &&
    part.second === 0 &&
    value.getUTCMilliseconds() === 0;
  if (
    !Number.isInteger(rules.slotLengthMinutes) ||
    rules.slotLengthMinutes < 1 ||
    durationMinutes % rules.slotLengthMinutes !== 0 ||
    !aligned(startAt, localStart) ||
    !aligned(endAt, localEnd)
  ) {
    errors.push("slot_alignment");
  }

  if (
    localStart.date !== localEnd.date ||
    !hours ||
    localStart.minuteOfDay < minutes(hours.opensAt) ||
    localEnd.minuteOfDay > minutes(hours.closesAt)
  ) {
    errors.push("outside_opening_hours");
  }

  if (
    rules.blackouts.some(
      (range) =>
        localStart.date <= range.endDate && localEnd.date >= range.startDate,
    )
  ) {
    errors.push("blackout");
  }
  if (eligibility.activeBookingCount >= rules.maxActiveBookingsPerUser) {
    errors.push("active_booking_limit");
  }

  if (rules.whoCanBook === "NTHU_ONLY" && !eligibility.isNthuStudent) {
    errors.push("nthu_only");
  }
  if (rules.whoCanBook === "MEMBERS" && !eligibility.isOrganisationMember) {
    errors.push("members_only");
  }
  if (rules.whoCanBook === "ALLOW_LIST" && !eligibility.isAllowListed) {
    errors.push("allow_list_only");
  }

  if (rules.requireBorrowingUnit && !candidate.borrowingUnit?.trim()) {
    errors.push("borrowing_unit_required");
  }
  if (rules.requirePurpose && !candidate.purpose?.trim()) {
    errors.push("purpose_required");
  }
  if (rules.requireHeadcount && candidate.headcount == null) {
    errors.push("headcount_required");
  }
  if (
    candidate.headcount != null &&
    (!Number.isInteger(candidate.headcount) || candidate.headcount < 1)
  ) {
    errors.push("invalid_headcount");
  }
  return errors;
};

export const canManageOrganisation = (role: string | undefined) =>
  role === "OWNER" || role === "MANAGER";

export const canReviewBookings = (role: string | undefined) =>
  role === "OWNER" || role === "MANAGER" || role === "APPROVER";

export const isPostgresExclusionViolation = (error: unknown): boolean => {
  const visit = (value: unknown, depth: number): boolean => {
    if (depth > 5 || value == null) return false;
    if (typeof value === "string") return value.includes("23P01");
    if (typeof value !== "object") return false;
    for (const [key, child] of Object.entries(value)) {
      if (key === "code" && child === "23P01") return true;
      if (visit(child, depth + 1)) return true;
    }
    return false;
  };
  return visit(error, 0);
};
