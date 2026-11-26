import { cleanSyllabusFields } from "@/lib/syllabus-text";
import type { CourseDefinition } from "@/config/supabase";
import {
  aggregateModuleHistoryRows,
  canMergeRename,
  createModuleKey,
  decodeModuleSearchIndex,
  getSemesterTerm,
  normalizeCourseTitle,
  semesterSortValue,
  variantSort,
  type CompactModuleSearchIndex,
  type ModuleHistoryAggregate,
  type ModuleHistoryRow,
  type ModuleLanguage,
  type ModuleSearchResult,
} from "../../../../services/api/src/module-search-index";
import type { ModuleScore } from "./module-insights";

export {
  aggregateModuleHistoryRows,
  aggregateModuleSearchRows,
  createModuleKey,
  getSemesterTerm,
  normalizeCourseTitle,
} from "../../../../services/api/src/module-search-index";

export const safeCreateModuleKey = (department: string, course: string) => {
  try {
    return createModuleKey(department, course);
  } catch {
    return "";
  }
};
export type {
  ModuleLanguage,
  ModuleSearchResult,
} from "../../../../services/api/src/module-search-index";

// Loaded on demand so the pure helpers in this file can be imported (and
// tested) without a configured Supabase client.
const loadSupabase = async () => (await import("@/config/supabase")).default;
const loadApi = async () => (await import("@/config/api")).default;

export const serializePostgresArrayElement = (value: string) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

type ModuleOfferingRow = Pick<
  CourseDefinition,
  | "raw_id"
  | "semester"
  | "department"
  | "course"
  | "class"
  | "name_zh"
  | "name_en"
  | "prerequisites"
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
  "raw_id, semester, department, course, class, name_zh, name_en, prerequisites, credits, language, teacher_zh, teacher_en, times, venues, capacity, enrolled";

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

export type ModuleTermFilter = "fall" | "spring" | "both";
export type ModuleRecentFilter = "latest" | "3" | "6" | "10";
export type ModuleSearchSort =
  | "relevance"
  | "course-code"
  | "recent"
  | "times-offered"
  | "fill-rate";
export const MODULE_ENGLISH_TAUGHT_VALUE = "yes";
export const MODULE_SEARCH_FACETS = [
  "department",
  "credits",
  "language",
  "termOffered",
  "recentlyOffered",
  "courseLevel",
  "englishTaught",
] as const;

export interface ModuleSearchFilters {
  departments?: readonly string[];
  credits?: readonly string[];
  languages?: readonly ModuleLanguage[];
  terms?: readonly ModuleTermFilter[];
  recent?: readonly ModuleRecentFilter[];
  levels?: readonly string[];
  englishTaught?: boolean;
}

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

/**
 * Titles are grouped by the Chinese name. NFKC handles full/half-width text;
 * the punctuation map and trailing trim avoid treating editorial punctuation
 * as a new course title.
 */
export const parseModuleKey = (value: string): ParsedModuleKey | null => {
  const normalized = normalizePart(value).normalize("NFKC");
  const separator = normalized.indexOf(":");
  const parts =
    separator >= 0
      ? [normalized.slice(0, separator), normalized.slice(separator + 1)]
      : /^(.*?)(\d+)$/.exec(normalized)?.slice(1);
  if (!parts || parts.length !== 2) return null;

  const department = normalizePart(parts[0]).toLocaleUpperCase();
  const course = normalizePart(parts[1])
    .replace(/\s+/g, "")
    .toLocaleUpperCase();
  return department && course ? { department, course } : null;
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

const getInstructorRows = async (name: string, select: string) => {
  const pageSize = 1000;
  const rows: unknown[] = [];
  const supabase = await loadSupabase();
  const filterValue = `{${serializePostgresArrayElement(name)}}`;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("courses")
      .select(select)
      .filter("teacher_zh", "cs", filterValue)
      .order("semester", { ascending: true })
      .order("raw_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }

  return rows;
};

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

export const getInstructorOfferings = async (name: string) => {
  return (await getInstructorRows(name, MODULE_OFFERING_SELECT))
    .map((row) => normalizeOffering(row as unknown as ModuleOfferingRow))
    .filter((offering) => getSemesterTerm(offering.semester));
};

export const getInstructorCourses = async (
  name: string,
): Promise<CourseDefinition[]> =>
  (await getInstructorRows(name, "*"))
    .map((row) => row as CourseDefinition)
    .filter((course) => getSemesterTerm(String(course.semester)));

/** Published class averages for these offerings; an empty list on failure. */
export const getModuleScores = async (
  rawIds: readonly string[],
): Promise<ModuleScore[]> => {
  if (rawIds.length === 0) return [];

  const chunkSize = 300;
  const scores: ModuleScore[] = [];
  const supabase = await loadSupabase();
  for (let from = 0; from < rawIds.length; from += chunkSize) {
    const { data, error } = await supabase
      .from("course_scores")
      .select("raw_id, average, std_dev, type, enrollment")
      .in("raw_id", rawIds.slice(from, from + chunkSize));
    if (error) throw error;
    scores.push(...((data ?? []) as ModuleScore[]));
  }
  return scores;
};

/** The course description from one offering's syllabus, if it has one. */
export const getModuleBrief = async (rawId: string) => {
  const { data, error } = await (await loadSupabase())
    .from("course_syllabus")
    .select("brief")
    .eq("raw_id", rawId)
    .maybeSingle();
  if (error) throw error;
  return (
    cleanSyllabusFields(data as { brief: string | null } | null).brief ?? ""
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

const normalizeSearchText = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();

const getModuleLevel = (course: string) => {
  const firstDigit = Number(course.match(/\d/)?.[0]);
  return firstDigit ? `${Math.min(firstDigit, 5)}000` : "";
};

const getModuleTerms = (semesters: readonly string[]): ModuleTermFilter[] => {
  const terms = new Set(semesters.map(getSemesterTerm));
  const offeredFall = terms.has("fall");
  const offeredSpring = terms.has("spring");
  const values: ModuleTermFilter[] = [];
  if (offeredFall) values.push("fall");
  if (offeredSpring) values.push("spring");
  if (offeredFall && offeredSpring) values.push("both");
  return values;
};

const getModuleRecentFilters = (
  semesters: readonly string[],
  latestSemesters: readonly string[],
): ModuleRecentFilter[] => {
  const values: ModuleRecentFilter[] = [];
  if (semesters.includes(latestSemesters[0] ?? "")) values.push("latest");
  for (const limit of [3, 6, 10] as const) {
    const recent = new Set(latestSemesters.slice(0, limit));
    if (semesters.some((semester) => recent.has(semester))) {
      values.push(String(limit) as ModuleRecentFilter);
    }
  }
  return values;
};

export const getModuleSearchFacetValues = (
  result: ModuleSearchResult,
  facet: string,
  latestSemesters: readonly string[],
): string[] => {
  switch (facet) {
    case "department":
      return [result.department];
    case "credits":
      return result.credits.map(String);
    case "language":
      return result.languages;
    case "termOffered":
      return getModuleTerms(result.semesters);
    case "recentlyOffered":
      return getModuleRecentFilters(result.semesters, latestSemesters);
    case "courseLevel": {
      const level = getModuleLevel(result.course);
      return level ? [level] : [];
    }
    case "englishTaught":
      return result.languages.some(
        (language) => language === "english" || language === "bilingual",
      )
        ? [MODULE_ENGLISH_TAUGHT_VALUE]
        : [];
    default:
      return [];
  }
};

const getSearchableText = (result: ModuleSearchResult) =>
  [
    result.key,
    `${result.department} ${result.course}`,
    result.nameZh,
    result.nameEn,
    ...result.instructors.flatMap((instructor) => [
      instructor.nameZh,
      instructor.nameEn,
    ]),
  ]
    .map(normalizeSearchText)
    .join(" ");

export const matchesModuleSearchQuery = (
  result: ModuleSearchResult,
  keyword: string,
) => {
  const query = normalizeSearchText(keyword);
  if (!query) return true;

  const searchableText = getSearchableText(result);
  const compactQuery = query.replace(/\s+/g, "");
  const compactCode = `${result.department}${result.course}`
    .replace(/\s+/g, "")
    .toLocaleLowerCase();
  if (compactQuery && compactCode.includes(compactQuery)) return true;
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => searchableText.includes(part));
};

const getSearchMatchTier = (
  result: ModuleSearchResult,
  keyword: string,
  exactCode: string | null,
) => {
  if (
    exactCode &&
    createModuleKey(result.department, result.course) === exactCode
  ) {
    return 0;
  }

  const query = normalizeSearchText(keyword);
  const titles = [result.nameZh, result.nameEn].map(normalizeSearchText);
  if (titles.some((title) => title.startsWith(query))) return 1;
  if (titles.some((title) => title.includes(query))) return 2;

  const instructors = result.instructors.flatMap((instructor) => [
    instructor.nameZh,
    instructor.nameEn,
  ]);
  if (instructors.some((name) => normalizeSearchText(name).includes(query))) {
    return 3;
  }
  return 4;
};

export const rankModuleSearchResults = (
  results: readonly ModuleSearchResult[],
  keyword: string,
) => {
  const parsedQuery = parseModuleKey(keyword);
  const exactCode = parsedQuery
    ? createModuleKey(parsedQuery.department, parsedQuery.course)
    : null;
  return [...results].sort((left, right) => {
    const tierDifference =
      getSearchMatchTier(left, keyword, exactCode) -
      getSearchMatchTier(right, keyword, exactCode);
    if (tierDifference !== 0) return tierDifference;

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

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const compareModuleCode = (
  left: ModuleSearchResult,
  right: ModuleSearchResult,
) =>
  collator.compare(left.department, right.department) ||
  collator.compare(left.course, right.course) ||
  left.titleKey.localeCompare(right.titleKey);

const moduleMatchesFilters = (
  result: ModuleSearchResult,
  filters: ModuleSearchFilters,
  latestSemesters: readonly string[],
) => {
  if (
    filters.departments?.length &&
    !filters.departments.includes(result.department)
  ) {
    return false;
  }
  if (
    filters.credits?.length &&
    !result.credits.some((credit) => filters.credits?.includes(String(credit)))
  ) {
    return false;
  }
  if (
    filters.languages?.length &&
    !result.languages.some((language) => filters.languages?.includes(language))
  ) {
    return false;
  }
  if (
    filters.terms?.length &&
    !getModuleTerms(result.semesters).some((term) =>
      filters.terms?.includes(term),
    )
  ) {
    return false;
  }
  if (
    filters.recent?.length &&
    !getModuleRecentFilters(result.semesters, latestSemesters).some((term) =>
      filters.recent?.includes(term),
    )
  ) {
    return false;
  }
  if (
    filters.levels?.length &&
    !filters.levels.includes(getModuleLevel(result.course))
  ) {
    return false;
  }
  if (
    filters.englishTaught &&
    !result.languages.some(
      (language) => language === "english" || language === "bilingual",
    )
  ) {
    return false;
  }
  return true;
};

export const filterAndSortModuleSearchResults = (
  results: readonly ModuleSearchResult[],
  keyword: string,
  filters: ModuleSearchFilters = {},
  sort: ModuleSearchSort = "relevance",
) => {
  const latestSemesters = [
    ...new Set(results.flatMap((result) => result.semesters)),
  ].sort((left, right) => semesterSortValue(right) - semesterSortValue(left));
  const matched = results.filter(
    (result) =>
      matchesModuleSearchQuery(result, keyword) &&
      moduleMatchesFilters(result, filters, latestSemesters),
  );

  if (sort === "relevance" && keyword.trim()) {
    return rankModuleSearchResults(matched, keyword);
  }

  return [...matched].sort((left, right) => {
    if (sort === "recent") {
      const recentDifference =
        semesterSortValue(right.latestSemester) -
        semesterSortValue(left.latestSemester);
      if (recentDifference !== 0) return recentDifference;
    } else if (sort === "times-offered") {
      const countDifference = right.semesters.length - left.semesters.length;
      if (countDifference !== 0) return countDifference;
    } else if (sort === "fill-rate") {
      if (left.fillRate === null && right.fillRate !== null) return 1;
      if (right.fillRate === null && left.fillRate !== null) return -1;
      if (left.fillRate !== null && right.fillRate !== null) {
        const fillDifference = right.fillRate - left.fillRate;
        if (fillDifference !== 0) return fillDifference;
      }
    }
    return compareModuleCode(left, right);
  });
};

export const getModuleSearchIndex = async (signal?: AbortSignal) => {
  const api = await loadApi();
  const response = await api.course["modules-index"].$get(undefined, {
    init: { signal },
  });
  if (!response.ok) throw new Error("Failed to load module search index");
  return decodeModuleSearchIndex(
    (await response.json()) as CompactModuleSearchIndex,
  );
};
