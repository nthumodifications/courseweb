import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

export type CourseShortNameLanguage = "zh" | "en";
export type CourseShortNameIdentityType = "module" | "course_code";
export type CourseShortNameEntry = {
  id: string;
  identityType: CourseShortNameIdentityType;
  identityKey: string;
  language: CourseShortNameLanguage;
  shortName: string;
  updatedAt: string;
};
export type CourseShortNameEdit = {
  moduleKey?: string;
  courseCode?: string;
  language: CourseShortNameLanguage;
  shortName: string;
};

export class CourseShortNameApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "CourseShortNameApiError";
  }
}

export const courseShortNamesBaseUrl = () =>
  `${import.meta.env.VITE_NTHUMODS_AUTH_URL || "https://auth.nthumods.com"}/api/course-short-names`;

export const fetchCourseShortNames = async (
  fetcher: typeof fetch = fetch,
  baseUrl = courseShortNamesBaseUrl(),
): Promise<CourseShortNameEntry[]> => {
  const response = await fetcher(baseUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new CourseShortNameApiError(response.status, "request_failed");
  const data = (await response.json()) as { entries?: CourseShortNameEntry[] };
  return Array.isArray(data.entries) ? data.entries : [];
};

const writeCourseShortName = async (
  input: CourseShortNameEdit,
  token: string,
) => {
  const response = await fetch(courseShortNamesBaseUrl(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    let code = "request_failed";
    try {
      code = ((await response.json()) as { error?: string }).error ?? code;
    } catch {
      // Keep the HTTP status if an intermediary returned a non-JSON response.
    }
    throw new CourseShortNameApiError(response.status, code);
  }
  return (await response.json()) as { entry: CourseShortNameEntry };
};

export const courseShortNameKeys = {
  all: ["course-short-names"] as const,
};

export const useCourseShortNames = () =>
  useQuery({
    queryKey: courseShortNameKeys.all,
    queryFn: () => fetchCourseShortNames(),
    staleTime: 60_000,
  });

export const useEditCourseShortName = () => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseShortNameEdit) => {
      const token = auth.user?.access_token;
      if (!token) throw new CourseShortNameApiError(401, "unauthorized");
      return writeCourseShortName(input, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: courseShortNameKeys.all,
      });
    },
  });
};
