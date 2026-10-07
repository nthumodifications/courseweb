import { lastSemester, semesterInfo } from "@courseweb/shared";
import supabase, { CourseDefinition } from "@/config/supabase";

export type ModuleOfferingRow = Pick<
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

export const MODULE_OFFERING_SELECT =
  "raw_id, semester, department, course, class, name_zh, name_en, credits, language, teacher_zh, teacher_en, times, venues, capacity, enrolled";

export type SemesterTerm = "fall" | "spring" | "summer";

export type OfferingPattern =
  | "none"
  | "fall_only"
  | "spring_only"
  | "summer_only"
  | "fall_spring"
  | "fall_summer"
  | "spring_summer"
  | "every_semester";

export interface ParsedModuleKey {
  department: string;
  course: string;
}

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

export interface ModuleTitle {
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

export interface ModuleAggregate {
  key: string;
  department: string;
  course: string;
  offerings: ModuleOffering[];
  variants: ModuleVariant[];
}

export type ModuleHistoryRow = Pick<
  CourseDefinition,
  "semester" | "department" | "course" | "name_zh" | "name_en" | "credits"
>;

export interface ModuleHistoryVariant {
  titleKey: string;
  titleKeys: string[];
  nameZh: string;
  nameEn: string;
  titles: ModuleTitle[];
  semesters: string[];
  credits: number[];
  mergedRename: boolean;
}

export interface ModuleHistoryAggregate {
  key: string;
  department: string;
  course: string;
  variants: ModuleHistoryVariant[];
}

export type OfferingPrediction =
  | { kind: "next"; semester: string; term: SemesterTerm }
  | { kind: "stopped"; semester: string; term: SemesterTerm };

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

  return normalized.replace(/[.,;:!?]+$/g, "").trim();
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

const normalizeOffering = (row: ModuleOfferingRow): ModuleOffering => ({
  ...row,
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
});

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
    titleKey: titleKeys[titleKeys.length - 1],
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

const normalizeHistoryRow = (row: ModuleHistoryRow): ModuleHistoryRow => ({
  ...row,
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
});

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
    titleKey: titleKeys[titleKeys.length - 1],
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
  titleWithoutPunctuation(title).match(/[一二三四五六七八九十ⅠⅡⅢⅣⅤAB]$/u)?.[0];

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

export const mergeRenameVariants = (variants: ModuleVariant[]) => {
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
    variants: mergedVariants.sort(variantSort),
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

export const getModuleVariant = (
  module: ModuleAggregate,
  title?: string | null,
) => {
  const variants = [...module.variants].sort(variantSort);
  if (!title) return variants[0];

  const titleKey = normalizeCourseTitle(title);
  return (
    variants.find((variant) => variant.titleKeys.includes(titleKey)) ??
    variants[0]
  );
};

export const getModuleHistoryVariant = (
  module: ModuleHistoryAggregate,
  title?: string | null,
) => {
  const variants = [...module.variants].sort(variantSort);
  if (!title) return variants[0];

  const titleKey = normalizeCourseTitle(title);
  return (
    variants.find((variant) => variant.titleKeys.includes(titleKey)) ??
    variants[0]
  );
};

export const getAvailableTerms = (variant: ModuleVariant) =>
  (["fall", "spring", "summer"] as SemesterTerm[]).filter((term) =>
    variant.history.some((item) => item.term === term),
  );

export const getOfferingPattern = (
  semesters: readonly string[],
): OfferingPattern => {
  const terms = new Set(semesters.map(getSemesterTerm).filter(Boolean));
  const has = (term: SemesterTerm) => terms.has(term);

  if (terms.size === 0) return "none";
  if (terms.size === 3) return "every_semester";
  if (terms.size === 1) {
    if (has("fall")) return "fall_only";
    if (has("spring")) return "spring_only";
    return "summer_only";
  }
  if (has("fall") && has("spring")) return "fall_spring";
  if (has("fall") && has("summer")) return "fall_summer";
  return "spring_summer";
};

const semesterFromYearAndTerm = (year: number, term: SemesterTerm) =>
  `${year}${term === "fall" ? "10" : term === "spring" ? "20" : "30"}`;

const getRegularYearStep = (semesters: string[], term: SemesterTerm) => {
  const years = semesters
    .filter((semester) => getSemesterTerm(semester) === term)
    .map((semester) => Number(semester.slice(0, 3)))
    .filter((year, index, all) => all.indexOf(year) === index)
    .sort((left, right) => left - right);
  if (years.length < 2) return null;

  const steps = years.slice(1).map((year, index) => year - years[index]);
  return steps.every((step) => step === steps[0]) ? steps[0] : null;
};

/**
 * Predict from the newest semester known to the site, not from the course's
 * last row. Two or more missed expected slots are reported as stopped;
 * one missed slot remains eligible for the next scheduled offering.
 */
export const inferNextOffering = (
  semesters: readonly string[],
  latestKnownSemester = lastSemester.id,
): OfferingPrediction | null => {
  const observed = [...new Set(semesters.map(String))]
    .filter((semester) => getSemesterTerm(semester))
    .sort((left, right) => semesterSortValue(left) - semesterSortValue(right));
  if (observed.length < 2) return null;

  const terms = ["fall", "spring", "summer"].filter((term) =>
    observed.some((semester) => getSemesterTerm(semester) === term),
  ) as SemesterTerm[];
  const schedules = terms.map((term) => {
    const step = getRegularYearStep(observed, term);
    if (!step) return null;

    const termSemesters = observed.filter(
      (semester) => getSemesterTerm(semester) === term,
    );
    const lastYear = Number(termSemesters.at(-1)!.slice(0, 3));
    const observedSet = new Set(termSemesters);
    const newestObserved = observed.at(-1)!;
    const boundary = Math.max(
      semesterSortValue(latestKnownSemester),
      semesterSortValue(newestObserved),
    );
    const missed: string[] = [];
    for (
      let year = lastYear + step;
      semesterSortValue(semesterFromYearAndTerm(year, term)) <= boundary;
      year += step
    ) {
      const expected = semesterFromYearAndTerm(year, term);
      if (!observedSet.has(expected)) missed.push(expected);
    }

    return {
      term,
      missed,
      next: semesterFromYearAndTerm(lastYear + step, term),
    };
  });

  if (schedules.some((schedule) => schedule === null)) return null;
  const validSchedules = schedules as Array<{
    term: SemesterTerm;
    missed: string[];
    next: string;
  }>;
  const missed = validSchedules
    .flatMap((schedule) => schedule.missed)
    .sort((left, right) => semesterSortValue(left) - semesterSortValue(right));
  if (missed.length >= 2) {
    const semester = missed[0];
    return { kind: "stopped", semester, term: getSemesterTerm(semester)! };
  }

  const next = validSchedules
    .map((schedule) => ({
      semester: schedule.next,
      term: schedule.term,
    }))
    .sort(
      (left, right) =>
        semesterSortValue(left.semester) - semesterSortValue(right.semester),
    )[0];
  return next ? { kind: "next", ...next } : null;
};

export const getModuleOfferings = async (moduleKey: string) => {
  const parsed = parseModuleKey(moduleKey);
  if (!parsed) throw new Error("Invalid module key");

  const { data, error } = await supabase
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

export const MODULE_HISTORY_SELECT =
  "semester, department, course, name_zh, name_en, credits";

export const getModuleHistory = async (moduleKey: string) => {
  const parsed = parseModuleKey(moduleKey);
  if (!parsed) throw new Error("Invalid module key");

  const { data, error } = await supabase
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
