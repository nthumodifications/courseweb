import { useCallback, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, FirestoreDataConverter, setDoc } from 'firebase/firestore';
import { useLocalStorage } from 'usehooks-ts';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth } from '@/config/firebase';
import { userCol } from '@/lib/firebase/firestore';

interface SyncedData<T> {
  value: T;
  lastModified: number;
}

// Utility function to migrate old data formats to the new format
const migrateDataFormat = <T=unknown>(data: any) => {
  if (typeof data === 'object' && 'lastModified' in data && 'value' in data) return data as { value: any, lastModified: number };
  return { value: data, lastModified: Date.now() } as SyncedData<T>;;
};

const syncedStorage:FirestoreDataConverter<{ value: any, lastModified: number }> = {
  toFirestore: (data) => data,
  fromFirestore: (snap) => snap.data() as { value: any, lastModified: number }
};

const useSyncedStorage = <T=unknown>(key: string, defaultValue: T): [T, (newData: T | ((prevData: T) => T)) => void] => {
  const [user, loading] = useAuthState(auth);
  const [localData, setLocalData] = useLocalStorage<SyncedData<T>>(key, { value: defaultValue, lastModified: -1 });
  const [data, setDataState] = useState<SyncedData<T>>(localData);

  const docRef = user ? doc(userCol, user.uid, 'storage', key).withConverter(syncedStorage) : null;
  const [remoteData] = useDocumentData<SyncedData<T>>(docRef);

  useEffect(() => {
    // wait for auth to finish loading
    if (loading) return;
    // Migrate old data format if necessary
    const migratedData = migrateDataFormat<T>(localData);
    if (migratedData !== localData) {
      setLocalData(migratedData);
      setDataState(migratedData);
      // If migration happened, sync the data with Firestore
      if (user && docRef) {
        setDoc(docRef, migratedData);
        console.log('migrated data format and uploading to firebase')
      }
    }
  }, [localData, setLocalData, user, docRef, loading]);

  useEffect(() => {
    const syncData = async () => {
      if (user && remoteData) {
        const localLastModified = localData.lastModified || 0;
        const remoteLastModified = remoteData.lastModified || 0;

        if (localLastModified > remoteLastModified) {
          // Local data is newer, update Firestore
          await setDoc(docRef!, localData);
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
  }, [user, key, localData, setLocalData, remoteData, docRef]);

  const updateData = useCallback(
    async (newData: T | ((prevData: T) => T)) => {
      setDataState((prevData) => {
        const value = typeof newData === 'function' ? (newData as (prevData: T) => T)(prevData.value) : newData;
        const newTimestamp = Date.now();
        const updatedData = { value, lastModified: newTimestamp };
        setLocalData(updatedData);

        if (user && docRef) {
          setDoc(docRef, updatedData);
          console.log('updated remote data');
        }

        return updatedData;
      });
    },
    [user, docRef, setLocalData]
  );

  return [data.value ?? defaultValue, updateData] as const;
};

export default useSyncedStorage;
