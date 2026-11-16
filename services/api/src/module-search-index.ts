/**
 * Pure module search index aggregation shared by the API Worker and web app.
 * Keep this file free of @courseweb/shared imports: the API build does not
 * build packages/shared/dist.
 */

export type ModuleLanguage = "english" | "chinese" | "bilingual" | "other";

export interface ModuleSearchRow {
  semester: string;
  department: string;
  course: string;
  name_zh: string;
  name_en: string;
  credits: number;
  language: string | null;
  teacher_zh: string[] | null;
  teacher_en: string[] | null;
  capacity: number | null;
  enrolled: number | null;
}

export interface ModuleSearchInstructor {
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
  languages: ModuleLanguage[];
  latestSemester: string;
  fillRate: number | null;
  instructors: ModuleSearchInstructor[];
}

type SemesterTerm = "fall" | "spring" | "summer";
type ModuleTitle = { nameZh: string; nameEn: string };

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

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
  const normalizedDepartment = normalizePart(department).toLocaleUpperCase();
  const normalizedCourse = normalizePart(course)
    .replace(/\s+/g, "")
    .toLocaleUpperCase();

  if (!normalizedDepartment || !normalizedCourse) {
    throw new Error("A module key needs both department and course");
  }

  return `${normalizedDepartment}:${normalizedCourse}`;
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

export const semesterSortValue = (semester: string) => {
  const value = String(semester);
  const term = getSemesterTerm(value);
  return term
    ? Number(value.slice(0, 3)) * 3 + ["fall", "spring", "summer"].indexOf(term)
    : Number.MAX_SAFE_INTEGER;
};

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

export type ModuleHistoryRow = Pick<
  ModuleSearchRow,
  "semester" | "department" | "course" | "name_zh" | "name_en" | "credits"
>;

const normalizeHistoryRow = (row: ModuleHistoryRow): ModuleHistoryRow => ({
  ...row,
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
});

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

// Mirrors the known regular-semester ordering in packages/shared. The API
// Worker cannot import that package; semesters outside this range use the same
// numeric fallback as the web aggregation did before this extraction.
const knownRegularSemesterIndex = (semester: string) => {
  const match = /^(\d{3})([12])0$/.exec(semester);
  if (!match || Number(semester) < 10810 || Number(semester) > 11510) {
    return -1;
  }
  return (Number(match[1]) - 108) * 2 + Number(match[2]) - 1;
};

const areAdjacentKnownSemesters = (before: string, after: string) => {
  const beforeIndex = knownRegularSemesterIndex(before);
  const afterIndex = knownRegularSemesterIndex(after);
  if (beforeIndex >= 0 && afterIndex >= 0) {
    return afterIndex - beforeIndex === 1;
  }
  return semesterSortValue(after) - semesterSortValue(before) === 1;
};

type RenameComparable = Pick<
  ModuleHistoryVariant,
  "nameZh" | "semesters" | "credits"
>;

const areSameCredits = (left: RenameComparable, right: RenameComparable) =>
  left.credits.length === right.credits.length &&
  left.credits.every((credit) => right.credits.includes(credit));

export const canMergeRename = (
  left: RenameComparable,
  right: RenameComparable,
) => {
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

export const variantSort = (
  left: Pick<ModuleHistoryVariant, "semesters">,
  right: Pick<ModuleHistoryVariant, "semesters">,
) =>
  semesterSortValue(right.semesters.at(-1)!) -
  semesterSortValue(left.semesters.at(-1)!);

export interface ModuleHistoryAggregate {
  key: string;
  department: string;
  course: string;
  variants: ModuleHistoryVariant[];
}

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

const normalizeSearchRow = (row: ModuleSearchRow): ModuleSearchRow => ({
  ...row,
  semester: String(row.semester),
  department: normalizePart(row.department),
  course: normalizePart(row.course),
  capacity: row.capacity ?? null,
  enrolled: row.enrolled ?? null,
});

const normalizeModuleLanguage = (value: string): ModuleLanguage => {
  const normalized = normalizePart(value).normalize("NFKC").toLocaleLowerCase();
  const hasEnglish =
    normalized.includes("英") || normalized.includes("english");
  const hasChinese =
    normalized.includes("中") || normalized.includes("chinese");
  if (hasEnglish && hasChinese) return "bilingual";
  if (hasEnglish) return "english";
  if (hasChinese) return "chinese";
  return "other";
};

const getDemandSeries = (rows: readonly ModuleSearchRow[]) => {
  const bySemester = new Map<
    string,
    { semester: string; enrolled: number; capacity: number }
  >();
  for (const row of rows) {
    if (!row.capacity || !row.enrolled) continue;
    const point = bySemester.get(row.semester) ?? {
      semester: row.semester,
      enrolled: 0,
      capacity: 0,
    };
    point.enrolled += row.enrolled;
    point.capacity += row.capacity;
    bySemester.set(row.semester, point);
  }
  return [...bySemester.values()].sort((left, right) =>
    left.semester.localeCompare(right.semester),
  );
};

const getRecentFill = (rows: readonly ModuleSearchRow[], recent = 4) => {
  const points = getDemandSeries(rows).slice(-recent);
  const capacity = points.reduce((sum, point) => sum + point.capacity, 0);
  if (capacity === 0) return null;
  return points.reduce((sum, point) => sum + point.enrolled, 0) / capacity;
};

const getSearchLanguages = (
  rows: readonly ModuleSearchRow[],
  latestSemester: string,
  titleKeys: readonly string[],
) =>
  [
    ...new Set(
      rows
        .filter(
          (row) =>
            row.semester === latestSemester &&
            titleKeys.includes(normalizeCourseTitle(row.name_zh)),
        )
        .map((row) => normalizeModuleLanguage(row.language ?? "")),
    ),
  ].sort((left, right) => left.localeCompare(right));

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
      languages: getSearchLanguages(
        moduleRows,
        variant.semesters.at(-1)!,
        variant.titleKeys,
      ),
      latestSemester: variant.semesters.at(-1)!,
      fillRate: getRecentFill(
        moduleRows.filter((row) =>
          variant.titleKeys.includes(normalizeCourseTitle(row.name_zh)),
        ),
      ),
      instructors: getSearchInstructors(
        moduleRows,
        variant.semesters.at(-1)!,
        variant.titleKeys,
      ),
    }));
  });
};

type CompactModuleSearchRow = [
  number, // department lookup index
  number, // course string index
  number, // title key string index
  number, // Chinese title string index
  number, // English title string index
  number, // semester set index
  number, // credit set index
  number, // language bit mask
  number | null, // fill rate
  number, // instructor set index
];

/** Compact JSON shape sent from the Worker to browsers. */
export interface CompactModuleSearchIndex {
  v: 1;
  d: string[];
  s: string[];
  t: [number, number][];
  h: number[][];
  c: number[][];
  g: number[][];
  r: CompactModuleSearchRow[];
}

const LANGUAGE_BITS: Record<ModuleLanguage, number> = {
  english: 1,
  chinese: 2,
  bilingual: 4,
  other: 8,
};

export const encodeModuleSearchIndex = (
  results: readonly ModuleSearchResult[],
): CompactModuleSearchIndex => {
  const strings: string[] = [];
  const stringIndexes = new Map<string, number>();
  const stringIndex = (value: string) => {
    const found = stringIndexes.get(value);
    if (found !== undefined) return found;
    const index = strings.length;
    strings.push(value);
    stringIndexes.set(value, index);
    return index;
  };

  const departments: string[] = [];
  const departmentIndexes = new Map<string, number>();
  const departmentIndex = (value: string) => {
    const found = departmentIndexes.get(value);
    if (found !== undefined) return found;
    const index = departments.length;
    departments.push(value);
    departmentIndexes.set(value, index);
    return index;
  };

  const teachers: [number, number][] = [];
  const teacherIndexes = new Map<string, number>();
  const teacherIndex = (instructor: ModuleSearchInstructor) => {
    const identity = JSON.stringify([instructor.nameZh, instructor.nameEn]);
    const found = teacherIndexes.get(identity);
    if (found !== undefined) return found;
    const index = teachers.length;
    teachers.push([
      stringIndex(instructor.nameZh),
      stringIndex(instructor.nameEn),
    ]);
    teacherIndexes.set(identity, index);
    return index;
  };

  const semesters: number[][] = [];
  const semesterSetIndexes = new Map<string, number>();
  const semesterSetIndex = (values: readonly string[]) => {
    const identity = JSON.stringify(values);
    const found = semesterSetIndexes.get(identity);
    if (found !== undefined) return found;
    const index = semesters.length;
    semesters.push(values.map(stringIndex));
    semesterSetIndexes.set(identity, index);
    return index;
  };

  const credits: number[][] = [];
  const creditSetIndexes = new Map<string, number>();
  const creditSetIndex = (values: readonly number[]) => {
    const identity = JSON.stringify(values);
    const found = creditSetIndexes.get(identity);
    if (found !== undefined) return found;
    const index = credits.length;
    credits.push([...values]);
    creditSetIndexes.set(identity, index);
    return index;
  };

  const instructorSets: number[][] = [];
  const instructorSetIndexes = new Map<string, number>();
  const instructorSetIndex = (values: readonly ModuleSearchInstructor[]) => {
    const teacherIds = values.map(teacherIndex);
    const identity = JSON.stringify(teacherIds);
    const found = instructorSetIndexes.get(identity);
    if (found !== undefined) return found;
    const index = instructorSets.length;
    instructorSets.push(teacherIds);
    instructorSetIndexes.set(identity, index);
    return index;
  };

  const rows = results.map((result): CompactModuleSearchRow => {
    const languageMask = result.languages.reduce(
      (mask, language) => mask | LANGUAGE_BITS[language],
      0,
    );
    return [
      departmentIndex(result.department),
      stringIndex(result.course),
      stringIndex(result.titleKey),
      stringIndex(result.nameZh),
      stringIndex(result.nameEn),
      semesterSetIndex(result.semesters),
      creditSetIndex(result.credits),
      languageMask,
      result.fillRate,
      instructorSetIndex(result.instructors),
    ];
  });

  return {
    v: 1,
    d: departments,
    s: strings,
    t: teachers,
    h: semesters,
    c: credits,
    g: instructorSets,
    r: rows,
  };
};

export const decodeModuleSearchIndex = (
  payload: CompactModuleSearchIndex,
): ModuleSearchResult[] => {
  if (payload.v !== 1) throw new Error("Unsupported module index version");
  const languages = Object.entries(LANGUAGE_BITS) as [ModuleLanguage, number][];
  return payload.r.map((row) => {
    const [
      departmentIndex,
      courseIndex,
      titleKeyIndex,
      nameZhIndex,
      nameEnIndex,
      semesterSet,
      creditSet,
      languageMask,
      fillRate,
      instructorSet,
    ] = row;
    const department = payload.d[departmentIndex];
    const course = payload.s[courseIndex];
    const semesters = payload.h[semesterSet].map((index) => payload.s[index]);
    return {
      key: createModuleKey(department, course),
      department,
      course,
      titleKey: payload.s[titleKeyIndex],
      nameZh: payload.s[nameZhIndex],
      nameEn: payload.s[nameEnIndex],
      semesters,
      credits: payload.c[creditSet],
      languages: languages
        .filter(([, bit]) => (languageMask & bit) !== 0)
        .map(([language]) => language),
      latestSemester: semesters.at(-1)!,
      fillRate,
      instructors: payload.g[instructorSet].map((index) => {
        const [nameZh, nameEn] = payload.t[index];
        return { nameZh: payload.s[nameZh], nameEn: payload.s[nameEn] };
      }),
    };
  });
};
