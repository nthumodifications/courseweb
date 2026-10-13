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
