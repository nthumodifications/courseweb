import parityCasesData from "./parity-cases.data.json";

export type LocalParityCase = {
  name: string;
  query: string;
  ids?: readonly string[];
  baselineTop10Overlap: number;
  allowedDifferences: readonly string[];
  params?: {
    facetFilters?: readonly (readonly string[])[];
    numericFilters?: readonly string[];
    filters?: string;
  };
};

type LocalParityCaseData = {
  name: string;
  query: string;
  ids?: string[];
  baselineTop10Overlap: number;
  allowedDifferences: string[];
  params?: {
    facetFilters?: string[][];
    numericFilters?: string[];
    filters?: string;
  };
};

const loadLocalParityCase = (data: LocalParityCaseData): LocalParityCase =>
  data;

export const LOCAL_PARITY_CASES = parityCasesData.map(
  loadLocalParityCase,
) satisfies readonly LocalParityCase[];
