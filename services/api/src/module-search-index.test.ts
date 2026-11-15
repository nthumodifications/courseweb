import { describe, expect, it } from "bun:test";
import {
  aggregateModuleSearchRows,
  decodeModuleSearchIndex,
  encodeModuleSearchIndex,
  type ModuleSearchRow,
} from "./module-search-index";

const row = (overrides: Partial<ModuleSearchRow> = {}): ModuleSearchRow => ({
  semester: "11510",
  department: "CS",
  course: "1010",
  name_zh: "程式設計",
  name_en: "Programming",
  credits: 3,
  language: "英",
  teacher_zh: ["王老師"],
  teacher_en: ["Wang"],
  capacity: 50,
  enrolled: 40,
  ...overrides,
});

describe("compact module search index", () => {
  it("round trips aggregated module results through JSON", () => {
    const results = aggregateModuleSearchRows([
      row({ semester: "11410", capacity: 60, enrolled: 42 }),
      row({
        semester: "11510",
        language: "中英",
        teacher_zh: ["王老師", "李老師"],
        teacher_en: ["Wang", "Lee"],
      }),
      row({
        department: "EE",
        course: "2020",
        name_zh: "電路學",
        name_en: "Circuit Theory",
        language: "中",
      }),
    ]);

    const payload = JSON.parse(
      JSON.stringify(encodeModuleSearchIndex(results)),
    );

    expect(decodeModuleSearchIndex(payload)).toEqual(results);
    expect(payload.d).toEqual(["CS", "EE"]);
    expect(payload.t).toHaveLength(2);
    expect(payload.r[0]).toHaveLength(10);
    expect(payload.v).toBe(1);
  });
});
