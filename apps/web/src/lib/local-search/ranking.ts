import {
  searchableFieldValues,
  type SearchProjectionRecord,
} from "./projection";
import {
  cjkTermMatchScore,
  isCjkCharacter,
  matchesCourseCode,
  parseCourseCodeQuery,
  queryTerms,
  searchableTokenGroups,
  tokenizeCjk,
} from "./tokenizer";

/** Searchable-field order with code fields ahead of titles and teachers. */
const RANK_FIELDS = [0, 1, 2, 3, 5, 4, 6] as const;
const CODE_FIELDS = new Set([0, 1, 2]);
const TITLE_FIELDS = new Set([3, 5]);
const TEACHER_FIELDS = new Set([4, 6]);

const hasWholeTeacherName = (
  values: readonly string[],
  terms: readonly string[],
) =>
  values.some((value) => {
    const tokens = tokenizeCjk(value);
    return terms.every((term) =>
      [...term].some(isCjkCharacter)
        ? cjkTermMatchScore(value, term) === 3
        : tokens.includes(term),
    );
  });

const fieldWeight = (field: number) => {
  if (field === 0) return 700;
  if (field === 1) return 680;
  if (field === 2) return 670;
  if (TITLE_FIELDS.has(field)) return 600;
  return 300;
};

const termMatchScore = (
  values: readonly string[],
  tokens: readonly string[],
  term: string,
) => {
  if ([...term].some(isCjkCharacter)) {
    return Math.max(...values.map((value) => cjkTermMatchScore(value, term)));
  }
  if (tokens.some((token) => token === term)) return 3;
  if (term.length >= 2 && tokens.some((token) => token.startsWith(term))) {
    return 2;
  }
  return 0;
};

const scoreField = (
  field: number,
  values: readonly string[],
  tokens: readonly string[],
  query: string,
  terms: readonly string[],
) => {
  const base = fieldWeight(field);
  const termScores = terms.map((term) => termMatchScore(values, tokens, term));
  if (
    TEACHER_FIELDS.has(field) &&
    termScores.length > 0 &&
    hasWholeTeacherName(values, terms)
  ) {
    return (
      1_800 +
      base +
      termScores.reduce<number>((sum, score) => sum + score, 0) * 25
    );
  }
  if (values.some((value) => value === query)) return 1_000 + base;
  if (values.some((value) => value.startsWith(query))) return 800 + base;

  if (termScores.every((score) => score > 0)) {
    return (
      600 +
      base +
      termScores.reduce<number>((sum, score) => sum + score, 0) * 25
    );
  }
  return 0;
};

export const remoteRankScore = (
  record: SearchProjectionRecord,
  terms: readonly string[],
) => {
  const query = terms.join(" ").trim();
  if (!query) return 0;

  const values = searchableFieldValues(record);
  const tokenGroups = searchableTokenGroups(record);
  const courseCode = parseCourseCodeQuery(query);
  if (courseCode && matchesCourseCode(record, courseCode)) return 3_000;
  const fieldScores = RANK_FIELDS.map((field) =>
    scoreField(
      field,
      values[field] ?? [],
      tokenGroups[field] ?? [],
      query,
      terms,
    ),
  );
  const codeTermScores = terms.map((term) =>
    Math.max(
      ...[...CODE_FIELDS].map((field) =>
        termMatchScore(values[field] ?? [], tokenGroups[field] ?? [], term),
      ),
    ),
  );
  const codeScore = codeTermScores.every((score) => score > 0)
    ? 2_000 + codeTermScores.reduce<number>((sum, score) => sum + score, 0) * 25
    : 0;
  return Math.max(codeScore, ...fieldScores);
};

/** Sort only accepted local hits; this never expands recall or adds fuzzy matching. */
export const rankLocalIdsByTerms = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  terms: readonly string[],
): readonly number[] => {
  if (!terms.length) return ids;

  const ranked = ids
    .map((id) => ({
      id,
      score: remoteRankScore(records[id]!, terms),
    }))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference) return scoreDifference;
      return records[left.id]!.objectID.localeCompare(
        records[right.id]!.objectID,
      );
    })
    .map(({ id }) => id);

  if (parseCourseCodeQuery(terms.join(" "))) return ranked;

  const firstSections: number[] = [];
  const remainingSections: number[] = [];
  const seenCourses = new Set<string>();
  for (const id of ranked) {
    const record = records[id]!;
    const department = record.department
      .normalize("NFKC")
      .replace(/\s+/g, "")
      .toLocaleUpperCase("en-US");
    const course = record.course.normalize("NFKC").replace(/\s+/g, "");
    const key = `${department}\u0000${course || record.objectID}`;
    if (seenCourses.has(key)) remainingSections.push(id);
    else {
      seenCourses.add(key);
      firstSections.push(id);
    }
  }
  return [...firstSections, ...remainingSections];
};

export const rankLocalIds = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  query: string,
) => rankLocalIdsByTerms(records, ids, queryTerms(query));
