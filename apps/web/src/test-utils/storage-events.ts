export const nextStorageValue = <T>(
  next: T | ((previous: T) => T),
  read: () => T,
) => (typeof next === "function" ? (next as (previous: T) => T)(read()) : next);

export const persistStorageValue = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const subscribeToStorageEvents = <T>(
  key: string,
  read: () => T,
  setValue: (value: T) => void,
) => {
  const handleStorage = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key && storageEvent.key !== key) return;
    setValue(read());
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("local-storage", handleStorage);
  setValue(read());
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("local-storage", handleStorage);
  };
};
