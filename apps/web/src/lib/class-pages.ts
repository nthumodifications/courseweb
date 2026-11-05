export type ClassPageContact = { label: string; value: string };

export type ClassPageProfile = {
  displayName: string;
  department: string;
  year: string;
  contacts: ClassPageContact[];
  displayNameVisible: boolean;
  departmentVisible: boolean;
  yearVisible: boolean;
  contactsVisible: boolean;
  blocks: Array<{ id: string }>;
};

export type ClassPageMember = {
  id: string;
  displayName: string | null;
  department: string | null;
  year: string | null;
  contacts: ClassPageContact[];
  lookingForPartners: boolean;
  selfDeclared: boolean;
};

export type ClassPageLink = {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  mine: boolean;
  authorMembershipId: string;
};

export type ClassPageData = {
  members: ClassPageMember[];
  links: ClassPageLink[];
};
export type ClassPageMembership = {
  id: string;
  lookingForPartners: boolean;
  selfDeclared: boolean;
};

export class ClassPagesApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ClassPagesApiError";
  }
}

const apiBase = () =>
  `${import.meta.env.VITE_NTHUMODS_AUTH_URL || "https://auth.nthumods.com"}/api/class-pages`;

const request = async <T>(
  path: string,
  token: string,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  if (!response.ok) {
    let code = "request_failed";
    try {
      code = ((await response.json()) as { error?: string }).error ?? code;
    } catch {
      // Preserve the HTTP status when the response is not JSON.
    }
    throw new ClassPagesApiError(response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const offeringPath = (semester: string, courseId: string) =>
  `/class/${encodeURIComponent(semester)}/${encodeURIComponent(courseId)}`;

export const classPageKeys = {
  profile: ["class-pages", "profile"] as const,
  membership: (semester: string, courseId: string) =>
    ["class-pages", "membership", semester, courseId] as const,
  page: (semester: string, courseId: string) =>
    ["class-pages", "page", semester, courseId] as const,
};

export const getClassPageProfile = (token: string) =>
  request<{ profile: ClassPageProfile | null }>("/profile", token);

export const saveClassPageProfile = (
  token: string,
  profile: Omit<ClassPageProfile, "blocks">,
) =>
  request<{ profile: ClassPageProfile }>("/profile", token, {
    method: "PUT",
    body: JSON.stringify(profile),
  });

export const leaveClassPages = (token: string) =>
  request<{ ok: true }>("/profile", token, { method: "DELETE" });

export const getClassMembership = (
  token: string,
  semester: string,
  courseId: string,
) =>
  request<{ eligible: boolean; membership: ClassPageMembership | null }>(
    `/membership/${encodeURIComponent(semester)}/${encodeURIComponent(courseId)}`,
    token,
  );

export const leaveDroppedCourse = (
  token: string,
  semester: string,
  courseId: string,
) =>
  request<{ ok: true }>(
    `/membership/${encodeURIComponent(semester)}/${encodeURIComponent(courseId)}`,
    token,
    { method: "DELETE" },
  );

export const joinClassPage = (
  token: string,
  semester: string,
  courseId: string,
) =>
  request<{ membership: ClassPageMembership }>("/memberships", token, {
    method: "POST",
    body: JSON.stringify({ semester, courseId }),
  });

export const joinAllCourses = (token: string, semester: string) =>
  request<{ joined: number }>("/memberships/join-all", token, {
    method: "POST",
    body: JSON.stringify({ semester }),
  });

export const getClassPage = (
  token: string,
  semester: string,
  courseId: string,
) => request<ClassPageData>(offeringPath(semester, courseId), token);

export const setPartnerSeeking = (
  token: string,
  membershipId: string,
  lookingForPartners: boolean,
) =>
  request<{ membership: ClassPageMembership }>(
    `/memberships/${membershipId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ lookingForPartners }),
    },
  );

export const leaveClassPage = (token: string, membershipId: string) =>
  request<{ ok: true }>(`/memberships/${membershipId}`, token, {
    method: "DELETE",
  });

export const addClassPageLink = (
  token: string,
  semester: string,
  courseId: string,
  label: string,
  url: string,
) =>
  request<{ link: ClassPageLink }>(
    `${offeringPath(semester, courseId)}/links`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ label, url }),
    },
  );

export const removeClassPageLink = (token: string, linkId: string) =>
  request<{ ok: true }>(`/links/${linkId}`, token, { method: "DELETE" });

export const reportClassPageTarget = (
  token: string,
  target: {
    semester: string;
    courseId: string;
    targetType: "member" | "link";
    targetId: string;
    reason: string;
    note?: string;
  },
) =>
  request<{ ok: true }>("/reports", token, {
    method: "POST",
    body: JSON.stringify(target),
  });

export const blockClassPageMember = (
  token: string,
  semester: string,
  courseId: string,
  membershipId: string,
) =>
  request<{ block: { id: string } }>("/blocks", token, {
    method: "POST",
    body: JSON.stringify({ semester, courseId, membershipId }),
  });

export const unblockClassPageMember = (token: string, blockId: string) =>
  request<{ ok: true }>(`/blocks/${blockId}`, token, { method: "DELETE" });

export const isCourseInStoredTimetable = (
  courses: unknown,
  semester: string,
  courseId: string,
) => {
  if (typeof courses !== "object" || courses === null) return false;
  const ids = (courses as Record<string, unknown>)[semester];
  return Array.isArray(ids) && ids.includes(courseId);
};

export type ClassPageClientAccess =
  | "sign_in"
  | "add_course"
  | "create_profile"
  | "join"
  | "view";

export const getClassPageClientAccess = ({
  signedIn,
  inTimetable,
  profileOptedIn,
  joined,
}: {
  signedIn: boolean;
  inTimetable: boolean;
  profileOptedIn: boolean;
  joined: boolean;
}): ClassPageClientAccess => {
  if (!signedIn) return "sign_in";
  if (!inTimetable) return "add_course";
  if (!profileOptedIn) return "create_profile";
  if (!joined) return "join";
  return "view";
};
