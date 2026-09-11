import { scheduleTimeSlots } from "@courseweb/shared";
import {
  CustomTimetableItem,
  CustomTimetableSlot,
  CustomTimetableStorage,
} from "@/types/timetable";

export interface SyncedData<T> {
  value: T;
  /** Kept for compatibility with records written before updatedAt was added. */
  lastModified: number;
  updatedAt: number;
  deviceId: string;
}

export type MergeData<T> = (local: T, remote: T) => T;

export const ANONYMOUS_SYNCED_STORAGE_NAMESPACE = "nthumods-storage-anonymous";
const SYNCED_STORAGE_NAMESPACE_PREFIX = "nthumods-storage";

/**
 * Keep local synced-storage names aligned with the calendar database names:
 * anonymous data has an explicit namespace, while authenticated data uses a
 * stable subject-derived hash and never places the subject itself in a key.
 */
export const getSyncedStorageNamespace = (subject?: string | null) => {
  if (!subject) return ANONYMOUS_SYNCED_STORAGE_NAMESPACE;

  let firstHash = 2166136261;
  let secondHash = 2246822519;
  for (let index = 0; index < subject.length; index += 1) {
    const code = subject.charCodeAt(index);
    firstHash = Math.imul(firstHash ^ code, 16777619);
    secondHash = Math.imul(secondHash ^ (code + index), 16777619);
  }

  return `${SYNCED_STORAGE_NAMESPACE_PREFIX}-${(firstHash >>> 0)
    .toString(16)
    .padStart(8, "0")}${(secondHash >>> 0).toString(16).padStart(8, "0")}`;
};

export const getSyncedStorageKey = (key: string, subject?: string | null) =>
  `${getSyncedStorageNamespace(subject)}-${key}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const LEGACY_DAY_CODES = "MTWRFSU";
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isClockTime = (value: unknown): value is string =>
  typeof value === "string" && CLOCK_TIME_PATTERN.test(value);

const clockMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const isValidCustomSlot = (value: unknown): value is CustomTimetableSlot =>
  isRecord(value) &&
  isFiniteNumber(value.day) &&
  Number.isInteger(value.day) &&
  value.day >= 0 &&
  value.day <= 6 &&
  isClockTime(value.start) &&
  isClockTime(value.end) &&
  clockMinutes(value.end) > clockMinutes(value.start);

const legacyScheduleToSlots = (schedule: unknown): CustomTimetableSlot[] => {
  if (!Array.isArray(schedule)) return [];

  const slots: CustomTimetableSlot[] = [];
  for (const entry of schedule) {
    if (typeof entry !== "string") continue;
    const tokens = entry.match(/.{2}/g) ?? [];
    const byDay = new Map<number, number[]>();
    for (const token of tokens) {
      const day = LEGACY_DAY_CODES.indexOf(token[0] ?? "");
      const period = scheduleTimeSlots.findIndex(
        (timeSlot) => timeSlot.time === token[1],
      );
      if (day < 0 || period < 0) continue;
      const periods = byDay.get(day) ?? [];
      periods.push(period);
      byDay.set(day, periods);
    }

    for (const [day, periods] of byDay) {
      const sorted = [...new Set(periods)].sort((a, b) => a - b);
      let group: number[] = [];
      const flush = () => {
        if (group.length === 0) return;
        const first = scheduleTimeSlots[group[0]!];
        const last = scheduleTimeSlots[group[group.length - 1]!];
        if (first && last) {
          slots.push({ day, start: first.start, end: last.end });
        }
        group = [];
      };
      for (const period of sorted) {
        if (group.length > 0 && period !== group[group.length - 1]! + 1) {
          flush();
        }
        group.push(period);
      }
      flush();
    }
  }
  return slots;
};

/**
 * Converts the pre-freeform custom-item shape at the storage boundary. Valid
 * slots are retained; malformed slots/legacy entries are ignored. An item
 * with no convertible slots is omitted because it cannot be rendered safely.
 */
export const normalizeCustomTimetableItem = (
  value: unknown,
): CustomTimetableItem | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  const slots = Array.isArray(value.slots)
    ? value.slots.filter(isValidCustomSlot)
    : legacyScheduleToSlots(value.schedule);
  if (slots.length === 0) return null;

  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : "",
    ...(typeof value.shortCode === "string" && { shortCode: value.shortCode }),
    ...(typeof value.venue === "string" && { venue: value.venue }),
    ...(typeof value.note === "string" && { note: value.note }),
    color: typeof value.color === "string" ? value.color : "#555555",
    slots,
  };
};

/** Normalize local, synced, legacy URL, and legacy-share custom-item maps. */
export const normalizeCustomTimetableStorage = (
  value: unknown,
): CustomTimetableStorage => {
  if (!isRecord(value)) return {};
  const normalized: CustomTimetableStorage = {};
  for (const [semester, items] of Object.entries(value)) {
    if (!Array.isArray(items)) continue;
    const nextItems = items
      .map(normalizeCustomTimetableItem)
      .filter((item): item is CustomTimetableItem => item !== null);
    if (nextItems.length > 0) normalized[semester] = nextItems;
  }
  return normalized;
};

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

/**
 * Decode an old unscoped local record for the anonymous namespace. The caller
 * deliberately keeps the old key, so migration is recoverable and never
 * silently discards a user's pre-namespace data.
 */
export const migrateLegacySyncedData = <T = unknown>(
  legacyRaw: string | null,
  scopedRaw: string | null,
  deviceId: string,
  now = Date.now(),
): SyncedData<T> | null => {
  if (!legacyRaw || scopedRaw !== null) return null;

  try {
    return normalizeSyncedData<T>(JSON.parse(legacyRaw), deviceId, now);
  } catch {
    return null;
  }
};

export const nextUpdatedAt = (previous: number, now = Date.now()) =>
  Math.max(now, previous + 1);

export const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export interface SyncedUpload {
  merge: boolean;
}

export interface SyncedReconciliation<T> {
  data: SyncedData<T>;
  persistLocal: boolean;
  upload?: SyncedUpload;
}

/**
 * Reconcile one already identity-scoped local snapshot with its remote
 * snapshot. Keeping this decision pure makes the account-transition policy
 * testable without mounting the whole application provider.
 */
export const reconcileSyncedData = <T>(options: {
  local: SyncedData<T>;
  remote: SyncedData<T> | null;
  mergeData?: MergeData<T>;
  initial: boolean;
  deviceId: string;
  now?: number;
}): SyncedReconciliation<T> => {
  const {
    local,
    remote,
    mergeData,
    initial,
    deviceId,
    now = Date.now(),
  } = options;

  if (initial) {
    if (!remote) {
      return {
        data: local,
        persistLocal: false,
        ...(local.updatedAt >= 0 && { upload: { merge: Boolean(mergeData) } }),
      };
    }

    if (mergeData) {
      const mergedValue = mergeData(local.value, remote.value);
      if (valuesEqual(local.value, remote.value)) {
        return {
          data: local.updatedAt >= remote.updatedAt ? local : remote,
          persistLocal: true,
        };
      }
      if (valuesEqual(mergedValue, remote.value)) {
        return { data: remote, persistLocal: true };
      }

      const updatedAt = nextUpdatedAt(
        Math.max(local.updatedAt, remote.updatedAt),
        now,
      );
      const merged: SyncedData<T> = {
        value: mergedValue,
        updatedAt,
        lastModified: updatedAt,
        deviceId,
      };
      return {
        data: merged,
        persistLocal: true,
        upload: { merge: true },
      };
    }

    const localWins = local.updatedAt >= remote.updatedAt;
    return {
      data: localWins ? local : remote,
      persistLocal: true,
      ...(localWins && { upload: { merge: false } }),
    };
  }

  if (!remote) {
    return {
      data: local,
      persistLocal: false,
      ...(local.updatedAt >= 0 && { upload: { merge: false } }),
    };
  }
  if (local.updatedAt > remote.updatedAt) {
    return { data: local, persistLocal: false, upload: { merge: false } };
  }
  if (local.updatedAt < remote.updatedAt) {
    return { data: remote, persistLocal: true };
  }
  return { data: local, persistLocal: false };
};

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

export const mergeCustomTimetableStorage = <
  T extends Record<string, Array<{ id: string }>>,
>(
  local: T,
  remote: T,
): T => {
  const merged: Record<string, Array<{ id: string }>> = {};
  const semesters = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const semester of semesters) {
    const byId = new Map<string, { id: string }>();
    const remoteItems = Array.isArray(remote[semester]) ? remote[semester] : [];
    const localItems = Array.isArray(local[semester]) ? local[semester] : [];
    for (const item of remoteItems) byId.set(item.id, item);
    // Local values win when the same item was edited on this device.
    for (const item of localItems) byId.set(item.id, item);
    merged[semester] = [...byId.values()];
  }

  return merged as T;
};

export const mergeStringArray = (local: string[], remote: string[]) => [
  ...new Set([...local, ...remote]),
];
