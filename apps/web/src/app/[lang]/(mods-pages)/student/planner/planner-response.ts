import type { WithDeleted } from "rxdb";
import type { PlannerDataDocType } from "./rxdb";

export type PlannerDataResponseDocument = Omit<
  WithDeleted<PlannerDataDocType>,
  "includedSemesters"
> & {
  includedSemesters: string | string[];
};

const parseIncludedSemesters = (serialized: string): string[] => {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (semester): semester is string => typeof semester === "string",
    )
  ) {
    throw new Error("Planner response has invalid included semesters");
  }
  return parsed;
};

export const normalizePlannerDataDocuments = (
  documents: readonly PlannerDataResponseDocument[],
): WithDeleted<PlannerDataDocType>[] =>
  documents.map((document) => ({
    ...document,
    includedSemesters:
      typeof document.includedSemesters === "string"
        ? parseIncludedSemesters(document.includedSemesters)
        : document.includedSemesters,
  }));
