import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";
import {
  getSyncedStorageKey,
  hasSyncedMetadata,
  migrateLegacySyncedData,
  nextUpdatedAt,
  normalizeSyncedData,
  reconcileSyncedData,
  type MergeData,
  type SyncedData,
} from "./syncedStorage";

const DEVICE_ID_KEY = "nthumods_device_id";

const randomSuffix = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const getDeviceId = () => {
  if (typeof window === "undefined") return "server";

  const existingDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existingDeviceId) return existingDeviceId;

  const deviceId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${randomSuffix()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
};

const useSyncedStorage = <T = unknown,>(
  key: string,
  defaultValue: T,
  mergeData?: MergeData<T>,
): [T, (newData: T | ((prevData: T) => T)) => void, boolean] => {
  const { user, isAuthenticated } = useAuth();
  const [deviceId] = useState(getDeviceId);
  const userId = user?.profile.sub;
  const storageKey = getSyncedStorageKey(key, userId);
  const storageKeyRef = useRef(storageKey);
  const storageKeyChanged = storageKeyRef.current !== storageKey;
  const [localData, setLocalData] = useLocalStorage<SyncedData<T>>(storageKey, {
    value: defaultValue,
    lastModified: -1,
    updatedAt: -1,
    deviceId,
  });
  const [data, setDataState] = useState<SyncedData<T>>(() =>
    normalizeSyncedData<T>(localData, deviceId),
  );
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

  useEffect(() => {
    if (storageKeyRef.current === storageKey) return;

    // useLocalStorage reloads the new key in its own effect. Until that
    // happens, do not let the previous identity's snapshot participate in
    // reconciliation or uploads.
    storageKeyRef.current = storageKey;
    reconciledUserRef.current = undefined;
    uploadedVersionRef.current = undefined;
  }, [storageKey]);

  useEffect(() => {
    if (userId || storageKeyChanged || typeof window === "undefined") {
      return;
    }

    const migrated = migrateLegacySyncedData<T>(
      window.localStorage.getItem(key),
      window.localStorage.getItem(storageKey),
      deviceId,
    );
    if (!migrated) return;

    // Keep the old unscoped record as a recoverable legacy copy. The new
    // anonymous namespace is the only record read by this hook going forward.
    setLocalData(migrated);
  }, [deviceId, key, setLocalData, storageKey, storageKeyChanged, userId]);

  // Upgrade old local records without ever treating this as proof that the remote read succeeded.
  useEffect(() => {
    if (storageKeyChanged) return;

    const normalizedLocalData = normalizeSyncedData<T>(localData, deviceId);
    setDataState(normalizedLocalData);
    if (!hasSyncedMetadata(localData)) {
      setLocalData(normalizedLocalData);
    }
  }, [deviceId, localData, setLocalData]);

  useEffect(() => {
    if (storageKeyChanged) return;

    if (!isAuthenticated || !userId) {
      // A logout starts a fresh reconciliation on the next login. Each
      // identity's local data remains in its own namespace.
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

    const reconciliation = reconcileSyncedData({
      local,
      remote,
      mergeData,
      initial: reconciledUserRef.current !== userId,
      deviceId,
    });
    reconciledUserRef.current = userId;
    setDataState(reconciliation.data);
    if (reconciliation.persistLocal) {
      setLocalData(reconciliation.data);
    }
    if (reconciliation.upload) {
      upload(reconciliation.data, reconciliation.upload.merge);
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
    storageKeyChanged,
    upload,
    userId,
  ]);

  const updateData = useCallback(
    (newData: T | ((prevData: T) => T)) => {
      if (storageKeyChanged) return;

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
    [deviceId, setLocalData, storageKeyChanged],
  );

  const isSettled =
    !storageKeyChanged &&
    (!isAuthenticated ||
      !userId ||
      (isRemoteReadSuccessful &&
        !isRemoteFetching &&
        !isRemotePaused &&
        hasSyncedMetadata(localData) &&
        reconciledUserRef.current === userId));

  return [
    storageKeyChanged ? defaultValue : (data.value ?? defaultValue),
    updateData,
    isSettled,
  ] as const;
};

export default useSyncedStorage;
