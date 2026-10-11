import {
  searchableFieldValues,
  type SearchProjectionRecord,
} from "./projection";
import { queryTerms } from "./tokenizer";

/**
 * The fallback search's ranking fields are not the same as the serialized
 * searchable-field order. Keep this explicit: raw_id, course, names,
 * teachers, then department, with whole-field exact/prefix tiers.
 */
const REMOTE_RANK_FIELDS = [0, 2, 3, 5, 4, 6, 1] as const;

export const remoteRankScore = (
  record: SearchProjectionRecord,
  terms: readonly string[],
) => {
  const query = terms.join(" ").trim();
  if (!query) return 0;

  const values = searchableFieldValues(record);
  const fields = REMOTE_RANK_FIELDS.flatMap((field) => values[field] ?? []);
  const exactIndex = fields.indexOf(query);
  if (exactIndex >= 0) return 100 - exactIndex;

  const prefixIndex = fields.findIndex((value) => value.startsWith(query));
  return prefixIndex >= 0 ? 50 - prefixIndex : 0;
};

/** Sort only accepted local hits; this never expands recall or adds fuzzy matching. */
export const rankLocalIdsByTerms = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  terms: readonly string[],
): readonly number[] => {
  return ids
    .map((id) => ({
      id,
      score: remoteRankScore(records[id]!, terms),
    }))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference) return scoreDifference;
      return records[right.id]!.objectID.localeCompare(
        records[left.id]!.objectID,
      );
    })
    .map(({ id }) => id);
};

export const rankLocalIds = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  query: string,
) => rankLocalIdsByTerms(records, ids, queryTerms(query));
