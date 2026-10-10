import { decode } from "html-entities";
import { createModuleKey, type ModuleOffering } from "@/lib/modules";
import {
  getInstructorInsights,
  getInstructorScoreHistory,
  type InsightOffering,
  type ModuleScore,
  type ScoreSummary,
} from "@/lib/module-insights";
import type { CourseDefinition } from "@/config/supabase";

/** The display form for an instructor name, without changing its identity. */
export const normaliseInstructorName = (value: string) =>
  decode(value).normalize("NFKC").replace(/\s+/gu, " ").trim();

export const encodeInstructorRouteParam = (value: string) =>
  encodeURIComponent(encodeURIComponent(value));

export const decodeInstructorRouteParam = (value: string | undefined) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

type EnglishNameKey = {
  normalized: string;
  tokens: Set<string>;
  letters: string;
};

const toEnglishNameKey = (value: string): EnglishNameKey => {
  const normalized = normaliseInstructorName(value).toLocaleUpperCase();
  const withoutPunctuation = normalized.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const tokens = new Set(withoutPunctuation.split(/\s+/u).filter(Boolean));
  const letters = Array.from(normalized)
    .filter((character) => /\p{L}/u.test(character))
    .join("");
  return { normalized: withoutPunctuation, tokens, letters };
};

const hasTokenSubset = (left: Set<string>, right: Set<string>) =>
  [...left].every((token) => right.has(token));

const levenshteinDistance = (left: string, right: string) => {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  let previous = Array.from(
    { length: rightCharacters.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (
      let rightIndex = 0;
      rightIndex < rightCharacters.length;
      rightIndex += 1
    ) {
      current.push(
        Math.min(
          current[rightIndex] + 1,
          previous[rightIndex + 1] + 1,
          previous[rightIndex] +
            (leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1),
        ),
      );
    }
    previous = current;
  }

  return previous.at(-1) ?? 0;
};

const sameEnglishPerson = (left: EnglishNameKey, right: EnglishNameKey) =>
  (left.tokens.size > 0 &&
    right.tokens.size > 0 &&
    (hasTokenSubset(left.tokens, right.tokens) ||
      hasTokenSubset(right.tokens, left.tokens))) ||
  levenshteinDistance(left.letters, right.letters) <= 2;

/** Cluster normalized English spellings without merging common namesakes. */
export const clusterEnglishNames = (names: string[]): string[][] => {
  const uniqueNames = new Map<string, EnglishNameKey>();
  for (const name of names) {
    const key = toEnglishNameKey(name);
    if (key.normalized && !uniqueNames.has(key.normalized)) {
      uniqueNames.set(key.normalized, key);
    }
  }

  const clusters: EnglishNameKey[][] = [];
  for (const name of uniqueNames.values()) {
    const matchingIndexes = clusters.flatMap((cluster, index) =>
      cluster.some((member) => sameEnglishPerson(member, name)) ? [index] : [],
    );

    if (matchingIndexes.length === 0) {
      clusters.push([name]);
      continue;
    }

    const firstIndex = matchingIndexes[0];
    const merged = [
      name,
      ...matchingIndexes.flatMap((index) => clusters[index]),
    ];
    clusters[firstIndex] = merged;
    for (const index of matchingIndexes.slice(1).reverse()) {
      clusters.splice(index, 1);
    }
  }

  return clusters.map((cluster) => cluster.map((name) => name.normalized));
};

export interface InstructorNamePair {
  nameZh: string;
  nameEn: string;
}

/** English and Chinese arrays are index-aligned only when their lengths match. */
export const pairInstructorNames = (
  teacherZh: readonly string[] | null | undefined,
  teacherEn: readonly string[] | null | undefined,
): InstructorNamePair[] => {
  if (!teacherZh || !teacherEn || teacherZh.length !== teacherEn.length) {
    return [];
  }

  return teacherZh.flatMap((nameZh, index) => {
    const nameEn = teacherEn[index];
    return nameZh.trim() && nameEn?.trim() ? [{ nameZh, nameEn }] : [];
  });
};

export const getInstructorEnglishNames = (
  offerings: readonly Pick<ModuleOffering, "teacher_zh" | "teacher_en">[],
  nameZh: string,
) => {
  const counts = new Map<string, number>();
  for (const offering of offerings) {
    for (const pair of pairInstructorNames(
      offering.teacher_zh,
      offering.teacher_en,
    )) {
      if (pair.nameZh !== nameZh) continue;
      const nameEn = normaliseInstructorName(pair.nameEn);
      if (nameEn) counts.set(nameEn, (counts.get(nameEn) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([name]) => name);
};

const NON_INSTRUCTOR_NAMES = new Set([
  "EMS境外專班",
  "清華學院學士班",
  "SNHCC Prog",
  "服科所全體教師",
]);

export const isInstructorPageName = (name: string) => {
  const normalized = normaliseInstructorName(name);
  return Boolean(normalized) && !NON_INSTRUCTOR_NAMES.has(normalized);
};

export interface InstructorModuleGroup {
  key: string;
  department: string;
  course: string;
  offerings: ModuleOffering[];
}

/** Group an instructor's offerings using the same department/course module key. */
export const groupInstructorOfferings = (
  offerings: readonly ModuleOffering[],
): InstructorModuleGroup[] => {
  const groups = new Map<string, InstructorModuleGroup>();
  for (const offering of offerings) {
    const key = createModuleKey(offering.department, offering.course);
    const group = groups.get(key) ?? {
      key,
      department: offering.department,
      course: offering.course,
      offerings: [],
    };
    group.offerings.push(offering);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      offerings: [...group.offerings].sort(
        (left, right) =>
          right.semester.localeCompare(left.semester) ||
          right.raw_id.localeCompare(left.raw_id),
      ),
    }))
    .sort(
      (left, right) =>
        (right.offerings[0]?.semester ?? "").localeCompare(
          left.offerings[0]?.semester ?? "",
        ) || left.key.localeCompare(right.key),
    );
};

export const getInstructorModuleTitle = (
  group: Pick<InstructorModuleGroup, "offerings">,
  lang: string,
) => {
  const latestOffering = group.offerings[0];
  if (!latestOffering) return "";
  return lang === "en" ? latestOffering.name_en : latestOffering.name_zh;
};

export const formatInstructorEnglishNames = (names: readonly string[]) =>
  names.join(" · ");

export interface InstructorGradeHistory {
  mode: "average" | "offerings";
  average: ScoreSummary | null;
  offerings: ReturnType<typeof getInstructorScoreHistory>;
}

/** Use an average only when three offerings in this module have published scores. */
export const getInstructorGradeHistory = (
  offerings: readonly InsightOffering[],
  scores: readonly ModuleScore[],
  instructorName: string,
): InstructorGradeHistory => {
  const publishedOfferings = getInstructorScoreHistory(
    offerings,
    scores,
    instructorName,
  );
  const insight = getInstructorInsights(offerings, scores).find(
    (entry) => entry.key === instructorName.trim(),
  );
  const average = insight?.scores[0] ?? null;

  return {
    mode: publishedOfferings.length >= 3 && average ? "average" : "offerings",
    average,
    offerings: publishedOfferings,
  };
};

export interface InstructorSemesterGroup {
  semester: string;
  courses: CourseDefinition[];
}

const semesterSortValue = (semester: string) => {
  const match = /^(\d{3})([123])$/.exec(semester);
  if (!match) return Number.MIN_SAFE_INTEGER;

  return Number(match[1]) * 3 + Number(match[2]);
};

/** Group exact instructor matches by semester, newest semester first. */
export const groupInstructorCourses = (
  courses: readonly CourseDefinition[],
): InstructorSemesterGroup[] => {
  const groups = new Map<string, CourseDefinition[]>();
  for (const course of courses) {
    const current = groups.get(course.semester) ?? [];
    current.push(course);
    groups.set(course.semester, current);
  }

  return [...groups.entries()]
    .map(([semester, semesterCourses]) => ({
      semester,
      courses: [...semesterCourses].sort((left, right) =>
        right.raw_id.localeCompare(left.raw_id),
      ),
    }))
    .sort(
      (left, right) =>
        semesterSortValue(right.semester) - semesterSortValue(left.semester) ||
        right.semester.localeCompare(left.semester),
    );
};
