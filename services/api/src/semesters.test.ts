import { describe, expect, it, mock, setSystemTime } from "bun:test";
import semesterRoute, {
  buildSemesterResponse,
  clearSemesterCourseCountCache,
  nextSemesterId,
  relevantCourseCountIds,
} from "./semesters";
import { semesterInfo } from "@courseweb/shared/semester";

describe("semester API data", () => {
  it("advances candidate IDs through fall, spring, and summer", () => {
    expect(nextSemesterId("11510")).toBe("11520");
    expect(nextSemesterId("11520")).toBe("11530");
    expect(nextSemesterId("11530")).toBe("11610");
    expect(nextSemesterId("invalid")).toBeUndefined();
  });

  it("checks recent dates and the next two course candidates", () => {
    const ids = relevantCourseCountIds(semesterInfo, new Date("2026-10-01"));
    expect(ids).toContain("11510");
    expect(ids).toContain("11520");
    expect(ids).toContain("11530");
  });

  it("counts next-two candidate IDs even when they have no date rows", () => {
    const rows = semesterInfo.filter((row) =>
      ["11510", "11520"].includes(row.id),
    );
    expect(
      relevantCourseCountIds(rows, new Date("2027-06-20T12:00:00Z")),
    ).toContain("11610");
  });

  it("keeps bundled course availability for older rows outside the live count window", async () => {
    const response = await buildSemesterResponse({
      semesters: semesterInfo,
      now: new Date("2026-10-01T12:00:00Z"),
    });
    expect(response.find((row) => row.id === "11410")?.hasCourses).toBe(true);
    expect(response.find((row) => row.id === "11520")?.hasCourses).toBe(false);
  });

  it("returns typed date rows, live course presence, and cache headers", async () => {
    const originalFetch = globalThis.fetch;
    const originalNow = new Date();
    const requests: string[] = [];
    const fetcher = mock(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const semester = url.searchParams.get("semester")?.slice(3) ?? "";
      requests.push(url.searchParams.get("semester") ?? "");
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": `0-0/${semester === "11520" ? 3 : 0}` },
      });
    }) as unknown as typeof fetch;
    const rows = [
      ...semesterInfo.map((row) => ({
        ...row,
        hasCourses: row.id === "11510",
      })),
    ];

    try {
      setSystemTime(new Date("2026-10-01T12:00:00Z"));
      clearSemesterCourseCountCache();
      const result = await buildSemesterResponse({
        semesters: rows,
        now: new Date("2026-10-01T12:00:00Z"),
        supabaseUrl: "https://supabase.example",
        serviceRoleKey: "test-key",
        fetcher,
      });
      const next = result.find((row) => row.id === "11520");
      expect(next).toMatchObject({
        begins: "2027-02-15",
        ends: "2027-06-06",
        hasCourses: true,
        estimated: false,
      });
      expect(requests).toContain("eq.11520");

      clearSemesterCourseCountCache();
      globalThis.fetch = fetcher;
      const response = await semesterRoute.request(
        "/",
        {},
        {
          DB: {
            prepare: () => ({
              all: async () => ({
                results: [
                  {
                    semester: "11520",
                    begins: "2027-02-15",
                    ends: "2027-06-06",
                  },
                ],
              }),
            }),
          } as never,
          SUPABASE_URL: "https://supabase.example",
          SUPABASE_SERVICE_ROLE_KEY: "test-key",
        },
      );
      const body = (await response.json()) as Array<{
        id: string;
        begins: string;
        ends: string;
        hasCourses: boolean;
      }>;
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("s-maxage=1800");
      expect(body.find((row) => row.id === "11520")).toMatchObject({
        begins: "2027-02-15",
        ends: "2027-06-06",
        hasCourses: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
      setSystemTime(originalNow);
      clearSemesterCourseCountCache();
    }
  });

  it("returns a course-bearing undated candidate with dates estimated from last year", async () => {
    const rows = semesterInfo.filter((row) =>
      ["11510", "11520"].includes(row.id),
    );
    const requested: string[] = [];
    clearSemesterCourseCountCache();
    const result = await buildSemesterResponse({
      semesters: rows,
      now: new Date("2027-06-20T12:00:00Z"),
      supabaseUrl: "https://supabase.example",
      serviceRoleKey: "test-key",
      fetcher: (async (input: RequestInfo | URL) => {
        const semester = new URL(String(input)).searchParams.get("semester");
        requested.push(semester ?? "");
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Range": `0-0/${semester === "eq.11610" ? 4 : 0}`,
          },
        });
      }) as typeof fetch,
    });

    expect(requested).toContain("eq.11610");
    expect(result.find((row) => row.id === "11610")).toMatchObject({
      begins: "2027-09-07",
      ends: "2027-12-27",
      hasCourses: true,
      estimated: true,
    });
    clearSemesterCourseCountCache();
  });
});
