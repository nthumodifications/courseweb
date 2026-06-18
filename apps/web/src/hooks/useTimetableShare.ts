import { useAuth } from "react-oidc-context";
import { useCallback, useMemo } from "react";

const API_BASE = import.meta.env.VITE_COURSEWEB_API_URL as string;

export type SharedTimetable = {
  id: string;
  ownerId: string;
  displayName?: string;
  semesters: string[];
  courses: Record<string, string[]>;
  courseNotes: Record<string, string>;
  visibility: "link_only" | "public";
  isLive: boolean;
  isAnonymous: boolean;
  gradeContext?: Record<
    string,
    { grade?: string; difficulty?: number; attendance?: string }
  > | null;
  createdAt: string;
  updatedAt: string;
  shareUrl?: string;
};

export type SavedTimetable = {
  id: string;
  viewerId: string;
  sharedTimetableId: string;
  label?: string;
  syncMode: "live" | "snapshot";
  savedCourses?: Record<string, string[]> | null;
  addedAt: string;
  lastSeenAt: string;
  share?: SharedTimetable | null;
};

export type TimetableGroup = {
  id: string;
  name: string;
  inviteCode: string;
  semester: string;
  createdBy: string;
  members: Array<{
    userId: string;
    sharedTimetableId: string;
    label: string;
    joinedAt: string;
    share?: SharedTimetable | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useTimetableShare() {
  const auth = useAuth();
  const token = auth.user?.access_token;

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const getShareView = useCallback(
    async (shareId: string): Promise<SharedTimetable> => {
      const res = await fetch(`${API_BASE}/timetable-share/view/${shareId}`);
      return parseResponse<SharedTimetable>(res);
    },
    [],
  );

  const getPublicGallery = useCallback(
    async (params: { semester?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params.semester) q.set("semester", params.semester);
      if (params.limit) q.set("limit", String(params.limit));
      if (params.offset) q.set("offset", String(params.offset));
      const res = await fetch(`${API_BASE}/timetable-share/public?${q}`);
      return parseResponse<{ items: SharedTimetable[]; hasMore: boolean }>(res);
    },
    [],
  );

  const getGroup = useCallback(
    async (code: string): Promise<TimetableGroup> => {
      const res = await fetch(`${API_BASE}/timetable-share/group/${code}`);
      return parseResponse<TimetableGroup>(res);
    },
    [],
  );

  const listOwnShares = useCallback(async (): Promise<SharedTimetable[]> => {
    const res = await fetch(`${API_BASE}/timetable-share`, {
      headers: authHeaders,
    });
    return parseResponse<SharedTimetable[]>(res);
  }, [authHeaders]);

  const createShare = useCallback(
    async (data: {
      displayName?: string;
      semesters: string[];
      courses: Record<string, string[]>;
      courseNotes?: Record<string, string>;
      visibility?: "link_only" | "public";
      isLive?: boolean;
      isAnonymous?: boolean;
      gradeContext?: Record<
        string,
        { grade?: string; difficulty?: number; attendance?: string }
      >;
    }): Promise<SharedTimetable & { shareUrl: string }> => {
      const res = await fetch(`${API_BASE}/timetable-share`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      return parseResponse(res);
    },
    [authHeaders],
  );

  const updateShare = useCallback(
    async (
      shareId: string,
      data: Partial<{
        displayName: string;
        courses: Record<string, string[]>;
        courseNotes: Record<string, string>;
        visibility: "link_only" | "public";
        isLive: boolean;
        isAnonymous: boolean;
        gradeContext: Record<
          string,
          { grade?: string; difficulty?: number; attendance?: string }
        >;
      }>,
    ): Promise<SharedTimetable> => {
      const res = await fetch(`${API_BASE}/timetable-share/${shareId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      return parseResponse(res);
    },
    [authHeaders],
  );

  const deleteShare = useCallback(
    async (shareId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/timetable-share/${shareId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await parseResponse(res);
    },
    [authHeaders],
  );

  const listSaved = useCallback(async (): Promise<SavedTimetable[]> => {
    const res = await fetch(`${API_BASE}/timetable-share/saved`, {
      headers: authHeaders,
    });
    return parseResponse<SavedTimetable[]>(res);
  }, [authHeaders]);

  const saveShare = useCallback(
    async (data: {
      sharedTimetableId: string;
      label?: string;
      syncMode?: "live" | "snapshot";
    }): Promise<SavedTimetable> => {
      const res = await fetch(`${API_BASE}/timetable-share/saved`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      return parseResponse(res);
    },
    [authHeaders],
  );

  const updateSaved = useCallback(
    async (
      savedId: string,
      data: { label?: string; markSeen?: boolean },
    ): Promise<SavedTimetable> => {
      const res = await fetch(`${API_BASE}/timetable-share/saved/${savedId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      return parseResponse(res);
    },
    [authHeaders],
  );

  const unsaveShare = useCallback(
    async (savedId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/timetable-share/saved/${savedId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await parseResponse(res);
    },
    [authHeaders],
  );

  const listMyGroups = useCallback(async (): Promise<TimetableGroup[]> => {
    const res = await fetch(`${API_BASE}/timetable-share/groups`, {
      headers: authHeaders,
    });
    return parseResponse<TimetableGroup[]>(res);
  }, [authHeaders]);

  const deleteGroup = useCallback(
    async (code: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/timetable-share/group/${code}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await parseResponse(res);
    },
    [authHeaders],
  );

  const createGroup = useCallback(
    async (data: {
      name: string;
      semester: string;
      sharedTimetableId?: string;
      creatorLabel?: string;
    }): Promise<TimetableGroup> => {
      const res = await fetch(`${API_BASE}/timetable-share/group`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      return parseResponse(res);
    },
    [authHeaders],
  );

  const joinGroup = useCallback(
    async (
      code: string,
      data: { sharedTimetableId: string; label?: string },
    ): Promise<TimetableGroup> => {
      const res = await fetch(
        `${API_BASE}/timetable-share/group/${code}/join`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(data),
        },
      );
      return parseResponse(res);
    },
    [authHeaders],
  );

  const leaveGroup = useCallback(
    async (code: string): Promise<void> => {
      const res = await fetch(
        `${API_BASE}/timetable-share/group/${code}/leave`,
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );
      await parseResponse(res);
    },
    [authHeaders],
  );

  return {
    isAuthenticated: auth.isAuthenticated,
    getShareView,
    getPublicGallery,
    getGroup,
    listOwnShares,
    listMyGroups,
    createShare,
    updateShare,
    deleteShare,
    listSaved,
    saveShare,
    updateSaved,
    unsaveShare,
    createGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
  };
}
