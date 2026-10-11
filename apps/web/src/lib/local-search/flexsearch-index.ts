import FlexSearch from "flexsearch";
import {
  isCjkCharacter,
  normalizeSearchQuery,
  queryTerms,
  tokenizeCjk,
} from "./tokenizer";
import type { WorkerDocument } from "./worker-protocol";

export const buildFlexSearchIndex = (documents: WorkerDocument[]) => {
  const flexIndex = new FlexSearch.Index({
    tokenize: "forward",
    resolution: 9,
    encode: (value: string) => tokenizeCjk(value),
  });
  for (const document of documents) flexIndex.add(document.id, document.text);

  // FlexSearch has no result for punctuation/whitespace-only input. The
  // local matcher treats a query with no terms as browse-all, so preserve the
  // same contract while still using FlexSearch for every real query.
  const documentIds = documents.map((document) => document.id);
  return {
    search(query: string, limit: number) {
      const terms = queryTerms(query);
      if (!terms.length) return documentIds.slice(0, limit);

      // A two-character CJK query searches both unigrams so a contiguous
      // phrase is never lost to the CJK token index. The final matcher still
      // requires the exact phrase in one field.
      if (
        terms.length === 1 &&
        [...terms[0]!].length === 2 &&
        [...terms[0]!].every(isCjkCharacter)
      ) {
        const ids = new Set<string>();
        for (const character of terms[0]!) {
          for (const id of flexIndex.search(character, limit)) {
            ids.add(String(id));
          }
        }
        return [...ids].slice(0, limit);
      }

      return flexIndex.search(normalizeSearchQuery(query), limit);
    },
  };
};

export const searchFlexSearchIndex = (
  index: ReturnType<typeof buildFlexSearchIndex>,
  query: string,
  limit: number,
) => index.search(query, limit).map(String);
