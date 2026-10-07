import { semesterInfo } from "@courseweb/shared";
import type { CourseDefinition } from "@/config/supabase";

// Loaded on demand so the pure helpers in this file can be imported (and
// tested) without a configured Supabase client.
const loadSupabase = async () => (await import("@/config/supabase")).default;

type ModuleOfferingRow = Pick<
  CourseDefinition,
  | "raw_id"
  | "semester"
  | "department"
  | "course"
  | "class"
  | "name_zh"
  | "name_en"
  | "credits"
  | "language"
  | "teacher_zh"
  | "teacher_en"
  | "times"
  | "venues"
  | "capacity"
  | "enrolled"
>;

const MODULE_OFFERING_SELECT =
  "raw_id, semester, department, course, class, name_zh, name_en, credits, language, teacher_zh, teacher_en, times, venues, capacity, enrolled";

type SemesterTerm = "fall" | "spring" | "summer";

type ParsedModuleKey = {
  department: string;
  course: string;
};

export interface ModuleOffering extends ModuleOfferingRow {
  semester: string;
  department: string;
  course: string;
}

export interface ModuleHistory {
  semester: string;
  academicYear: string;
  term: SemesterTerm;
  offerings: ModuleOffering[];
}

interface ModuleTitle {
  nameZh: string;
  nameEn: string;
}

export interface ModuleVariant {
  titleKey: string;
  titleKeys: string[];
  nameZh: string;
  nameEn: string;
  titles: ModuleTitle[];
  offerings: ModuleOffering[];
  semesters: string[];
  history: ModuleHistory[];
  credits: number[];
  mergedRename: boolean;
}

interface ModuleInstructorSummary {
  key: string;
  nameZh: string;
  nameEn: string;
  semesterCount: number;
  latestSemester: string;
}

export interface ModuleAggregate {
  key: string;
  department: string;
  course: string;
  offerings: ModuleOffering[];
  variants: ModuleVariant[];
}

type ModuleHistoryRow = Pick<
  CourseDefinition,
  "semester" | "department" | "course" | "name_zh" | "name_en" | "credits"
>;

type ModuleSearchRow = Pick<
  CourseDefinition,
  | "raw_id"
  | "semester"
  | "department"
  | "course"
  | "name_zh"
  | "name_en"
  | "credits"
  | "teacher_zh"
  | "teacher_en"
>;

interface ModuleHistoryVariant {
  titleKey: string;
  titleKeys: string[];
  nameZh: string;
  nameEn: string;
  titles: ModuleTitle[];
  semesters: string[];
  credits: number[];
  mergedRename: boolean;
}

interface ModuleHistoryAggregate {
  key: string;
  department: string;
  course: string;
  variants: ModuleHistoryVariant[];
}

interface ModuleSearchInstructor {
  nameZh: string;
  nameEn: string;
}

export interface ModuleSearchResult {
  key: string;
  department: string;
  course: string;
  titleKey: string;
  nameZh: string;
  nameEn: string;
  semesters: string[];
  credits: number[];
  latestSemester: string;
  instructors: ModuleSearchInstructor[];
}

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

/**
 * Titles are grouped by the Chinese name. NFKC handles full/half-width text;
 * the punctuation map and trailing trim avoid treating editorial punctuation
 * as a new course title.
 */
export const normalizeCourseTitle = (value: string) => {
  const normalized = normalizePart(value)
    .replace(/[，,]/g, ",")
    .replace(/[。．.]/g, ".")
    .replace(/[：:]/g, ":")
    .replace(/[；;]/g, ";")
    .replace(/[！!]/g, "!")
    .replace(/[？?]/g, "?");

  let end = normalized.length;
  while (end > 0 && ".,;:!?".includes(normalized[end - 1])) end -= 1;
  return normalized.slice(0, end).trim();
};

export const createModuleKey = (department: string, course: string) => {
  const normalizedDepartment = normalizePart(department);
  const normalizedCourse = normalizePart(course).replace(/\s+/g, "");

  if (!normalizedDepartment || !normalizedCourse) {
    throw new Error("A module key needs both department and course");
  }

  return `${normalizedDepartment}:${normalizedCourse}`;
};

export const parseModuleKey = (value: string): ParsedModuleKey | null => {
  const separator = value.indexOf(":");
  if (separator < 1 || separator === value.length - 1) return null;

  const department = normalizePart(value.slice(0, separator));
  const course = normalizePart(value.slice(separator + 1)).replace(/\s+/g, "");
  return department && course ? { department, course } : null;
};

export const getSemesterTerm = (semester: string): SemesterTerm | null => {
  const value = String(semester);
  if (!/^\d{5}$/.test(value)) return null;

  switch (value[3]) {
    case "1":
      return "fall";
    case "2":
      return "spring";
    case "3":
      return "summer";
    default:
      return null;
  }
};

const semesterSortValue = (semester: string) => {
  const value = String(semester);
  const term = getSemesterTerm(value);
  return term
    ? Number(value.slice(0, 3)) * 3 + ["fall", "spring", "summer"].indexOf(term)
    : Number.MAX_SAFE_INTEGER;
};

const compareOfferings = (left: ModuleOffering, right: ModuleOffering) => {
  const semesterDifference =
    semesterSortValue(left.semester) - semesterSortValue(right.semester);
  if (semesterDifference !== 0) return semesterDifference;

  const classDifference = Number(left.class) - Number(right.class);
  return Number.isNaN(classDifference)
    ? left.class.localeCompare(right.class)
    : classDifference || left.raw_id.localeCompare(right.raw_id);
};

const normalizeModuleRow = <
  T extends { semester: unknown; department: string; course: string },
>(
  row: T,
) => ({
  ...row,
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
});

const normalizeOffering = (row: ModuleOfferingRow): ModuleOffering =>
  normalizeModuleRow(row);

const buildHistory = (offerings: ModuleOffering[]) => {
  const history = new Map<string, ModuleHistory>();

  for (const offering of offerings) {
    const term = getSemesterTerm(offering.semester);
    if (!term) continue;

    const current = history.get(offering.semester) ?? {
      semester: offering.semester,
      academicYear: offering.semester.slice(0, 3),
      term,
      offerings: [],
    };
    current.offerings.push(offering);
    history.set(offering.semester, current);
  }

  return [...history.values()].sort(
    (left, right) =>
      semesterSortValue(left.semester) - semesterSortValue(right.semester),
  );
};

const distinctTitles = (offerings: ModuleOffering[]) => {
  const titles = new Map<string, ModuleTitle>();
  for (const offering of [...offerings].sort(compareOfferings)) {
    titles.set(normalizeCourseTitle(offering.name_zh), {
      nameZh: offering.name_zh,
      nameEn: offering.name_en,
    });
  }
  return [...titles.values()];
};

const makeVariant = (
  titleKeys: string[],
  offerings: ModuleOffering[],
  mergedRename: boolean,
): ModuleVariant => {
  const sortedOfferings = [...offerings].sort(compareOfferings);
  const latestOffering = sortedOfferings.at(-1)!;
  const history = buildHistory(sortedOfferings);

  return {
    titleKey: titleKeys.at(-1)!,
    titleKeys,
    nameZh: latestOffering.name_zh,
    nameEn: latestOffering.name_en,
    titles: distinctTitles(sortedOfferings),
    offerings: sortedOfferings,
    semesters: history.map((item) => item.semester),
    history,
    credits: [
      ...new Set(sortedOfferings.map((offering) => offering.credits)),
    ].sort((left, right) => left - right),
    mergedRename,
  };
};

const distinctHistoryTitles = (rows: ModuleHistoryRow[]) => {
  const titles = new Map<string, ModuleTitle>();
  for (const row of rows) {
    titles.set(normalizeCourseTitle(row.name_zh), {
      nameZh: row.name_zh,
      nameEn: row.name_en,
    });
  }
  return [...titles.values()];
};

const normalizeHistoryRow = (row: ModuleHistoryRow): ModuleHistoryRow =>
  normalizeModuleRow(row);

const makeHistoryVariant = (
  titleKeys: string[],
  rows: ModuleHistoryRow[],
  mergedRename: boolean,
): ModuleHistoryVariant => {
  const sortedRows = [...rows].sort(
    (left, right) =>
      semesterSortValue(String(left.semester)) -
      semesterSortValue(String(right.semester)),
  );
  const latestRow = sortedRows.at(-1)!;
  const semesters = [
    ...new Set(sortedRows.map((row) => String(row.semester))),
  ].sort((left, right) => semesterSortValue(left) - semesterSortValue(right));

  return {
    titleKey: titleKeys.at(-1)!,
    titleKeys,
    nameZh: latestRow.name_zh,
    nameEn: latestRow.name_en,
    titles: distinctHistoryTitles(sortedRows),
    semesters,
    credits: [...new Set(sortedRows.map((row) => row.credits))].sort(
      (left, right) => left - right,
    ),
    mergedRename,
  };
};

const titleWithoutPunctuation = (title: string) =>
  normalizeCourseTitle(title)
    .replace(/[\p{P}\p{S}\d]/gu, "")
    .toLocaleLowerCase();

const hasSharedTitleStem = (left: string, right: string) => {
  const leftText = titleWithoutPunctuation(left);
  const rightText = titleWithoutPunctuation(right);
  for (let index = 0; index <= leftText.length - 3; index += 1) {
    if (rightText.includes(leftText.slice(index, index + 3))) return true;
  }
  return false;
};

const sequenceSuffix = (title: string) =>
  /[一二三四五六七八九十ⅠⅡⅢⅣⅤAB]$/u.exec(titleWithoutPunctuation(title))?.[0];

const haveConflictingSequenceSuffixes = (left: string, right: string) => {
  const leftSuffix = sequenceSuffix(left);
  const rightSuffix = sequenceSuffix(right);
  return Boolean(leftSuffix && rightSuffix && leftSuffix !== rightSuffix);
};

const areAdjacentKnownSemesters = (before: string, after: string) => {
  const beforeIndex = semesterInfo.findIndex((item) => item.id === before);
  const afterIndex = semesterInfo.findIndex((item) => item.id === after);
  if (beforeIndex >= 0 && afterIndex >= 0) {
    return afterIndex - beforeIndex === 1;
  }
  return semesterSortValue(after) - semesterSortValue(before) === 1;
};

/**
 * A title handoff is merged only when the live data gives a conservative
 * rename signal: exactly two title variants, equal credits, at least two
 * semesters on each side, adjacent semester ranges, and a shared title stem.
 * Reused seminar/topic numbers otherwise remain separate variants.
 */
type RenameComparable = Pick<ModuleVariant, "nameZh" | "semesters" | "credits">;

const areSameCredits = (left: RenameComparable, right: RenameComparable) =>
  left.credits.length === right.credits.length &&
  left.credits.every((credit) => right.credits.includes(credit));

const canMergeRename = (left: RenameComparable, right: RenameComparable) => {
  if (!areSameCredits(left, right)) return false;

  const leftLast = left.semesters.at(-1)!;
  const rightLast = right.semesters.at(-1)!;
  const [before, after] =
    semesterSortValue(leftLast) <= semesterSortValue(rightLast)
      ? [left, right]
      : [right, left];
  const beforeLast = before.semesters.at(-1)!;
  const afterFirst = after.semesters[0];
  const hasOverlap = before.semesters.some((semester) =>
    after.semesters.includes(semester),
  );

  return (
    before.semesters.length >= 2 &&
    after.semesters.length >= 2 &&
    !hasOverlap &&
    areAdjacentKnownSemesters(beforeLast, afterFirst) &&
    hasSharedTitleStem(before.nameZh, after.nameZh) &&
    !haveConflictingSequenceSuffixes(before.nameZh, after.nameZh)
  );
};

const mergeRenameVariants = (variants: ModuleVariant[]) => {
  if (variants.length !== 2 || !canMergeRename(variants[0], variants[1])) {
    return variants;
  }

  const offerings = [...variants[0].offerings, ...variants[1].offerings];
  const titleKeys = [
    ...new Set(variants.flatMap((variant) => variant.titleKeys)),
  ];
  return [makeVariant(titleKeys, offerings, true)];
};

export const aggregateModuleHistoryRows = (
  rows: readonly ModuleHistoryRow[],
): ModuleHistoryAggregate | null => {
  const normalizedRows = rows
    .map(normalizeHistoryRow)
    .filter((row) => getSemesterTerm(row.semester));
  if (normalizedRows.length === 0) return null;

  const first = normalizedRows[0];
  const rowsByTitle = new Map<string, ModuleHistoryRow[]>();
  for (const row of normalizedRows) {
    const titleKey = normalizeCourseTitle(row.name_zh);
    const current = rowsByTitle.get(titleKey) ?? [];
    current.push(row);
    rowsByTitle.set(titleKey, current);
  }

  const variants = [...rowsByTitle.entries()].map(([titleKey, items]) =>
    makeHistoryVariant([titleKey], items, false),
  );
  const mergedVariants =
    variants.length === 2 && canMergeRename(variants[0], variants[1])
      ? [
          makeHistoryVariant(
            [...new Set(variants.flatMap((variant) => variant.titleKeys))],
            normalizedRows,
            true,
          ),
        ]
      : variants;

  return {
    key: createModuleKey(first.department, first.course),
    department: first.department,
    course: first.course,
    variants: [...mergedVariants].sort(variantSort),
  };
};

const variantSort = (
  left: Pick<ModuleVariant, "semesters">,
  right: Pick<ModuleVariant, "semesters">,
) =>
  semesterSortValue(right.semesters.at(-1)!) -
  semesterSortValue(left.semesters.at(-1)!);

export const aggregateModuleOfferings = (
  rows: readonly ModuleOfferingRow[],
): ModuleAggregate | null => {
  const offerings = rows
    .map(normalizeOffering)
    .filter((offering) => getSemesterTerm(offering.semester))
    .sort(compareOfferings);
  if (offerings.length === 0) return null;

  const first = offerings[0];
  const variantsByTitle = new Map<string, ModuleOffering[]>();
  for (const offering of offerings) {
    const titleKey = normalizeCourseTitle(offering.name_zh);
    const current = variantsByTitle.get(titleKey) ?? [];
    current.push(offering);
    variantsByTitle.set(titleKey, current);
  }

  const variants = [...variantsByTitle.entries()].map(([titleKey, items]) =>
    makeVariant([titleKey], items, false),
  );
  const mergedVariants = mergeRenameVariants(variants).sort(variantSort);

  return {
    key: createModuleKey(first.department, first.course),
    department: first.department,
    course: first.course,
    offerings,
    variants: mergedVariants,
  };
};

const selectModuleVariant = <
  T extends { titleKeys: string[]; semesters: string[] },
>(
  variants: readonly T[],
  title?: string | null,
) => {
  const sortedVariants = [...variants].sort(variantSort);
  if (!title) return sortedVariants[0];

  const titleKey = normalizeCourseTitle(title);
  return (
    sortedVariants.find((variant) => variant.titleKeys.includes(titleKey)) ??
    sortedVariants[0]
  );
};

export const getModuleVariant = (
  module: ModuleAggregate,
  title?: string | null,
) => selectModuleVariant(module.variants, title);

export const getModuleHistoryVariant = (
  module: ModuleHistoryAggregate,
  title?: string | null,
) => selectModuleVariant(module.variants, title);

export const getModuleInstructorSummaries = (variant: ModuleVariant) => {
  const instructors = new Map<
    string,
    ModuleInstructorSummary & { semesters: Set<string> }
  >();

  for (const offering of variant.offerings) {
    const teacherZh = offering.teacher_zh ?? [];
    const teacherEn = offering.teacher_en ?? [];
    const count = Math.max(teacherZh.length, teacherEn.length);

    for (let index = 0; index < count; index += 1) {
      const nameZh = teacherZh[index] ?? "";
      const nameEn = teacherEn[index] ?? nameZh;
      const key = nameZh || nameEn;
      if (!key) continue;

      const current = instructors.get(key) ?? {
        key,
        nameZh,
        nameEn,
        semesterCount: 0,
        latestSemester: offering.semester,
        semesters: new Set<string>(),
      };
      current.semesters.add(offering.semester);
      current.semesterCount = current.semesters.size;
      if (
        semesterSortValue(offering.semester) >
        semesterSortValue(current.latestSemester)
      ) {
        current.latestSemester = offering.semester;
      }
      instructors.set(key, current);
    }
  }

  return [...instructors.values()]
    .map(({ semesters: _semesters, ...summary }) => summary)
    .sort((left, right) => {
      if (right.semesterCount !== left.semesterCount) {
        return right.semesterCount - left.semesterCount;
      }
      const latestDifference =
        semesterSortValue(right.latestSemester) -
        semesterSortValue(left.latestSemester);
      return latestDifference || left.nameZh.localeCompare(right.nameZh);
    });
};

export const getModuleOfferings = async (moduleKey: string) => {
  const parsed = parseModuleKey(moduleKey);
  if (!parsed) throw new Error("Invalid module key");

  const { data, error } = await (await loadSupabase())
    .from("courses")
    .select(MODULE_OFFERING_SELECT)
    .eq("department", parsed.department)
    .eq("course", parsed.course)
    .order("semester", { ascending: true })
    .order("raw_id", { ascending: true });

  if (error) throw error;
  return aggregateModuleOfferings(
    (data ?? []) as unknown as ModuleOfferingRow[],
  );
};

const MODULE_HISTORY_SELECT =
  "semester, department, course, name_zh, name_en, credits";

export const getModuleHistory = async (moduleKey: string) => {
  const parsed = parseModuleKey(moduleKey);
  if (!parsed) throw new Error("Invalid module key");

  const { data, error } = await (await loadSupabase())
    .from("courses")
    .select(MODULE_HISTORY_SELECT)
    .eq("department", parsed.department)
    .eq("course", parsed.course)
    .order("semester", { ascending: true });

  if (error) throw error;
  return aggregateModuleHistoryRows(
    (data ?? []) as unknown as ModuleHistoryRow[],
  );
};

const MODULE_SEARCH_SELECT =
  "raw_id, semester, department, course, name_zh, name_en, credits, teacher_zh, teacher_en";

const MODULE_SEARCH_ROW_LIMIT = 500;

const normalizeSearchRow = (row: ModuleSearchRow): ModuleSearchRow => ({
  ...row,
  raw_id: String(row.raw_id),
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
});

const getSearchInstructors = (
  rows: readonly ModuleSearchRow[],
  latestSemester: string,
  titleKeys: readonly string[],
) => {
  const instructors = new Map<string, ModuleSearchInstructor>();
  for (const row of rows) {
    if (
      row.semester !== latestSemester ||
      !titleKeys.includes(normalizeCourseTitle(row.name_zh))
    ) {
      continue;
    }
    const teacherZh = row.teacher_zh ?? [];
    const teacherEn = row.teacher_en ?? [];
    const count = Math.max(teacherZh.length, teacherEn.length);
    for (let index = 0; index < count; index += 1) {
      const nameZh = teacherZh[index] ?? "";
      const nameEn = teacherEn[index] ?? nameZh;
      const key = nameZh || nameEn;
      if (key && !instructors.has(key)) {
        instructors.set(key, { nameZh, nameEn });
      }
    }
  }
  return [...instructors.values()];
};

export const aggregateModuleSearchRows = (
  rows: readonly ModuleSearchRow[],
): ModuleSearchResult[] => {
  const rowsByModule = new Map<string, ModuleSearchRow[]>();
  for (const row of rows.map(normalizeSearchRow)) {
    if (!getSemesterTerm(row.semester)) continue;
    const key = createModuleKey(row.department, row.course);
    const current = rowsByModule.get(key) ?? [];
    current.push(row);
    rowsByModule.set(key, current);
  }

  return [...rowsByModule.values()].flatMap((moduleRows) => {
    const history = aggregateModuleHistoryRows(moduleRows);
    if (!history) return [];

    return history.variants.map((variant) => ({
      key: history.key,
      department: history.department,
      course: history.course,
      titleKey: variant.titleKey,
      nameZh: variant.nameZh,
      nameEn: variant.nameEn,
      semesters: variant.semesters,
      credits: variant.credits,
      latestSemester: variant.semesters.at(-1)!,
      instructors: getSearchInstructors(
        moduleRows,
        variant.semesters.at(-1)!,
        variant.titleKeys,
      ),
    }));
  });
};

const normalizeCodeQuery = (value: string) =>
  normalizePart(value)
    .replace(/[\s:./_-]+/g, "")
    .toLocaleUpperCase();

export const rankModuleSearchResults = (
  results: readonly ModuleSearchResult[],
  keyword: string,
) => {
  const queryCode = normalizeCodeQuery(keyword);
  return [...results].sort((left, right) => {
    const leftExact =
      normalizeCodeQuery(`${left.department}${left.course}`) === queryCode;
    const rightExact =
      normalizeCodeQuery(`${right.department}${right.course}`) === queryCode;
    if (leftExact !== rightExact) return leftExact ? -1 : 1;

    const latestDifference =
      semesterSortValue(right.latestSemester) -
      semesterSortValue(left.latestSemester);
    if (latestDifference !== 0) return latestDifference;

    return (
      left.key.localeCompare(right.key) ||
      left.titleKey.localeCompare(right.titleKey)
    );
  });
};

export const searchModules = async (keyword: string, signal?: AbortSignal) => {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return [];

  const supabase = await loadSupabase();
  let request = supabase
    .rpc("search_courses", { keyword: trimmedKeyword })
    .select(MODULE_SEARCH_SELECT)
    .order("semester", { ascending: false })
    .limit(MODULE_SEARCH_ROW_LIMIT);
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) throw error;

  return rankModuleSearchResults(
    aggregateModuleSearchRows((data ?? []) as unknown as ModuleSearchRow[]),
    trimmedKeyword,
  );
};
