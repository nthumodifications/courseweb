import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTimetableShare, type SavedTimetable } from "./useTimetableShare";
import { useAuth } from "react-oidc-context";

export function useSavedTimetables() {
  const auth = useAuth();
  const { listSaved, unsaveShare, updateSaved } = useTimetableShare();
  const queryClient = useQueryClient();

  const { data: savedTimetables = [], isLoading } = useQuery({
    queryKey: ["saved-timetables"],
    queryFn: listSaved,
    enabled: auth.isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // poll every 5 min
    staleTime: 4 * 60 * 1000,
  });

  const unsaveMutation = useMutation({
    mutationFn: unsaveShare,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["saved-timetables"] }),
  });

  const markSeenMutation = useMutation({
    mutationFn: (savedId: string) => updateSaved(savedId, { markSeen: true }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["saved-timetables"] }),
  });

  const hasNewChanges = (saved: SavedTimetable): boolean => {
    if (!saved.share) return false;
    const lastSeen = new Date(saved.lastSeenAt).getTime();
    const shareUpdated = new Date(saved.share.updatedAt).getTime();
    return shareUpdated > lastSeen;
  };

  const totalUnread = savedTimetables.filter(hasNewChanges).length;

  return {
    savedTimetables,
    isLoading,
    unsave: unsaveMutation.mutate,
    markSeen: markSeenMutation.mutate,
    hasNewChanges,
    totalUnread,
  };
}
