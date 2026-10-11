import { describe, expect, it, mock } from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

const rowsById = new Map<string, { raw_id: string }>();
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

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    from: () => ({
      select: () => ({ in: inQuery, eq: eqQuery }),
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
});
