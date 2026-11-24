import { expect, test } from "bun:test";
import type { ModuleSearchResult } from "@/lib/modules";
import {
  createModuleSearchClient,
  moduleSearchStateMapping,
  MODULE_SEARCH_INDEX_NAMES,
} from "./module-search-client";

const moduleResult = (
  course: string,
  credits: number[],
  department = "CS",
): ModuleSearchResult => ({
  key: `${department}:${course}`,
  department,
  course,
  titleKey: `title-${course}`,
  nameZh: `Course ${course}`,
  nameEn: `Course ${course}`,
  semesters: ["11510"],
  credits,
  languages: ["english"],
  latestSemester: "11510",
  fillRate: null,
  instructors: [],
});

test("filters credit arrays and reports credit stats without the range filter", async () => {
  const client = createModuleSearchClient([
    moduleResult("1001", [1, 4]),
    moduleResult("2001", [2]),
    moduleResult("3001", [3], "MATH"),
  ]);
  const response = await client.search([
    {
      indexName: MODULE_SEARCH_INDEX_NAMES.courseCode,
      params: {
        numericFilters: [["credits>=2"], ["credits<=3"]],
        facets: ["credits"],
        hitsPerPage: 10,
        page: 0,
      },
    },
  ]);
  const result = response.results[0];

  expect(result?.hits.map(({ objectID }) => objectID)).toEqual([
    "CS:2001:title-2001",
    "MATH:3001:title-3001",
  ]);
  expect(result?.facets?.department).toEqual({ CS: 1, MATH: 1 });
  // The credits facet ignores the credits range so the slider keeps every stop.
  expect(result?.facets?.credits).toEqual({ "1": 1, "2": 1, "3": 1, "4": 1 });
  expect(result?.facets_stats?.credits).toEqual({
    min: 1,
    max: 4,
    avg: 2.5,
    sum: 10,
  });
});

test("round-trips the credits range through module search URL state", () => {
  const uiState = {
    [MODULE_SEARCH_INDEX_NAMES.relevance]: {
      query: "credits",
      range: { credits: "2:3" },
    },
  };
  const routeState = moduleSearchStateMapping.stateToRoute(uiState);

  expect(moduleSearchStateMapping.routeToState(routeState)).toEqual(uiState);
});
