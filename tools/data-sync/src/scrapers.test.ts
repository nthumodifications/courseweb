import { expect, test } from "bun:test";
import { syncCourseRows } from "./scrapers";
import type { Course } from "./types";

const course: Course = {
  capacity: 50,
  course: "CS 1010",
  department: "CS",
  semester: "11510",
  class: "0",
  name_en: "Computer Science",
  name_zh: "計算機科學",
  teacher_en: ["Wang"],
  teacher_zh: ["王老師"],
  credits: 3,
  reserve: 0,
  ge_type: "",
  ge_target: "",
  language: "中",
  compulsory_for: [],
  elective_for: [],
  venues: ["人社院"],
  times: ["1A"],
  first_specialization: [],
  second_specialization: [],
  cross_discipline: [],
  tags: [],
  no_extra_selection: false,
  note: "",
  closed_mark: "",
  prerequisites: "",
  restrictions: "",
  raw_id: "11510-CS 101000",
  enrolled: 10,
  updated_at: "2026-10-21T00:00:00.000Z",
};

test("continues to course upsert when course change logging times out", async () => {
  const upsertedChunks: Course[][] = [];
  const neverResolves = new Promise<never>(() => {});
  const supabase = {
    from(table: string) {
      if (table === "courses") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({ data: [course], error: null }),
              }),
            }),
          }),
          upsert: async (rows: Course[]) => {
            upsertedChunks.push(rows);
            return { error: null };
          },
        };
      }

      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                range: () => neverResolves,
              }),
            }),
          }),
        }),
      };
    },
  } as unknown as Parameters<typeof syncCourseRows>[0];

  await syncCourseRows(supabase, "11510", [course], {
    changeLogTimeoutMs: 10,
  });

  expect(upsertedChunks).toEqual([[course]]);
});
