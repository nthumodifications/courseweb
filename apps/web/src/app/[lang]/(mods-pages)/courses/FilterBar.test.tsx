import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import { FilterBarContent } from "./FilterBar";
import {
  FILTER_SECTION_IDS,
  type FilterSectionCounts,
  type FilterSectionId,
} from "./Filters";

test("renders filter chips with active values and the combined more-filter count", () => {
  const counts: FilterSectionCounts = Object.fromEntries(
    FILTER_SECTION_IDS.map((id) => [id, 0]),
  ) as FilterSectionCounts;
  counts.department = 2;
  counts.tags = 2;
  counts.venues = 1;

  const sections = Object.fromEntries(
    FILTER_SECTION_IDS.map((id) => [id, id]),
  ) as Record<FilterSectionId, string>;
  const markup = renderToStaticMarkup(
    <FilterBarContent
      labels={{ sections, more: "更多篩選" }}
      counts={counts}
      selectedCourses={[]}
      openSections={[]}
      onOpenChange={() => undefined}
    />,
  );

  expect(markup).toContain("compulsory");
  expect(markup).toContain("department · 2");
  expect(markup).toContain("time");
  expect(markup).toContain("language");
  expect(markup).toContain("ge_target");
  expect(markup).toContain("level");
  expect(markup).toContain("更多篩選 · 3");
});
