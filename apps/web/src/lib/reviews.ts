import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

export type Attendance = "none" | "sometimes" | "every_class";
export type ExamStyle = "written" | "oral" | "project" | "report" | "none";

export type Review = {
  id: string;
  moduleKey: string;
  instructor: string;
  semester: string;
  workload: 1 | 2 | 3 | 4 | 5;
  grading: 1 | 2 | 3 | 4 | 5;
  learning: 1 | 2 | 3 | 4 | 5;
  attendance: Attendance;
  examStyle: readonly ExamStyle[];
  body: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  mine: boolean;
};

export type ReviewWithStatus = Review & {
  status: "visible" | "hidden" | "removed";
};

export type ReviewSummary = {
  count: number;
  workload: number | null;
  grading: number | null;
  learning: number | null;
};

export const reviewSummaryHasAverages = (summary: ReviewSummary) =>
  summary.workload !== null &&
  summary.grading !== null &&
  summary.learning !== null;

export type ReviewInput = {
  moduleKey: string;
  instructor: string;
  semester: string;
  workload: Review["workload"];
  grading: Review["grading"];
  learning: Review["learning"];
  attendance: Attendance;
  examStyle: ExamStyle[];
  body: string;
};

export type ReviewUpdate = Partial<
  Omit<ReviewInput, "moduleKey" | "instructor">
>;

export type ReportReason =
  | "personal_attack"
  | "exam_leak"
  | "spam"
  | "off_topic"
  | "other";

export class ReviewApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.name = "ReviewApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const reviewsBaseUrl = () =>
  `${import.meta.env.VITE_NTHUMODS_AUTH_URL || "https://auth.nthumods.com"}/api/reviews`;

const request = async <T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${reviewsBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let body: { error?: string; id?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // Keep the HTTP status when an intermediary returns non-JSON.
    }
    throw new ReviewApiError(
      response.status,
      body.error ?? "request_failed",
      body,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const reviewKeys = {
  all: ["reviews"] as const,
  list: (
    target: { moduleKey?: string; instructor?: string },
    identity = "anon",
  ) => ["reviews", "list", identity, target] as const,
  mine: ["reviews", "mine"] as const,
};

export const listReviews = async (
  target: { moduleKey?: string; instructor?: string },
  token?: string | null,
) => {
  const params = new URLSearchParams();
  if (target.moduleKey) params.set("moduleKey", target.moduleKey);
  if (target.instructor) params.set("instructor", target.instructor);
  const query = params.toString();
  return request<{ reviews: Review[]; summary: ReviewSummary }>(
    query ? `?${query}` : "",
    undefined,
    token,
  );
};

export const listMine = (token: string) =>
  request<{ reviews: ReviewWithStatus[] }>("/mine", undefined, token);

export const createReview = (values: ReviewInput, token: string) =>
  request<{ review: Review }>(
    "",
    { method: "POST", body: JSON.stringify(values) },
    token,
  );

export const updateReview = (id: string, values: ReviewUpdate, token: string) =>
  request<{ review: Review }>(
    `/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(values) },
    token,
  );

export const deleteReview = (id: string, token: string) =>
  request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const reportReview = (
  id: string,
  values: { reason: ReportReason; note?: string },
  token: string,
) =>
  request<{ ok: true }>(
    `/${encodeURIComponent(id)}/report`,
    { method: "POST", body: JSON.stringify(values) },
    token,
  );

const useReviewToken = () => {
  const auth = useAuth();
  return auth.isAuthenticated && !auth.user?.expired
    ? (auth.user?.access_token ?? null)
    : null;
};

export const useReviews = (target: {
  moduleKey?: string;
  instructor?: string;
}) => {
  const auth = useAuth();
  const token =
    auth.isAuthenticated && !auth.user?.expired
      ? (auth.user?.access_token ?? null)
      : null;
  const identity =
    auth.isAuthenticated && !auth.user?.expired
      ? (auth.user?.profile.sub ?? "anon")
      : "anon";
  return useQuery({
    queryKey: reviewKeys.list(target, identity),
    queryFn: () => listReviews(target, token),
    enabled: Boolean(target.moduleKey || target.instructor),
  });
};

export const useMyReviews = () => {
  const token = useReviewToken();
  return useQuery({
    queryKey: reviewKeys.mine,
    queryFn: () => listMine(token!),
    enabled: Boolean(token),
  });
};

const useInvalidateReviews = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: reviewKeys.all });
};

export const useCreateReview = () => {
  const token = useReviewToken();
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: (values: ReviewInput) => {
      if (!token) throw new ReviewApiError(401, "unauthorized");
      return createReview(values, token);
    },
    onSuccess: invalidate,
  });
};

export const useUpdateReview = () => {
  const token = useReviewToken();
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ReviewUpdate }) => {
      if (!token) throw new ReviewApiError(401, "unauthorized");
      return updateReview(id, values, token);
    },
    onSuccess: invalidate,
  });
};

export const useDeleteReview = () => {
  const token = useReviewToken();
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new ReviewApiError(401, "unauthorized");
      return deleteReview(id, token);
    },
    onSuccess: invalidate,
  });
};

export const useReportReview = () => {
  const token = useReviewToken();
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { reason: ReportReason; note?: string };
    }) => {
      if (!token) throw new ReviewApiError(401, "unauthorized");
      return reportReview(id, values, token);
    },
    onSuccess: invalidate,
  });
};
