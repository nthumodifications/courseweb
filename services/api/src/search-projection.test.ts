import { describe, expect, test } from "bun:test";
import {
  SEARCH_PROJECTION_FORMAT_VERSION,
  deriveSearchFields,
  serializeSearchChunk,
  sortSearchProjections,
  toSearchProjection,
} from "./search-projection";
import fixture from "./fixtures/search-courses.search.json";

const sourceCourse = (overrides: Record<string, unknown> = {}) => ({
  ...fixture[0],
  ...overrides,
});

describe("search projection contract", () => {
  test("derives object id, level, split times, and elective-first classes", () => {
    expect(
      deriveSearchFields({
        raw_id: "11510AES 450100",
        course: "450",
        times: ["W2W3W4"],
        elective_for: ["通識"],
        compulsory_for: ["原科院學士班112B"],
        note: "本課程不開放大學部修習",
        restrictions: "",
      } as never),
    ).toEqual({
      objectID: "11510AES 450100",
      courseLevel: "4000",
      separate_times: ["W2", "W3", "W4"],
      for_class: ["通識", "原科院學士班112B"],
      audience: ["exclusion:undergraduate"],
    });
  });

  test("serializes only the stable projection fields and sorts by raw id", () => {
    const first = toSearchProjection(sourceCourse());
    const second = toSearchProjection(
      sourceCourse({ raw_id: "11210BAI 700600", course: "700", times: [] }),
    );
    expect(first).toMatchObject({
      objectID: first.raw_id,
      courseLevel: "4000",
    });
    expect(
      sortSearchProjections([first, second]).map((item) => item.raw_id),
    ).toEqual(["11210BAI 700600", "11510AES 450100"]);
    expect(JSON.parse(serializeSearchChunk("11510", [first, second]))).toEqual({
      success: true,
      data: {
        schemaVersion: SEARCH_PROJECTION_FORMAT_VERSION,
        semester: "11510",
        courses: [second, first],
      },
    });
  });
});
