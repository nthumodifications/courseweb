import { describe, expect, it } from "bun:test";
import { buildings as sharedBuildings } from "../../../packages/shared/src/constants/venues";
import { semesterInfo as sharedSemesters } from "../../../packages/shared/src/constants/semester";
import {
  COURSE_INSIGHT_BUILDINGS,
  COURSE_INSIGHT_SEMESTERS,
  getCourseInsightBuildingDefinition,
} from "./course-insights-mirrors";

describe("course insights Worker-local mirrors", () => {
  it("keeps its semester projection aligned with the shared source", () => {
    expect(COURSE_INSIGHT_SEMESTERS).toEqual(
      sharedSemesters.map(({ id, year, semester }) => ({ id, year, semester })),
    );
  });

  it("keeps its building map aligned with the shared source", () => {
    expect(COURSE_INSIGHT_BUILDINGS).toEqual(
      sharedBuildings.map(({ code, building }) => [
        code.chinese,
        code.english,
        building.chinese,
        building.english,
      ]),
    );
  });

  it("resolves venue labels and ignores unrecognized locations", () => {
    expect(getCourseInsightBuildingDefinition("DELTA台達629")).toMatchObject({
      code: "DELTA",
      nameZh: "台達館",
    });
    expect(getCourseInsightBuildingDefinition("unknown")).toBeUndefined();
  });
});
