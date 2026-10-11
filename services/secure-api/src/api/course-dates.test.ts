import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createCourseDatesApp } from "./course-dates";

const supabaseFrom = mock();
const upsert = mock();
const deleteResult = mock();

const auth = async (c: any, next: () => Promise<void>) => {
  c.set("user", { userId: "user-1" });
  await next();
};

const courseDatesApp = createCourseDatesApp({
  auth,
  supabase: { from: supabaseFrom } as never,
});

const request = (dates: unknown[]) =>
  courseDatesApp.request("http://test/CS-101", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates }),
  });

const queryForExistingDates = () => {
  const filters: Array<[string, string]> = [];
  const query: any = {
    eq(field: string, value: string) {
      filters.push([field, value]);
      return query;
    },
    then(
      resolve: (value: unknown) => unknown,
      reject: (error: unknown) => unknown,
    ) {
      const data = filters.some(([field]) => field === "submitter")
        ? [{ id: 42 }]
        : [{ id: 42 }, { id: 99 }];
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };
  return query;
};

describe("course-date ownership", () => {
  beforeEach(() => {
    supabaseFrom.mockReset();
    upsert.mockReset();
    deleteResult.mockReset();
    upsert.mockResolvedValue({ error: null });
    deleteResult.mockResolvedValue({ error: null });

    supabaseFrom.mockImplementation(() => ({
      select: () => queryForExistingDates(),
      delete: () => ({
        in: () => ({ eq: deleteResult }),
      }),
      upsert,
    }));
  });

  test("does not duplicate public rows when the normal save is repeated", async () => {
    const dates = [
      {
        id: 99,
        type: "exam",
        title: "Foreign row",
        date: "2026-10-10",
      },
      {
        id: 42,
        type: "quiz",
        title: "Own row",
        date: "2026-10-11",
      },
    ];

    const firstResponse = await request(dates);
    const secondResponse = await request(dates);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await firstResponse.json()).toEqual({ success: true });
    expect(await secondResponse.json()).toEqual({ success: true });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, [
      {
        id: 42,
        raw_id: "CS-101",
        type: "quiz",
        title: "Own row",
        date: "2026-10-11",
        submitter: "user-1",
      },
    ]);
    expect(upsert).toHaveBeenNthCalledWith(2, [
      {
        id: 42,
        raw_id: "CS-101",
        type: "quiz",
        title: "Own row",
        date: "2026-10-11",
        submitter: "user-1",
      },
    ]);
  });

  test("does not report success when deleting an old date fails", async () => {
    deleteResult.mockResolvedValueOnce({ error: { message: "database down" } });

    const response = await request([]);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to delete existing dates",
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});
