import {
  searchableFieldValues,
  type SearchProjectionRecord,
} from "./projection";
import { isCjkCharacter, queryTerms, searchableTokenGroups } from "./tokenizer";

/** Searchable-field order with code fields ahead of titles and teachers. */
const RANK_FIELDS = [0, 1, 2, 3, 5, 4, 6] as const;
const CODE_FIELDS = new Set([0, 1, 2]);
const TITLE_FIELDS = new Set([3, 5]);

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
    if (values.some((value) => value === term)) return 3;
    if (values.some((value) => value.startsWith(term))) return 2;
    return values.some((value) => value.includes(term)) ? 1 : 0;
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
  if (values.some((value) => value === query)) return 1_000 + base;
  if (values.some((value) => value.startsWith(query))) return 800 + base;

  const termScores = terms.map((term) => termMatchScore(values, tokens, term));
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

  return ids
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
};

export const rankLocalIds = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  query: string,
) => rankLocalIdsByTerms(records, ids, queryTerms(query));
