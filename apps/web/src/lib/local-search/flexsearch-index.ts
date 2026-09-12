import FlexSearch from "flexsearch";
import { queryTerms, tokenizeCjk } from "./tokenizer";
import type { WorkerDocument } from "./worker-protocol";

export const buildFlexSearchIndex = (documents: WorkerDocument[]) => {
  const flexIndex = new FlexSearch.Index({
    tokenize: "forward",
    resolution: 9,
    minlength: 1,
    encode: (value: string) => tokenizeCjk(value),
  });
  for (const document of documents) flexIndex.add(document.id, document.text);

  // FlexSearch has no result for punctuation/whitespace-only input. The
  // local matcher treats a query with no terms as browse-all, so preserve the
  // same contract while still using FlexSearch for every real query.
  const documentIds = documents.map((document) => document.id);
  return {
    search(query: string, limit: number) {
      return queryTerms(query).length
        ? flexIndex.search(query, limit)
        : documentIds.slice(0, limit);
    },
  };
};

export const searchFlexSearchIndex = (
  index: ReturnType<typeof buildFlexSearchIndex>,
  query: string,
  limit: number,
) => index.search(query, limit).map(String);
