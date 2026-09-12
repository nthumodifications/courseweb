import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { useEffect, useRef, useState } from "react";
import { hasCalendarScope } from "@/config/rxdb";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useTimetableShare } from "@/hooks/useTimetableShare";
import {
  getLiveTimetablePayload,
  getLiveTimetablePayloadKey,
  getPublishedLiveTimetablePayload,
} from "@/hooks/liveTimetableSync";

/** Publishes local timetable changes for every live share owned by the user. */
const LiveTimetableSync = () => {
  const auth = useAuth();
  const { courses, customItems, timetableDataReady, customItemsDataReady } =
    useUserTimetable();
  const { listOwnShares, updateShare } = useTimetableShare();
  const userId = auth.user?.profile.sub;
  const authSessionKey = auth.user?.expires_at ?? 0;
  const accessToken = auth.user?.access_token;
  const canSync =
    auth.isAuthenticated &&
    Boolean(accessToken && userId) &&
    hasCalendarScope(auth.user?.scope);
  const [syncRevision, setSyncRevision] = useState(0);
  const inFlight = useRef(new Set<string>());
  const lastPublished = useRef(new Map<string, string>());

  const { data: ownShares = [] } = useQuery({
    queryKey: ["own-shares", userId ?? "anonymous", authSessionKey],
    queryFn: listOwnShares,
    enabled: canSync,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!canSync || !timetableDataReady || !customItemsDataReady) return;

    const liveShareIds = new Set(
      ownShares.filter((share) => share.isLive).map((share) => share.id),
    );
    for (const shareId of lastPublished.current.keys()) {
      if (!liveShareIds.has(shareId)) lastPublished.current.delete(shareId);
    }

    for (const share of ownShares) {
      if (!share.isLive || inFlight.current.has(share.id)) continue;

      const payload = getLiveTimetablePayload(
        share.semesters,
        courses,
        customItems,
      );
      const payloadKey = getLiveTimetablePayloadKey(payload);
      const publishedKey = getLiveTimetablePayloadKey(
        getPublishedLiveTimetablePayload(share),
      );

      if (
        payloadKey === publishedKey ||
        lastPublished.current.get(share.id) === payloadKey
      ) {
        continue;
      }

      inFlight.current.add(share.id);
      void updateShare(share.id, payload)
        .then(() => {
          lastPublished.current.set(share.id, payloadKey);
          // A local edit may have happened while the request was in flight.
          setSyncRevision((revision) => revision + 1);
        })
        .catch((error: unknown) => {
          console.error(`[live timetable ${share.id}] update failed`, error);
        })
        .finally(() => {
          inFlight.current.delete(share.id);
        });
    }
  }, [
    authSessionKey,
    canSync,
    courses,
    customItems,
    customItemsDataReady,
    ownShares,
    syncRevision,
    timetableDataReady,
    updateShare,
  ]);

  return null;
};

export default LiveTimetableSync;
