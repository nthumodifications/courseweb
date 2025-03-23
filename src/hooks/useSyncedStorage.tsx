import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";

interface SyncedData<T> {
  value: T;
  lastModified: number;
}

// Utility function to migrate old data formats to the new format
const migrateDataFormat = <T = unknown,>(data: any) => {
  if (typeof data === "object" && "lastModified" in data && "value" in data)
    return data as { value: any; lastModified: number };
  return { value: data, lastModified: Date.now() } as SyncedData<T>;
};

const useSyncedStorage = <T = unknown,>(
  key: string,
  defaultValue: T,
): [T, (newData: T | ((prevData: T) => T)) => void] => {
  const { user, isAuthenticated } = useAuth();
  const [localData, setLocalData] = useLocalStorage<SyncedData<T>>(key, {
    value: defaultValue,
    lastModified: -1,
  });
  const [data, setDataState] = useState<SyncedData<T>>(localData);

  const { data: remoteData, isLoading } = useQuery<SyncedData<T>>({
    queryKey: ["kv", key],
    enabled: isAuthenticated,
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
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Unknown error");
      }
      return data as unknown as SyncedData<T>;
    },
  });

  useEffect(() => {
    // wait for auth to finish loading
    if (!isAuthenticated) return;
    // Migrate old data format if necessary
    const migratedData = migrateDataFormat<T>(localData);
    if (migratedData !== localData) {
      setLocalData(migratedData);
      setDataState(migratedData);
      // If migration happened, sync the data with kv storage
      if (user) {
        authClient.api.kv[":key"].$post(
          {
            param: { key },
            json: migratedData,
          },
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          },
        );
      }
    }
  }, [localData, setLocalData, user, isAuthenticated]);

  useEffect(() => {
    const syncData = async () => {
      if (user && remoteData) {
        const localLastModified = localData.lastModified || 0;
        const remoteLastModified = remoteData.lastModified || 0;

        if (localLastModified > remoteLastModified) {
          // Local data is newer, update remote storage

          if (isAuthenticated) {
            authClient.api.kv[":key"].$post(
              {
                param: { key },
                json: localData,
              },
              {
                headers: {
                  Authorization: `Bearer ${user!.access_token}`,
                },
              },
            );
            console.log("updated remote data");
          }
          setDataState(localData);
        } else if (localLastModified < remoteLastModified) {
          // Remote data is newer, update local storage
          setLocalData(remoteData);
          setDataState(remoteData);
        } else {
          // Data is the same, no action needed
          setDataState(localData);
        }
      } else {
        setDataState(localData);
      }
    };

    syncData();
  }, [user, key, localData, setLocalData, remoteData, isAuthenticated]);

  const updateData = useCallback(
    async (newData: T | ((prevData: T) => T)) => {
      setDataState((prevData) => {
        const value =
          typeof newData === "function"
            ? (newData as (prevData: T) => T)(prevData.value)
            : newData;
        const newTimestamp = Date.now();
        const updatedData = { value, lastModified: newTimestamp };
        setLocalData(updatedData);
        return updatedData;
      });
    },
    [setLocalData],
  );

  return [data.value ?? defaultValue, updateData] as const;
};

export default useSyncedStorage;
