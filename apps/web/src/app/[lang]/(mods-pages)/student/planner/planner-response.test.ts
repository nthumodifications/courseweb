import { describe, expect, test } from "bun:test";
import {
  normalizePlannerDataDocuments,
  type PlannerDataResponseDocument,
} from "./planner-response";

const baseDocument = {
  id: "planner-1",
  title: "Computer Science",
  department: "CS",
  requiredCredits: 128,
  enrollmentYear: "111",
  graduationYear: "115",
  description: null,
  _deleted: false,
};

describe("normalizePlannerDataDocuments", () => {
  test("deserializes the API's legacy string representation", () => {
    const documents: PlannerDataResponseDocument[] = [
      { ...baseDocument, includedSemesters: '["111-1", "111-2"]' },
    ];

    expect(
      normalizePlannerDataDocuments(documents)[0]?.includedSemesters,
    ).toEqual(["111-1", "111-2"]);
  });

  test("preserves an already deserialized response", () => {
    const documents: PlannerDataResponseDocument[] = [
      { ...baseDocument, includedSemesters: ["111-1", "111-2"] },
    ];

    expect(
      normalizePlannerDataDocuments(documents)[0]?.includedSemesters,
    ).toEqual(["111-1", "111-2"]);
  });
});
