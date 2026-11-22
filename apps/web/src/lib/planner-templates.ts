import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

export type PlannerTemplateFolder = {
  key: string;
  title: string;
  parentKey: string | null;
  min: number;
  max: number;
  metric: "credits" | "courses";
  requireChildValidation: boolean;
  titlePlacement: string;
  order: number;
  color: string | null;
};
export type PlannerTemplateItem = {
  key: string;
  courseId: string;
  title: string;
  credits: number;
  folderKey: string | null;
  term: string | null;
  description: string | null;
  dependson: string[];
};
export type PlannerTemplatePayload = {
  version: 1;
  folders: PlannerTemplateFolder[];
  items: PlannerTemplateItem[];
};
export type PlannerTemplateSummary = {
  id: string;
  title: string;
  description: string;
  department: string;
  entranceYear: string;
  requiredCredits: number;
  folderCount: number;
  courseCount: number;
  official: boolean;
  useCount: number;
  updatedAt: string;
  mine: boolean;
  status?: "visible" | "hidden";
};
export type PlannerTemplate = PlannerTemplateSummary & {
  payload: PlannerTemplatePayload;
};
export type PlannerTemplateDepartment = {
  department: string;
  entranceYear: string;
  count: number;
};
export type PlannerTemplateInput = Pick<
  PlannerTemplateSummary,
  "title" | "description" | "department" | "entranceYear" | "requiredCredits"
> & { payload: PlannerTemplatePayload };
export type PlannerTemplateReportReason =
  | "WRONG_INFO"
  | "SPAM"
  | "OFFENSIVE"
  | "OTHER";

export class PlannerTemplateApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = "PlannerTemplateApiError";
    this.status = status;
    this.code = code;
  }
}

const baseUrl = () =>
  `${import.meta.env.VITE_NTHUMODS_AUTH_URL || "https://auth.nthumods.com"}/api/planner-templates`;
const request = async <T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (!response.ok) {
    let code = "request_failed";
    try {
      code = ((await response.json()) as { error?: string }).error ?? code;
    } catch {
      // Keep the status when an intermediary responds with a non-JSON body.
    }
    throw new PlannerTemplateApiError(response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const plannerTemplateKeys = {
  all: ["planner-templates"] as const,
  list: (filters: PlannerTemplateFilters, identity: string) =>
    ["planner-templates", "list", identity, filters] as const,
  departments: ["planner-templates", "departments"] as const,
  detail: (id: string) => ["planner-templates", "detail", id] as const,
};
export type PlannerTemplateFilters = {
  department?: string;
  entranceYear?: string;
  q?: string;
  mine?: boolean;
};

export const listPlannerTemplates = async (
  filters: PlannerTemplateFilters = {},
  token?: string | null,
) => {
  const params = new URLSearchParams();
  if (filters.department) params.set("department", filters.department);
  if (filters.entranceYear) params.set("entranceYear", filters.entranceYear);
  if (filters.q) params.set("q", filters.q);
  if (filters.mine) params.set("mine", "true");
  const query = params.toString();
  return request<{ templates: PlannerTemplateSummary[] }>(
    query ? `?${query}` : "",
    {},
    token,
  );
};
export const getPlannerTemplateDepartments = () =>
  request<{ departments: PlannerTemplateDepartment[] }>("/departments");
export const getPlannerTemplate = (id: string, token?: string | null) =>
  request<{ template: PlannerTemplate }>(
    `/${encodeURIComponent(id)}`,
    {},
    token,
  );
export const createPlannerTemplate = (
  values: PlannerTemplateInput,
  token: string,
) =>
  request<{ template: PlannerTemplateSummary }>(
    "",
    { method: "POST", body: JSON.stringify(values) },
    token,
  );
export const updatePlannerTemplate = (
  id: string,
  values: Partial<PlannerTemplateInput>,
  token: string,
) =>
  request<{ template: PlannerTemplateSummary }>(
    `/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(values) },
    token,
  );
export const deletePlannerTemplate = (id: string, token: string) =>
  request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
export const markPlannerTemplateUsed = (id: string) =>
  request<void>(`/${encodeURIComponent(id)}/use`, { method: "POST" });
export const reportPlannerTemplate = (
  id: string,
  values: { reason: PlannerTemplateReportReason; note?: string },
  token: string,
) =>
  request<{ ok: true }>(
    `/${encodeURIComponent(id)}/report`,
    { method: "POST", body: JSON.stringify(values) },
    token,
  );

const useTemplateToken = () => {
  const auth = useAuth();
  return auth.isAuthenticated && !auth.user?.expired
    ? (auth.user?.access_token ?? null)
    : null;
};
const useInvalidateTemplates = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: plannerTemplateKeys.all });
};
export const usePlannerTemplates = (filters: PlannerTemplateFilters = {}) => {
  const auth = useAuth();
  const token = useTemplateToken();
  const identity =
    filters.mine && token ? (auth.user?.profile.sub ?? "signed-in") : "public";
  return useQuery({
    queryKey: plannerTemplateKeys.list(filters, identity),
    queryFn: () => listPlannerTemplates(filters, token),
    enabled: !filters.mine || Boolean(token),
  });
};
export const usePlannerTemplateDepartments = () =>
  useQuery({
    queryKey: plannerTemplateKeys.departments,
    queryFn: getPlannerTemplateDepartments,
    staleTime: 5 * 60_000,
  });
export const usePlannerTemplate = (id: string) => {
  const token = useTemplateToken();
  return useQuery({
    queryKey: plannerTemplateKeys.detail(id),
    queryFn: async () => (await getPlannerTemplate(id, token)).template,
    enabled: Boolean(id),
  });
};
export const useCreatePlannerTemplate = () => {
  const token = useTemplateToken();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (values: PlannerTemplateInput) => {
      if (!token) throw new PlannerTemplateApiError(401, "unauthorized");
      return createPlannerTemplate(values, token);
    },
    onSuccess: invalidate,
  });
};
export const useUpdatePlannerTemplate = () => {
  const token = useTemplateToken();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Partial<PlannerTemplateInput>;
    }) => {
      if (!token) throw new PlannerTemplateApiError(401, "unauthorized");
      return updatePlannerTemplate(id, values, token);
    },
    onSuccess: invalidate,
  });
};
export const useDeletePlannerTemplate = () => {
  const token = useTemplateToken();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new PlannerTemplateApiError(401, "unauthorized");
      return deletePlannerTemplate(id, token);
    },
    onSuccess: invalidate,
  });
};
export const useReportPlannerTemplate = () => {
  const token = useTemplateToken();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { reason: PlannerTemplateReportReason; note?: string };
    }) => {
      if (!token) throw new PlannerTemplateApiError(401, "unauthorized");
      return reportPlannerTemplate(id, values, token);
    },
  });
};
export const useMarkPlannerTemplateUsed = () =>
  useMutation({ mutationFn: markPlannerTemplateUsed });
