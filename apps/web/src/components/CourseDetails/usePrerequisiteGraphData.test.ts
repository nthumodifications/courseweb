import {
  buildPrerequisiteGraph,
  parsePrerequisites,
  type PrerequisiteGraphRow,
} from "@courseweb/shared";
import {
  fetchPrerequisiteGraphRows,
  type PrerequisiteGraphSupabaseClient,
  type PrerequisiteGraphSupabaseQuery,
} from "./usePrerequisiteGraphData";

const row = (
  values: Partial<PrerequisiteGraphRow> = {},
): PrerequisiteGraphRow => ({
  raw_id: "11510AA  000000",
  semester: "11510",
  department: "AA",
  course: "000000",
  name_zh: "填充資料",
  name_en: null,
  prerequisites: "未解析的填充資料",
  ...values,
});

const createFakeClient = (rows: PrerequisiteGraphRow[]) => {
  const requestedRanges: number[] = [];
  const client: PrerequisiteGraphSupabaseClient = {
    from: () => {
      const state: {
        semesters?: string[];
        names?: string[];
        requiresPrerequisites?: boolean;
        excludesEmptyPrerequisites?: boolean;
        from?: number;
        to?: number;
      } = {};
      const query: PrerequisiteGraphSupabaseQuery = {
        select: () => query,
        in: (column, values) => {
          if (column === "semester") state.semesters = values;
          if (column === "name_zh") state.names = values;
          return query;
        },
        not: () => {
          state.requiresPrerequisites = true;
          return query;
        },
        neq: () => {
          state.excludesEmptyPrerequisites = true;
          return query;
        },
        order: () => query,
        range: (from, to) => {
          state.from = from;
          state.to = to;
          requestedRanges.push(from);
          return query;
        },
        then: (onfulfilled, onrejected) => {
          const filtered = rows
            .filter(
              (candidate) =>
                (!state.semesters ||
                  state.semesters.includes(candidate.semester)) &&
                (!state.names || state.names.includes(candidate.name_zh)) &&
                (!state.requiresPrerequisites ||
                  candidate.prerequisites !== null) &&
                (!state.excludesEmptyPrerequisites ||
                  candidate.prerequisites !== ""),
            )
            .sort((left, right) => left.raw_id.localeCompare(right.raw_id));
          const from = state.from ?? 0;
          const to = state.to ?? filtered.length - 1;
          return Promise.resolve({
            data: filtered.slice(from, to + 1),
            error: null,
          }).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
  };
  return { client, requestedRanges };
};

test("paginates unlock rows and separately fetches requirement targets", async () => {
  const fillerRows = Array.from({ length: 2997 }, (_, index) =>
    row({
      raw_id: `11510AA  ${String(index).padStart(6, "0")}`,
    }),
  );
  const course = {
    raw_id: "11510ZZ  100000",
    semester: "11510",
    department: "ZZ",
    course: "100000",
    name_zh: "錨點課程",
  };
  const rows = [
    ...fillerRows,
    row({
      raw_id: "11510MATH101001",
      department: "MATH",
      course: "1010",
      name_zh: "微積分A一",
      prerequisites: null,
    }),
    row({
      raw_id: course.raw_id,
      department: course.department,
      course: course.course,
      name_zh: course.name_zh,
      prerequisites: null,
    }),
    row({
      raw_id: "11510ZZ  212000",
      department: "ZZ",
      course: "212000",
      name_zh: "解鎖課程",
      prerequisites: "先修科目 : 曾修錨點課程上述條件一定要有，則不擋修。",
    }),
  ];
  const { client, requestedRanges } = createFakeClient(rows);
  const parsed = parsePrerequisites(
    "先修科目 : 曾修微積分A一上述條件一定要有，則不擋修。",
  );

  const fetchedRows = await fetchPrerequisiteGraphRows(client, course, parsed);
  const graph = buildPrerequisiteGraph(course, parsed, fetchedRows);

  expect(requestedRanges).toContain(1000);
  expect(graph.requirements[0].items[0]).toMatchObject({
    moduleDepartment: "MATH",
    moduleCourse: "1010",
  });
  expect(graph.unlocks).toEqual([
    {
      name: "解鎖課程",
      courseRawId: "11510ZZ  212000",
      moduleDepartment: "ZZ",
      moduleCourse: "212000",
    },
  ]);
});
