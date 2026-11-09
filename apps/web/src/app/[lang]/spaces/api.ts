import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

const baseUrl = import.meta.env.VITE_NTHUMODS_AUTH_URL as string;

export type SpaceOpeningHour = {
  weekday: number;
  opensAt: string;
  closesAt: string;
};
export type SpaceBlackout = {
  startDate: string;
  endDate: string;
  reason?: string | null;
};
export type Space = {
  id: string;
  organisationId: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  venueId: string | null;
  isPublic: boolean;
  rules: string;
  whoCanBook: "ANYONE_SIGNED_IN" | "NTHU_ONLY" | "MEMBERS" | "ALLOW_LIST";
  approvalMode: "APPROVAL" | "INSTANT";
  slotLengthMinutes: number;
  minNoticeHours: number;
  maxLengthMinutes: number;
  maxActiveBookingsPerUser: number;
  requireBorrowingUnit: boolean;
  requirePurpose: boolean;
  requireHeadcount: boolean;
  openingHours: SpaceOpeningHour[];
  blackouts: SpaceBlackout[];
  allowListUserIds?: string[];
};
export type BusySlot = { startAt: string; endAt: string; status: "booked" };
export type Booking = {
  id: string;
  userId: string;
  startAt: string;
  endAt: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "NO_SHOW";
  borrowingUnit: string | null;
  purpose: string | null;
  headcount: number | null;
  notes: string | null;
  reason: string | null;
  createdAt: string;
  space?: Space & { organisation?: { name: string; slug: string } };
  user?: { userId: string; name: string; nameEn: string };
};
export type Organisation = {
  id: string;
  name: string;
  slug: string;
  description: string;
  contact: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  discordWebhookUrl?: string | null;
  role?: "OWNER" | "MANAGER" | "APPROVER";
  spaces: Space[];
  members?: Array<{
    role: "OWNER" | "MANAGER" | "APPROVER";
    user: { userId: string; name: string; nameEn: string; email: string };
  }>;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export class SpaceApiError extends Error {
  code: string;
  status: number;
  violations: string[];

  constructor(code: string, status: number, violations: string[] = []) {
    super(code);
    this.name = "SpaceApiError";
    this.code = code;
    this.status = status;
    this.violations = violations;
  }
}

const violationLabelKeys: Record<string, string> = {
  invalid_range: "errorInvalidRange",
  too_soon: "errorTooSoon",
  too_long: "errorTooLong",
  slot_alignment: "errorSlot",
  outside_opening_hours: "errorHours",
  blackout: "errorBlackout",
  active_booking_limit: "errorLimit",
  nthu_only: "errorNthu",
  members_only: "errorMembers",
  allow_list_only: "errorAllowList",
  borrowing_unit_required: "errorBorrowingUnit",
  purpose_required: "errorPurpose",
  headcount_required: "errorHeadcount",
  invalid_headcount: "errorHeadcountInvalid",
};

const errorLabelKeys: Record<string, string> = {
  booking_conflict: "errorConflict",
  slug_taken: "slugTaken",
  already_started: "errorAlreadyStarted",
  last_owner: "errorLastOwner",
  user_not_found: "errorUserNotFound",
  allow_list_user_not_found: "errorAllowListUserNotFound",
  reason_required: "errorReasonRequired",
  rate_limited: "errorRateLimited",
};

export const getSpaceErrorMessage = (
  error: unknown,
  labels: Record<string, unknown>,
  fallbackKey = "saveFailed",
  locale = "zh",
) => {
  const apiError = error instanceof SpaceApiError ? error : undefined;
  const code = apiError?.code;
  const label = (key: string) =>
    typeof labels[key] === "string" ? (labels[key] as string) : undefined;
  if (apiError?.status === 429 || code === "rate_limited")
    return label("errorRateLimited") ?? label(fallbackKey) ?? "";
  if (apiError && code === "booking_rules_failed") {
    const messages = apiError.violations
      .map((violation) => label(violationLabelKeys[violation] ?? ""))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0)
      return messages.join(locale === "en" ? ", " : "、");
    return label("bookingFailed") ?? label(fallbackKey) ?? "";
  }
  const key = code ? errorLabelKeys[code] : undefined;
  return (key ? label(key) : undefined) ?? label(fallbackKey) ?? "";
};

const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers = new Headers();
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const response = await fetch(`${baseUrl}/api/spaces${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  if (!response.ok) {
    let code = "request_failed";
    let violations: string[] = [];
    try {
      const body = (await response.json()) as {
        error?: string;
        violations?: string[];
      };
      code = body.error ?? code;
      violations = body.violations ?? [];
    } catch {
      // A proxy response may not be JSON.
    }
    throw new SpaceApiError(code, response.status, violations);
  }
  return (await response.json()) as T;
};

const useAuthToken = () => {
  const { user } = useAuth();
  return user?.access_token ?? null;
};

export const useSpacesIndex = () =>
  useQuery({
    queryKey: ["spaces", "index"],
    queryFn: () => request<{ organisations: Organisation[] }>("/organisations"),
  });

export const useSpaceDetail = (orgSlug?: string, spaceSlug?: string) =>
  useQuery({
    queryKey: ["spaces", "detail", orgSlug, spaceSlug],
    enabled: Boolean(orgSlug && spaceSlug),
    queryFn: () =>
      request<{
        space: Space;
        organisation: Pick<Organisation, "id" | "name" | "slug">;
      }>(
        `/organisations/${encodeURIComponent(orgSlug!)}/spaces/${encodeURIComponent(spaceSlug!)}`,
      ),
  });

export const useSpaceWeek = (
  orgSlug: string,
  spaceSlug: string,
  start: string,
) =>
  useQuery({
    queryKey: ["spaces", "week", orgSlug, spaceSlug, start],
    queryFn: () =>
      request<{ weekStart: string; space: Space; busy: BusySlot[] }>(
        `/organisations/${encodeURIComponent(orgSlug)}/spaces/${encodeURIComponent(spaceSlug)}/week?start=${start}`,
      ),
  });

export const useMyBookings = () => {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["spaces", "mine"],
    enabled: Boolean(token),
    queryFn: () => request<{ bookings: Booking[] }>("/mine", { token }),
  });
};

export const useManageOrganisations = () => {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["spaces", "manage"],
    enabled: Boolean(token),
    queryFn: () =>
      request<{ organisations: Organisation[] }>("/manage", { token }),
  });
};

export const useOrganisationRequests = (
  organisationId: string,
  enabled = true,
) => {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["spaces", "requests", organisationId],
    enabled: Boolean(token && enabled && organisationId),
    queryFn: () =>
      request<{ bookings: Booking[] }>(
        `/organisations/${organisationId}/requests`,
        { token },
      ),
  });
};

export const useManageSpaceWeek = (
  organisationId: string,
  spaceId: string,
  start: string,
) => {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["spaces", "manage-week", organisationId, spaceId, start],
    enabled: Boolean(token && organisationId && spaceId && start),
    queryFn: () =>
      request<{ space: Space; bookings: Booking[] }>(
        `/organisations/${organisationId}/week?spaceId=${spaceId}&start=${start}`,
        { token },
      ),
  });
};

const useSpaceMutation = <TInput, TOutput>(
  path: (input: TInput) => string,
  method = "POST",
) => {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, body }: { input: TInput; body?: unknown }) =>
      request<TOutput>(path(input), { method, body, token }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useCreateOrganisation = () =>
  useSpaceMutation<undefined, { organisation: Organisation }>(
    () => "/organisations",
  );
export const useCreateSpace = () =>
  useSpaceMutation<string, { space: Space }>(
    (id) => `/organisations/${id}/spaces`,
  );
export const useUpdateSpace = () =>
  useSpaceMutation<string, { space: Space }>((id) => `/spaces/${id}`, "PATCH");
export const useArchiveSpace = () =>
  useSpaceMutation<string, { ok: true }>((id) => `/spaces/${id}`, "DELETE");
export const useAddOrganisationMember = () =>
  useSpaceMutation<string, unknown>((id) => `/organisations/${id}/members`);
export const useRemoveOrganisationMember = () =>
  useSpaceMutation<{ organisationId: string; userId: string }, { ok: true }>(
    ({ organisationId, userId }) =>
      `/organisations/${organisationId}/members/${encodeURIComponent(userId)}`,
    "DELETE",
  );
export const useUpdateOrganisation = () =>
  useSpaceMutation<string, { organisation: Organisation }>(
    (id) => `/organisations/${id}`,
    "PATCH",
  );
export const useDecideBooking = () =>
  useSpaceMutation<string, { booking: Booking }>(
    (id) => `/bookings/${id}/decision`,
  );
export const useBulkDecideBookings = () =>
  useSpaceMutation<undefined, { updated: number }>(
    () => "/bookings/bulk-decision",
  );
export const useCreateBooking = () =>
  useSpaceMutation<undefined, { booking: Booking }>(() => "/bookings");
export const useCancelBooking = () =>
  useSpaceMutation<string, { booking: Booking }>(
    (id) => `/bookings/${id}/cancel`,
  );
export const useMarkBookingNoShow = () =>
  useSpaceMutation<string, { ok: true }>((id) => `/bookings/${id}/no-show`);

export const downloadBookingsCsv = async (
  organisationId: string,
  token: string,
) => {
  const response = await fetch(
    `${baseUrl}/api/spaces/organisations/${organisationId}/bookings.csv`,
    {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.blob();
};
