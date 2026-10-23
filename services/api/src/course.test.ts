import {
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

const rowsById = new Map<string, { raw_id: string }>();
const defaultChangeRows = [
  {
    id: 1,
    raw_id: "11510-CS 101000",
    semester: "11510",
    field: "capacity",
    old_value: 50,
    new_value: 60,
    kind: "changed",
    detected_at: "2026-10-21T00:00:00.000Z",
  },
];
let changeRows = defaultChangeRows;
const inQuery = mock(async (_column: string, ids: string[]) => ({
  data: ids.flatMap((id) => {
    const row = rowsById.get(id);
    return row ? [row] : [];
  }),
  error: null,
}));
const eqQuery = mock(async (_column: string, id: string) => ({
  data: [{ raw_id: id }],
  error: null,
}));
const changeInQuery = mock((_column: string, ids: string[]) => {
  changeInQueryCalls.push(ids);
  return createChain("course_changes", ids);
});
const changeInQueryCalls: string[][] = [];
const changeGteCalls: [string, string][] = [];

const createChain = (table: string, ids?: string[]) => {
  const result = {
    data:
      table === "course_changes"
        ? ids
          ? changeRows.filter((row) => ids.includes(row.raw_id))
          : changeRows
        : [],
    error: null,
  };
  const chain = {
    in: changeInQuery,
    gte: mock((column: string, value: string) => {
      changeGteCalls.push([column, value]);
      return chain;
    }),
    order: mock(() => chain),
    range: mock(async () => result),
    then: (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};

beforeEach(() => {
  changeRows = defaultChangeRows;
  changeInQueryCalls.length = 0;
  changeGteCalls.length = 0;
  inQuery.mockClear();
  changeInQuery.mockClear();
  setSystemTime();
});

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    from: (table: string) => ({
      select: () => ({
        in:
          table === "courses"
            ? inQuery
            : table === "course_changes"
              ? changeInQuery
              : async () => ({ data: [], error: null }),
        eq: table === "courses" ? eqQuery : () => createChain(table),
      }),
    }),
  })),
);

const { default: course } = await import("./course");

describe("course ID list bounds", () => {
  it("returns all repeated course IDs over the D1 statement limit", async () => {
    const params = new URLSearchParams();
    const expected = Array.from({ length: 101 }, (_, index) => {
      const raw_id = `course-${index}`;
      const row = { raw_id };
      rowsById.set(raw_id, row);
      params.append("courses", raw_id);
      return row;
    });

    const response = await course.request(`/?${params}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    expect(inQuery).toHaveBeenCalledTimes(2);
    expect(inQuery.mock.calls.map(([, ids]) => ids.length)).toEqual([100, 1]);
  });

  it("returns all course dates for an oversized course list", async () => {
    const params = new URLSearchParams();
    for (let index = 0; index < 101; index += 1) {
      params.append("courses", `course-${index}`);
    }

    const response = await course.request(`/dates?${params}`);

    expect(response.status).toBe(200);
  });

  it("rejects an oversized course path parameter", async () => {
    const response = await course.request(`/${"x".repeat(101)}`);

    expect(response.status).toBe(400);
  });

  it("preserves the normal course path request", async () => {
    const response = await course.request("/11510-CS 101000");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ raw_id: "11510-CS 101000" });
  });

  it("returns newest changes for one course with public caching", async () => {
    const response = await course.request("/11510-CS 101000/changes");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(await response.json()).toEqual(changeRows);
  });

  it("returns recent semester changes with public caching", async () => {
    const response = await course.request("/changes?semester=11510&days=7");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(await response.json()).toEqual(defaultChangeRows);
  });

  it("validates the by-courses change query", async () => {
    expect((await course.request("/changes/for-courses")).status).toBe(400);
    expect(
      (await course.request("/changes/for-courses?courses=course-1&days=0"))
        .status,
    ).toBe(400);
    expect(
      (await course.request("/changes/for-courses?courses=course-1&days=61"))
        .status,
    ).toBe(400);

    const tooMany = new URLSearchParams();
    for (let index = 0; index < 101; index += 1) {
      tooMany.append("courses", `course-${index}`);
    }
    expect(
      (await course.request(`/changes/for-courses?${tooMany}`)).status,
    ).toBe(400);
  });

  it("queries unique course IDs in chunks and caps merged changes", async () => {
    changeRows = Array.from({ length: 201 }, (_, index) => ({
      ...defaultChangeRows[0],
      id: index + 1,
      raw_id: `course-${index % 100}`,
      detected_at: new Date(Date.UTC(2026, 9, 21, 0, index)).toISOString(),
    }));
    const params = new URLSearchParams();
    for (let index = 0; index < 100; index += 1) {
      params.append("courses", `course-${index}`);
    }

    const response = await course.request(`/changes/for-courses?${params}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    const rows = await response.json();
    expect(rows).toHaveLength(200);
    expect(rows[0].id).toBe(201);
    expect(rows.at(-1).id).toBe(2);
    expect(changeInQueryCalls).toEqual([
      Array.from({ length: 100 }, (_, index) => `course-${index}`),
    ]);
  });

  it("uses fourteen days when days is omitted", async () => {
    setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
    const response = await course.request(
      "/changes/for-courses?courses=course-1",
    );

    expect(response.status).toBe(200);
    expect(changeInQueryCalls).toEqual([["course-1"]]);
    expect(changeGteCalls).toEqual([
      ["detected_at", "2026-10-09T12:00:00.000Z"],
    ]);
  });

  it("uses the explicit days window when provided", async () => {
    setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
    const response = await course.request(
      "/changes/for-courses?courses=course-1&days=3",
    );

    expect(response.status).toBe(200);
    expect(changeGteCalls).toEqual([
      ["detected_at", "2026-10-20T12:00:00.000Z"],
    ]);
  });
});
