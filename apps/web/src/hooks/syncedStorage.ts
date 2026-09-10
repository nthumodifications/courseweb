export interface SyncedData<T> {
  value: T;
  /** Kept for compatibility with records written before updatedAt was added. */
  lastModified: number;
  updatedAt: number;
  deviceId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const hasSyncedMetadata = (
  value: unknown,
): value is SyncedData<unknown> =>
  isRecord(value) &&
  "value" in value &&
  isFiniteNumber(value.lastModified) &&
  isFiniteNumber(value.updatedAt) &&
  typeof value.deviceId === "string";

export const normalizeSyncedData = <T = unknown>(
  data: unknown,
  deviceId: string,
  now = Date.now(),
): SyncedData<T> => {
  if (isRecord(data) && "value" in data) {
    const lastModified = isFiniteNumber(data.lastModified)
      ? data.lastModified
      : isFiniteNumber(data.updatedAt)
        ? data.updatedAt
        : now;
    const updatedAt = isFiniteNumber(data.updatedAt)
      ? data.updatedAt
      : lastModified;

    return {
      value: data.value as T,
      lastModified: Math.max(lastModified, updatedAt),
      updatedAt,
      deviceId:
        typeof data.deviceId === "string" && data.deviceId.length > 0
          ? data.deviceId
          : deviceId,
    };
  }

  return {
    value: data as T,
    lastModified: now,
    updatedAt: now,
    deviceId,
  };
};

export const nextUpdatedAt = (previous: number, now = Date.now()) =>
  Math.max(now, previous + 1);

export const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export const mergeCourseStorage = <T extends Record<string, string[]>>(
  local: T,
  remote: T,
): T => {
  const merged: Record<string, string[]> = {};
  const semesters = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const semester of semesters) {
    merged[semester] = [
      ...new Set([...(local[semester] ?? []), ...(remote[semester] ?? [])]),
    ];
  }

  return merged as T;
};

export const mergeStringArray = (local: string[], remote: string[]) => [
  ...new Set([...local, ...remote]),
];
