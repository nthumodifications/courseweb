import {
  SEARCHABLE_FIELDS,
  searchableFieldValues,
  type SearchProjectionRecord,
} from "./projection";
import { queryTerms, searchableLatinTokenGroups } from "./tokenizer";

const isTitleField = (field: number) => field === 3 || field === 5;
const isTeacherField = (field: number) => field === 4 || field === 6;

const bestTermScore = (
  record: SearchProjectionRecord,
  term: string,
  shortQuery: boolean,
) => {
  const values = searchableFieldValues(record);
  const tokenGroups = searchableLatinTokenGroups(record);
  let best = 0;

  for (let field = 0; field < SEARCHABLE_FIELDS.length; field += 1) {
    const fieldValues = values[field] ?? [];
    const tokens = tokenGroups[field] ?? [];
    const exactValue = fieldValues.some((value) => value === term);
    const startsValue = fieldValues.some((value) => value.startsWith(term));
    const exactToken = tokens.some((token) => token === term);
    const startsToken = tokens.some((token) => token.startsWith(term));

    if (shortQuery) {
      // For one/two-character searches, a department/code prefix is the
      // strongest intentional signal. Incidental title/teacher occurrences
      // must not displace the department's natural objectID order.
      if (field === 1 && startsValue)
        best = Math.max(best, exactValue ? 120_000 : 100_000);
      else if ((field === 0 || field === 2) && startsValue)
        best = Math.max(best, 95_000);
      else if (isTitleField(field) && exactToken) best = Math.max(best, 90_000);
      else if (isTitleField(field) && startsToken)
        best = Math.max(best, 88_000);
      else if (isTeacherField(field) && exactToken)
        best = Math.max(best, 80_000);
      else if (isTeacherField(field) && startsToken)
        best = Math.max(best, 78_000);
      else if (field === 7 && (exactToken || startsToken))
        best = Math.max(best, 70_000);
    } else if (exactValue) {
      best = Math.max(best, 110_000);
    } else if (isTitleField(field) && exactToken) {
      best = Math.max(best, 90_000);
    } else if (isTeacherField(field) && exactToken) {
      best = Math.max(best, 80_000);
    } else if (field === 1 && startsValue) {
      best = Math.max(best, 85_000);
    } else if ((field === 0 || field === 2) && startsValue) {
      best = Math.max(best, 84_000);
    } else if (isTitleField(field) && startsToken) {
      best = Math.max(best, 78_000);
    } else if (isTeacherField(field) && startsToken) {
      best = Math.max(best, 70_000);
    } else if (field === 7 && (exactToken || startsToken)) {
      best = Math.max(best, 60_000);
    }
  }

  return best;
};

const rankScore = (
  record: SearchProjectionRecord,
  terms: readonly string[],
) => {
  const shortQuery = terms.every((term) => [...term].length <= 2);
  return terms.reduce(
    (score, term) => score + bestTermScore(record, term, shortQuery),
    0,
  );
};

/** Sort only accepted local hits; this never expands recall or adds fuzzy matching. */
export const rankLocalIdsByTerms = (
  records: readonly SearchProjectionRecord[],
  ids: readonly number[],
  terms: readonly string[],
  shortLatinRankScores?: ReadonlyMap<string, ReadonlyMap<number, number>>,
): readonly number[] => {
  if (!terms.length) {
    return ids;
  }

  const shortQuery = terms.every((term) => [...term].length <= 2);
  return ids
    .map((id) => ({
      id,
      score:
        shortQuery && shortLatinRankScores
          ? terms.reduce(
              (score, term) =>
                score + (shortLatinRankScores.get(term)?.get(id) ?? 0),
              0,
            )
          : rankScore(records[id]!, terms),
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
