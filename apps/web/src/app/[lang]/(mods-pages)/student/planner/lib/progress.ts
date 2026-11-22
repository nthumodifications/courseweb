export type EffectiveCourseStatus =
  | "completed"
  | "in-progress"
  | "planned"
  | "failed";

export interface ProgressItem {
  parent?: string | null;
  credits: number;
  semester?: string | null;
  status?: string | null;
}

export interface ProgressFolder {
  id: string;
  parent: string | null;
  min: number;
  max: number | null;
  metric: "credits" | "courses";
  requireChildValidation: boolean;
}

export interface RequirementProgress {
  done: number;
  inProgress: number;
  planned: number;
  min: number;
  max: number | null;
  remaining: number;
  unset: boolean;
  satisfied: boolean;
}

export interface OverallProgress {
  done: number;
  inProgress: number;
  planned: number;
  required: number;
  remaining: number;
}

const isCourseStatus = (
  status: string | null | undefined,
): status is EffectiveCourseStatus =>
  status === "completed" ||
  status === "in-progress" ||
  status === "planned" ||
  status === "failed";

/** Normalize legacy display-form semester IDs before comparing term order. */
export const normalizeSemesterId = (semester: string): string => {
  const displayId = semester.match(/^(\d{3})-([1-3])$/);
  return displayId ? `${displayId[1]}${displayId[2]}0` : semester;
};

/** Derive a course's display status from its semester, preserving failed as an override. */
export const effectiveStatus = (
  item: Pick<ProgressItem, "semester" | "status">,
  now: string,
): EffectiveCourseStatus => {
  if (item.status === "failed") return "failed";

  if (item.semester) {
    const semester = normalizeSemesterId(item.semester);
    const current = normalizeSemesterId(now);
    if (semester < current) return "completed";
    if (semester === current) return "in-progress";
    return "planned";
  }

  return isCourseStatus(item.status) ? item.status : "planned";
};

const measuredValue = (item: ProgressItem, metric: ProgressFolder["metric"]) =>
  metric === "courses" ? 1 : item.credits;

/** Calculate the overall credit progress used by the planner header. */
export const deriveOverallProgress = (
  items: ProgressItem[],
  now: string,
  required: number,
): OverallProgress => {
  const totals = { done: 0, inProgress: 0, planned: 0 };

  for (const item of items) {
    const status = effectiveStatus(item, now);
    if (status === "failed") continue;
    if (status === "completed") totals.done += item.credits;
    else if (status === "in-progress") totals.inProgress += item.credits;
    else totals.planned += item.credits;
  }

  return {
    ...totals,
    required,
    remaining: Math.max(
      0,
      required - totals.done - totals.inProgress - totals.planned,
    ),
  };
};

/**
 * Calculate every folder's requirement from its courses and descendants.
 * Parent requirements aggregate all child courses, while requireChildValidation
 * additionally requires every child folder's own requirement to be satisfied.
 */
export const deriveFolderProgress = (
  folders: ProgressFolder[],
  items: ProgressItem[],
  now: string,
): Map<string, RequirementProgress> => {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const childrenByParent = new Map<string, ProgressFolder[]>();
  for (const folder of folders) {
    if (folder.parent === null) continue;
    const children = childrenByParent.get(folder.parent) ?? [];
    children.push(folder);
    childrenByParent.set(folder.parent, children);
  }

  const results = new Map<string, RequirementProgress>();
  const visiting = new Set<string>();

  const derive = (folder: ProgressFolder): RequirementProgress => {
    const cached = results.get(folder.id);
    if (cached) return cached;

    // Guard malformed imported folder cycles without changing the stored data.
    if (visiting.has(folder.id)) {
      return {
        done: 0,
        inProgress: 0,
        planned: 0,
        min: folder.min,
        max: folder.max,
        remaining: Math.max(0, folder.min),
        unset: false,
        satisfied: false,
      };
    }

    visiting.add(folder.id);
    const descendantIds = new Set<string>([folder.id]);
    const collectChildren = (parentId: string) => {
      for (const child of childrenByParent.get(parentId) ?? []) {
        if (descendantIds.has(child.id)) continue;
        descendantIds.add(child.id);
        collectChildren(child.id);
      }
    };
    collectChildren(folder.id);

    let done = 0;
    let inProgress = 0;
    let planned = 0;
    for (const item of items) {
      if (!item.parent || !descendantIds.has(item.parent)) continue;
      const status = effectiveStatus(item, now);
      if (status === "failed") continue;
      const amount = measuredValue(item, folder.metric);
      if (status === "completed") done += amount;
      else if (status === "in-progress") inProgress += amount;
      else planned += amount;
    }

    const childFolders = childrenByParent.get(folder.id) ?? [];
    const noConfiguredMinimumOrMaximum =
      folder.min <= 0 && (folder.max == null || folder.max <= 0);
    const allChildrenUnset =
      childFolders.length > 0 &&
      childFolders.every((child) => derive(child).unset);
    const unset =
      noConfiguredMinimumOrMaximum &&
      (childFolders.length === 0 || allChildrenUnset);
    const remaining = unset
      ? 0
      : Math.max(0, folder.min - done - inProgress - planned);
    const childValidationPassed =
      !folder.requireChildValidation ||
      childFolders.every(
        (child) => derive(foldersById.get(child.id) ?? child).satisfied,
      );
    const progress = {
      done,
      inProgress,
      planned,
      min: folder.min,
      max: folder.max,
      remaining,
      unset,
      satisfied: !unset && remaining === 0 && childValidationPassed,
    };

    visiting.delete(folder.id);
    results.set(folder.id, progress);
    return progress;
  };

  for (const folder of folders) derive(folder);
  return results;
};
