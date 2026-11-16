import { describe, expect, test } from "bun:test";
import * as canonical from "../../../packages/shared/src/utils/course-audience-tags";
import {
  COURSE_AUDIENCE_NON_MATCHING_CASES,
  COURSE_AUDIENCE_PARSE_CASES,
  COURSE_AUDIENCE_PARSE_TEXT_CASES,
} from "../../../packages/shared/src/utils/course-audience-tags.cases";
import * as dataSync from "../../../tools/data-sync/src/course-audience-tags";
import * as worker from "./utils/course-audience-tags";

const parityCases = [
  ...COURSE_AUDIENCE_PARSE_CASES.map(([note]) => ({ note })),
  ...COURSE_AUDIENCE_PARSE_TEXT_CASES.map(([text]) => text),
  ...COURSE_AUDIENCE_NON_MATCHING_CASES.map((note) => ({ note })),
];

const normalizeSource = (source: string) =>
  source
    .slice(source.indexOf("export type CourseAudienceTagRelation"))
    .replaceAll("\r\n", "\n");

describe("course audience parser mirrors", () => {
  test.each(parityCases)("matches the canonical parser for %j", (text) => {
    const expectedTags = canonical.parseCourseAudienceTags(text);
    const expectedFacets = canonical.courseAudienceFacetValues(text);

    expect(worker.parseCourseAudienceTags(text)).toEqual(expectedTags);
    expect(dataSync.parseCourseAudienceTags(text)).toEqual(expectedTags);
    expect(worker.courseAudienceFacetValues(text)).toEqual(expectedFacets);
    expect(dataSync.courseAudienceFacetValues(text)).toEqual(expectedFacets);
  });

  test("keeps both mirrors normalized-source equal to the canonical parser", async () => {
    const canonicalSource = await Bun.file(
      new URL(
        "../../../packages/shared/src/utils/course-audience-tags.ts",
        import.meta.url,
      ),
    ).text();
    const workerSource = await Bun.file(
      new URL("./utils/course-audience-tags.ts", import.meta.url),
    ).text();
    const dataSyncSource = await Bun.file(
      new URL(
        "../../../tools/data-sync/src/course-audience-tags.ts",
        import.meta.url,
      ),
    ).text();

    expect(normalizeSource(workerSource)).toBe(
      normalizeSource(canonicalSource),
    );
    expect(normalizeSource(dataSyncSource)).toBe(
      normalizeSource(canonicalSource),
    );
  });
});
