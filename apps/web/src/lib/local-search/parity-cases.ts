import parityCasesData from "./parity-cases.data.json";

export type LocalParityCase = {
  name: string;
  query: string;
  holdout?: boolean;
  params?: {
    facetFilters?: readonly (readonly string[])[];
    numericFilters?: readonly string[];
    filters?: string;
  };
  ids: readonly string[];
};

type LocalParityCaseData = {
  name: string;
  query: string;
  holdout?: boolean;
  params?: {
    facetFilters?: string[][];
    numericFilters?: string[];
    filters?: string;
  };
  ids: string[];
};

const loadLocalParityCase = (data: LocalParityCaseData): LocalParityCase =>
  data;

export const LOCAL_PARITY_CASES = parityCasesData.map(
  loadLocalParityCase,
) satisfies readonly LocalParityCase[];
