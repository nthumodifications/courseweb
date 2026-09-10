import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";
import {
  hasSyncedMetadata,
  nextUpdatedAt,
  normalizeSyncedData,
  valuesEqual,
  type SyncedData,
} from "./syncedStorage";

const DEVICE_ID_KEY = "nthumods_device_id";

const getDeviceId = () => {
  if (typeof window === "undefined") return "server";

  const existingDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existingDeviceId) return existingDeviceId;

  const deviceId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
};

type MergeData<T> = (local: T, remote: T) => T;

const useSyncedStorage = <T = unknown,>(
  key: string,
  defaultValue: T,
  mergeData?: MergeData<T>,
): [T, (newData: T | ((prevData: T) => T)) => void] => {
  const { user, isAuthenticated } = useAuth();
  const [deviceId] = useState(getDeviceId);
  const [localData, setLocalData] = useLocalStorage<SyncedData<T>>(key, {
    value: defaultValue,
    lastModified: -1,
    updatedAt: -1,
    deviceId,
  });
  const [data, setDataState] = useState<SyncedData<T>>(() =>
    normalizeSyncedData<T>(localData, deviceId),
  );
  const userId = user?.profile.sub;
  const authSessionKey = user?.expires_at ?? 0;
  const reconciledUserRef = useRef<string>();
  const uploadedVersionRef = useRef<string>();

  const {
    data: remoteData,
    isFetching: isRemoteFetching,
    isPaused: isRemotePaused,
    isSuccess: isRemoteReadSuccessful,
  } = useQuery<SyncedData<T> | null>({
    queryKey: ["kv", userId ?? "anonymous", authSessionKey, key],
    enabled: Boolean(isAuthenticated && userId && user?.access_token),
    queryFn: async () => {
      const response = await authClient.api.kv[":key"].$get(
        {
          param: { key },
        },
        {
          headers: {
            Authorization: `Bearer ${user!.access_token}`,
          },
        },
      );

      if (response.status === 404) return null;

      const payload = (await response.json()) as {
        error?: string;
        [field: string]: unknown;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Unknown error");
      }

      return normalizeSyncedData<T>(payload, deviceId);
    },
  });

  const postData = useCallback(
    async (nextData: SyncedData<T>, merge: boolean) => {
      if (!user || !isAuthenticated) return;

      const response = await authClient.api.kv[":key"].$post(
        {
          param: { key },
          json: {
            value: nextData.value,
            lastModified: nextData.lastModified,
            updatedAt: nextData.updatedAt,
            deviceId: nextData.deviceId,
            merge,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to sync ${key}: ${response.status}`);
      }
    },
    [isAuthenticated, key, user],
  );

  const upload = useCallback(
    (nextData: SyncedData<T>, merge: boolean) => {
      const version = `${nextData.updatedAt}:${nextData.deviceId}`;
      if (uploadedVersionRef.current === version) return;
      uploadedVersionRef.current = version;

      void postData(nextData, merge).catch((error: unknown) => {
        if (uploadedVersionRef.current === version) {
          uploadedVersionRef.current = undefined;
        }
        console.error(error);
      });
    },
    [postData],
  );

  // Upgrade old local records without ever treating this as proof that the remote read succeeded.
  useEffect(() => {
    const normalizedLocalData = normalizeSyncedData<T>(localData, deviceId);
    setDataState(normalizedLocalData);
    if (!hasSyncedMetadata(localData)) {
      setLocalData(normalizedLocalData);
    }
  }, [deviceId, localData, setLocalData]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // A logout starts a fresh reconciliation on the next login. Local data remains intact.
      reconciledUserRef.current = undefined;
      uploadedVersionRef.current = undefined;
      setDataState(normalizeSyncedData<T>(localData, deviceId));
      return;
    }

    // Cached data may be present while React Query is fetching the current user's record.
    // It is not safe to persist or overwrite local state until that fetch settles successfully.
    if (
      !isRemoteReadSuccessful ||
      isRemoteFetching ||
      isRemotePaused ||
      !hasSyncedMetadata(localData)
    ) {
      return;
    }

    const local = normalizeSyncedData<T>(localData, deviceId);
    const remote = remoteData
      ? normalizeSyncedData<T>(remoteData, deviceId)
      : null;

    if (reconciledUserRef.current !== userId) {
      reconciledUserRef.current = userId;

      if (!remote) {
        setDataState(local);
        if (local.updatedAt >= 0) upload(local, Boolean(mergeData));
        return;
      }

      if (mergeData) {
        const mergedValue = mergeData(local.value, remote.value);
        const localAndRemoteAreEqual = valuesEqual(local.value, remote.value);

        if (localAndRemoteAreEqual) {
          const winner = local.updatedAt >= remote.updatedAt ? local : remote;
          setDataState(winner);
          setLocalData(winner);
        } else if (valuesEqual(mergedValue, remote.value)) {
          // The remote snapshot already contains all local values.
          setDataState(remote);
          setLocalData(remote);
        } else {
          const merged: SyncedData<T> = {
            value: mergedValue,
            updatedAt: nextUpdatedAt(
              Math.max(local.updatedAt, remote.updatedAt),
            ),
            lastModified: 0,
            deviceId,
          };
          merged.lastModified = merged.updatedAt;
          setDataState(merged);
          setLocalData(merged);
          upload(merged, true);
        }
        return;
      }

      const winner = local.updatedAt >= remote.updatedAt ? local : remote;
      setDataState(winner);
      setLocalData(winner);
      if (winner === local) upload(local, false);
      return;
    }

    if (!remote) {
      setDataState(local);
      if (local.updatedAt >= 0) upload(local, false);
    } else if (local.updatedAt > remote.updatedAt) {
      setDataState(local);
      upload(local, false);
    } else if (local.updatedAt < remote.updatedAt) {
      setLocalData(remote);
      setDataState(remote);
    } else {
      setDataState(local);
    }
  }, [
    authSessionKey,
    deviceId,
    isAuthenticated,
    isRemoteFetching,
    isRemotePaused,
    isRemoteReadSuccessful,
    localData,
    mergeData,
    remoteData,
    setLocalData,
    upload,
    userId,
  ]);

  const updateData = useCallback(
    (newData: T | ((prevData: T) => T)) => {
      setDataState((prevData) => {
        const value =
          typeof newData === "function"
            ? (newData as (prevData: T) => T)(prevData.value)
            : newData;
        const updatedAt = nextUpdatedAt(prevData.updatedAt);
        const updatedData: SyncedData<T> = {
          value,
          updatedAt,
          lastModified: updatedAt,
          deviceId,
        };
        setLocalData(updatedData);
        return updatedData;
      });
    },
    [deviceId, setLocalData],
  );

  return [data.value ?? defaultValue, updateData] as const;
};

export default useSyncedStorage;
