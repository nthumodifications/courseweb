export const validKeys = [
  "courses",
  "course_favourites",
  "course_color_map",
  "timetable_display_preferences",
  "timetable-display-settings",
  "timetable_theme",
  "user_defined_colors",
  "timetable_custom_items",
  "grades",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

const safeJson = (value: unknown) => {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : undefined;
  } catch {
    return undefined;
  }
};

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const isPrimitive = (value: unknown) =>
  value === null || (typeof value !== "object" && typeof value !== "function");

const isNonEmpty = (value: unknown) =>
  (Array.isArray(value) && value.length > 0) ||
  (isPlainRecord(value) && Object.keys(value).length > 0) ||
  (isPrimitive(value) && value !== null && value !== undefined);

const hasSameId = (
  previousEntry: Record<string, unknown>,
  nextEntry: Record<string, unknown>,
) => {
  if (!hasOwn(previousEntry, "id") || !hasOwn(nextEntry, "id")) return false;
  const previousId = safeJson(previousEntry["id"]);
  const nextId = safeJson(nextEntry["id"]);
  return previousId !== undefined && previousId === nextId;
};

const matchesArrayEntry = (previousEntry: unknown, nextEntry: unknown) => {
  if (isPrimitive(previousEntry) || isPrimitive(nextEntry)) {
    return (
      isPrimitive(previousEntry) &&
      isPrimitive(nextEntry) &&
      Object.is(previousEntry, nextEntry)
    );
  }

  if (isPlainRecord(previousEntry) && isPlainRecord(nextEntry)) {
    if (hasOwn(previousEntry, "id") && hasOwn(nextEntry, "id")) {
      return hasSameId(previousEntry, nextEntry);
    }
    return safeJson(previousEntry) === safeJson(nextEntry);
  }

  return false;
};

const losesSyncedDataAtDepth = (
  previousValue: unknown,
  nextValue: unknown,
  depth: number,
): boolean => {
  if (depth > 8) return false;

  if (Array.isArray(previousValue)) {
    if (previousValue.length === 0) return false;
    if (!Array.isArray(nextValue)) return true;

    const matchedIndexes = new Set<number>();
    for (const previousEntry of previousValue) {
      const nextIndex = nextValue.findIndex(
        (nextEntry, index) =>
          !matchedIndexes.has(index) &&
          matchesArrayEntry(previousEntry, nextEntry),
      );
      if (nextIndex < 0) return true;
      matchedIndexes.add(nextIndex);

      if (
        isPlainRecord(previousEntry) &&
        isPlainRecord(nextValue[nextIndex]) &&
        hasSameId(previousEntry, nextValue[nextIndex]) &&
        losesSyncedDataAtDepth(previousEntry, nextValue[nextIndex], depth + 1)
      ) {
        return true;
      }
    }
    return false;
  }

  if (!isPlainRecord(previousValue)) return false;
  if (Object.keys(previousValue).length === 0) return false;
  if (!isPlainRecord(nextValue)) return true;

  for (const key of Object.keys(previousValue)) {
    const previousChild = previousValue[key];
    if (!hasOwn(nextValue, key)) {
      if (isNonEmpty(previousChild)) return true;
      continue;
    }
    if (losesSyncedDataAtDepth(previousChild, nextValue[key], depth + 1)) {
      return true;
    }
  }
  return false;
};

/** Returns whether replacing a synced value would remove recoverable user data. */
export const losesSyncedData = (
  previousValue: unknown,
  nextValue: unknown,
): boolean => {
  try {
    return losesSyncedDataAtDepth(previousValue, nextValue, 0);
  } catch {
    return false;
  }
};

const mergeStringArrays = (current: unknown, incoming: unknown) => [
  ...new Set([
    ...(Array.isArray(current)
      ? current.filter((value): value is string => typeof value === "string")
      : []),
    ...(Array.isArray(incoming)
      ? incoming.filter((value): value is string => typeof value === "string")
      : []),
  ]),
];

const mergeCourseStorage = (current: unknown, incoming: unknown) => {
  const currentStorage = isRecord(current) ? current : {};
  const incomingStorage = isRecord(incoming) ? incoming : {};
  const merged: Record<string, string[]> = {};

  for (const semester of new Set([
    ...Object.keys(currentStorage),
    ...Object.keys(incomingStorage),
  ])) {
    merged[semester] = mergeStringArrays(
      currentStorage[semester],
      incomingStorage[semester],
    );
  }

  return merged;
};

const mergeCustomTimetableStorage = (current: unknown, incoming: unknown) => {
  const currentStorage = isRecord(current) ? current : {};
  const incomingStorage = isRecord(incoming) ? incoming : {};
  const merged: Record<string, unknown[]> = {};

  for (const semester of new Set([
    ...Object.keys(currentStorage),
    ...Object.keys(incomingStorage),
  ])) {
    const byId = new Map<string, unknown>();
    const addItems = (value: unknown) => {
      if (!Array.isArray(value)) return;
      for (const item of value) {
        if (isRecord(item) && typeof item["id"] === "string") {
          byId.set(item["id"], item);
        }
      }
    };

    // Incoming values win for an edited item, matching the web merge helper.
    addItems(currentStorage[semester]);
    addItems(incomingStorage[semester]);
    merged[semester] = [...byId.values()];
  }

  return merged;
};

export const mergeSyncedValue = (
  key: string,
  current: unknown,
  incoming: unknown,
) => {
  if (key === "courses") return mergeCourseStorage(current, incoming);
  if (key === "timetable_custom_items") {
    return mergeCustomTimetableStorage(current, incoming);
  }
  if (key === "course_favourites") {
    return mergeStringArrays(current, incoming);
  }
  return incoming;
};
