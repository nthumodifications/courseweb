import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";

/**
 * Data access for the admin center.
 *
 * Every call carries the signed-in staff member's own access token — there is
 * no service account and no shared admin key, so the audit trail on the server
 * always names a person.
 */

export type AdminRole = "USER" | "ADMIN" | "SUPERUSER";

export type AdminIdentity = {
  userId: string;
  name: string;
  nameEn: string;
  email: string;
  role: AdminRole;
  isAdmin: boolean;
  isSuperuser: boolean;
};

export type AdminUser = {
  id: string;
  userId: string;
  name: string;
  nameEn: string;
  email: string;
  inschool: boolean;
  role: AdminRole;
  banned: boolean;
  bannedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  accounts: {
    total: number;
    new7d: number;
    new30d: number;
    banned: number;
    admins: number;
    active7d: number;
    active30d: number;
  };
  sessions: {
    active: number;
    accessTokens: number;
    refreshTokens: number;
    apiKeys: number;
    calendarShareTokens: number;
  };
  oauth: { clients: number; consents: number };
  content: {
    courses: number | null;
    comments: number | null;
    delayReports: number | null;
    alerts: number | null;
    contentUsers: number | null;
  };
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  link_url: string | null;
  link_label: string | null;
  link_label_en: string | null;
  severity: string;
  start_date: string;
  end_date: string;
  active: boolean;
  dismissible: boolean;
  priority: number;
  created_at: string;
};

export type AdminAnnouncementInput = Omit<
  AdminAnnouncement,
  "id" | "created_at"
>;

export type AdminClient = {
  id: string;
  clientId: string;
  name: string | null;
  clientUri: string | null;
  firstParty: boolean;
  redirectUris: string[];
  logoutUris: string[];
  scopes: string[];
  confidential: boolean;
  consents: number;
};

export type AdminAuditEntry = {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { userId: string; name: string; nameEn: string } | null;
};

/**
 * The access token for the current staff session.
 *
 * Read at call time rather than captured, so a silent renew mid-session does
 * not leave a mutation holding a token that expired three minutes ago.
 */
export const useAdminToken = () => {
  const auth = useAuth();
  return auth.isAuthenticated ? (auth.user?.access_token ?? null) : null;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Turn a non-2xx admin response into an Error carrying the server's own
 * explanation. The API answers with `error_description` for anything a person
 * can act on ("You cannot ban yourself"), and swallowing that in favour of
 * "Request failed" would make the UI strictly less useful than curl.
 */
const unwrap = async <T>(response: Response): Promise<T> => {
  if (response.ok) return (await response.json()) as T;

  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as {
      error?: string;
      error_description?: string;
    };
    message = body.error_description ?? body.error ?? message;
  } catch {
    // A proxy error page is not JSON; the status line is all we have.
  }
  throw new Error(message);
};

export const adminKeys = {
  me: ["admin", "me"] as const,
  stats: ["admin", "stats"] as const,
  signups: (days: number) => ["admin", "stats", "signups", days] as const,
  clientUsage: ["admin", "stats", "clients"] as const,
  users: (params: unknown) => ["admin", "users", params] as const,
  user: (userId: string) => ["admin", "user", userId] as const,
  announcements: ["admin", "announcements"] as const,
  oauthClients: ["admin", "clients"] as const,
  audit: (params: unknown) => ["admin", "audit", params] as const,
};

/**
 * Who the viewer is, as far as the admin center is concerned.
 *
 * Returns `null` for a signed-out visitor rather than throwing, so the gate can
 * treat "not signed in" and "not staff" as the same dead end.
 */
export const useAdminIdentity = () => {
  const token = useAdminToken();
  const auth = useAuth();

  return useQuery<AdminIdentity | null>({
    queryKey: adminKeys.me,
    // The identity decides whether the rest of the console renders at all;
    // re-checking on focus means a revoked role takes effect on tab switch.
    staleTime: 60_000,
    enabled: !auth.isLoading,
    queryFn: async () => {
      if (!token) return null;
      const response = await authClient.api.admin.me.$get(
        {},
        { headers: authHeaders(token) },
      );
      if (response.status === 401 || response.status === 403) return null;
      return unwrap<AdminIdentity>(response as unknown as Response);
    },
  });
};

const requireToken = (token: string | null) => {
  if (!token) throw new Error("Your session has expired. Sign in again.");
  return token;
};

export const useAdminStats = () => {
  const token = useAdminToken();
  return useQuery<AdminStats>({
    queryKey: adminKeys.stats,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.stats.$get(
        {},
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminStats>(response as unknown as Response);
    },
  });
};

export const useAdminSignups = (days: number) => {
  const token = useAdminToken();
  return useQuery<{ days: number; series: { day: string; count: number }[] }>({
    queryKey: adminKeys.signups(days),
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.stats.signups.$get(
        { query: { days: String(days) } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap(response as unknown as Response);
    },
  });
};

export const useAdminClientUsage = () => {
  const token = useAdminToken();
  return useQuery<
    {
      clientId: string;
      name: string | null;
      firstParty: boolean;
      tokens: number;
    }[]
  >({
    queryKey: adminKeys.clientUsage,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.stats.clients.$get(
        {},
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap(response as unknown as Response);
    },
  });
};

export type AdminUserQuery = {
  q?: string;
  role?: AdminRole;
  banned?: "true" | "false";
  page: number;
  pageSize: number;
};

export const useAdminUsers = (
  params: AdminUserQuery,
  options?: Partial<
    UseQueryOptions<{
      total: number;
      page: number;
      pageSize: number;
      users: AdminUser[];
    }>
  >,
) => {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.users(params),
    enabled: Boolean(token),
    ...options,
    queryFn: async () => {
      const response = await authClient.api.admin.users.$get(
        {
          query: {
            ...(params.q ? { q: params.q } : {}),
            ...(params.role ? { role: params.role } : {}),
            ...(params.banned ? { banned: params.banned } : {}),
            page: String(params.page),
            pageSize: String(params.pageSize),
          },
        },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<{
        total: number;
        page: number;
        pageSize: number;
        users: AdminUser[];
      }>(response as unknown as Response);
    },
  });
};

export type AdminUserDetail = {
  user: AdminUser;
  bootstrapSuperuser: boolean;
  sessions: {
    id: string;
    state: string;
    createdAt: string;
    authenticatedAt: string | null;
    expiresAt: string;
  }[];
  tokens: {
    id: string;
    type: string;
    clientId: string;
    scopes: string[];
    createdAt: string;
    expiresAt: string;
  }[];
  apiKeys: {
    id: string;
    name: string;
    scopes: string[];
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    isRevoked: boolean;
  }[];
  shareTokens: {
    id: string;
    name: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    includeFullDetails: boolean;
  }[];
  consents: {
    id: string;
    clientId: string;
    scopes: string[];
    grantedAt: string;
    updatedAt: string;
  }[];
};

export const useAdminUser = (userId: string) => {
  const token = useAdminToken();
  return useQuery<AdminUserDetail>({
    queryKey: adminKeys.user(userId),
    enabled: Boolean(token && userId),
    queryFn: async () => {
      const response = await authClient.api.admin.users[":userId"].$get(
        { param: { userId } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminUserDetail>(response as unknown as Response);
    },
  });
};

/**
 * Invalidate everything a user-affecting write could have changed.
 *
 * A ban revokes tokens and moves the banned count on the overview, so the
 * cheapest correct answer is to drop the whole admin namespace rather than
 * enumerate which of six keys happened to be on screen.
 */
const useInvalidateAdmin = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin"] });
};

export const useSetUserRole = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AdminRole;
    }) => {
      const response = await authClient.api.admin.users[":userId"].role.$patch(
        { param: { userId }, json: { role } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminUser>(response as unknown as Response);
    },
    onSuccess: invalidate,
  });
};

export const useSetUserBan = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async ({
      userId,
      banned,
      reason,
    }: {
      userId: string;
      banned: boolean;
      reason?: string;
    }) => {
      const response = await authClient.api.admin.users[":userId"].ban.$patch(
        {
          param: { userId },
          json: { banned, ...(reason ? { reason } : {}) },
        },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminUser>(response as unknown as Response);
    },
    onSuccess: invalidate,
  });
};

export const useRevokeUserSessions = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await authClient.api.admin.users[
        ":userId"
      ].sessions.$delete(
        { param: { userId } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<{ tokens: number; sessions: number }>(
        response as unknown as Response,
      );
    },
    onSuccess: invalidate,
  });
};

export const useAdminAnnouncements = () => {
  const token = useAdminToken();
  return useQuery<AdminAnnouncement[]>({
    queryKey: adminKeys.announcements,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.announcements.$get(
        {},
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminAnnouncement[]>(response as unknown as Response);
    },
  });
};

export const useSaveAnnouncement = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: number;
      values: AdminAnnouncementInput;
    }) => {
      const headers = authHeaders(requireToken(token));
      const response = id
        ? await authClient.api.admin.announcements[":id"].$patch(
            { param: { id: String(id) }, json: values },
            { headers },
          )
        : await authClient.api.admin.announcements.$post(
            { json: values },
            { headers },
          );
      return unwrap<AdminAnnouncement>(response as unknown as Response);
    },
    onSuccess: invalidate,
  });
};

export const useDeleteAnnouncement = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await authClient.api.admin.announcements[":id"].$delete(
        { param: { id: String(id) } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<{ deleted: boolean }>(response as unknown as Response);
    },
    onSuccess: invalidate,
  });
};

export const useAdminOAuthClients = () => {
  const token = useAdminToken();
  return useQuery<AdminClient[]>({
    queryKey: adminKeys.oauthClients,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.clients.$get(
        {},
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<AdminClient[]>(response as unknown as Response);
    },
  });
};

export const useRotateClientSecret = () => {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const response = await authClient.api.admin.clients[":clientId"][
        "rotate-secret"
      ].$post(
        { param: { clientId } },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap<{ clientId: string; clientSecret: string }>(
        response as unknown as Response,
      );
    },
    onSuccess: invalidate,
  });
};

export const useAdminAudit = (params: {
  action?: string;
  actorId?: string;
  page: number;
  pageSize: number;
}) => {
  const token = useAdminToken();
  return useQuery<{
    total: number;
    page: number;
    pageSize: number;
    entries: AdminAuditEntry[];
  }>({
    queryKey: adminKeys.audit(params),
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authClient.api.admin.audit.$get(
        {
          query: {
            ...(params.action ? { action: params.action } : {}),
            ...(params.actorId ? { actorId: params.actorId } : {}),
            page: String(params.page),
            pageSize: String(params.pageSize),
          },
        },
        { headers: authHeaders(requireToken(token)) },
      );
      return unwrap(response as unknown as Response);
    },
  });
};
