export type CourseSearchView = "list" | "table" | "grid";

export const COURSE_SEARCH_VIEW_KEY = "courseSearchView";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const isCourseSearchView = (value: string | null): value is CourseSearchView =>
  value === "list" || value === "table" || value === "grid";

// Every visit starts in List; the choice only lasts for this tab's session so
// opening a course and coming back keeps it.
const browserStorage = (): StorageLike | undefined => {
  try {
    if (typeof window === "undefined") return undefined;
    // Earlier builds remembered the view across visits; drop that.
    window.localStorage.removeItem(COURSE_SEARCH_VIEW_KEY);
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export const readCourseSearchView = (
  storage: StorageLike | undefined = browserStorage(),
): CourseSearchView => {
  try {
    const stored = storage?.getItem(COURSE_SEARCH_VIEW_KEY) ?? null;
    return isCourseSearchView(stored) ? stored : "list";
  } catch {
    return "list";
  }
};

export const writeCourseSearchView = (
  view: CourseSearchView,
  storage: StorageLike | undefined = browserStorage(),
) => {
  try {
    storage?.setItem(COURSE_SEARCH_VIEW_KEY, view);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
};

export const resolveCourseSearchView = (
  view: CourseSearchView,
  isPhone: boolean,
): CourseSearchView => (isPhone && view === "table" ? "list" : view);

export const countActiveRefinementValues = (
  items: readonly { isRefined: boolean }[],
) => items.reduce((count, item) => count + Number(item.isRefined), 0);

export const hasCourseSearchRefinements = (uiState: {
  refinementList?: Record<string, unknown>;
  hierarchicalMenu?: Record<string, unknown>;
  menu?: Record<string, unknown>;
  toggle?: Record<string, unknown>;
  numericMenu?: Record<string, unknown>;
  range?: Record<string, unknown>;
  configure?: { filters?: unknown };
}) => {
  const hasRefinementValues = [
    ...Object.entries(uiState.refinementList ?? {}),
    ...Object.entries(uiState.hierarchicalMenu ?? {}),
  ].some(([attribute, value]) => {
    if (attribute === "semester") return false;
    return Array.isArray(value)
      ? value.length > 0
      : value != null && value !== "";
  });

  const hasMenuRefinement = [uiState.menu, uiState.toggle, uiState.numericMenu]
    .filter((value): value is Record<string, unknown> => Boolean(value))
    .some((refinements) =>
      Object.entries(refinements).some(
        ([attribute, value]) => attribute !== "semester" && value != null,
      ),
    );

  return (
    hasRefinementValues ||
    hasMenuRefinement ||
    Object.values(uiState.range ?? {}).some(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) ||
    (typeof uiState.configure?.filters === "string" &&
      uiState.configure.filters.trim().length > 0)
  );
};
