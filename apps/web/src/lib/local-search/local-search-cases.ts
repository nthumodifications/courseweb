import localSearchCasesData from "./local-search-cases.data.json";

export type LocalSearchCase = {
  name: string;
  query: string;
  params?: {
    facetFilters?: readonly (readonly string[])[];
    numericFilters?: readonly string[];
    filters?: string;
  };
  ids: readonly string[];
};

export const LOCAL_SEARCH_CASES = localSearchCasesData satisfies
  readonly LocalSearchCase[];
