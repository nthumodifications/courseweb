import { describe, expect, it } from "bun:test";
import {
  buildSearchManifest,
  buildSearchProjections,
  createSearchChunkApp,
  sha256Hex,
  searchValidityToken,
  type SearchManifestRpcRow,
  type SearchRowLoader,
  type SearchTextRowLoader,
} from "./search-chunk";
import {
  SEARCH_PROJECTION_FIELDS,
  SEARCH_PROJECTION_FORMAT_VERSION,
  deriveSearchFields,
  serializeSearchChunk,
  toSearchProjection,
  type CourseRow,
  type SearchSourceCourse,
} from "./search-projection";
import { getCourseHit } from "./search-fallback";
import type { SearchTextSourceRow } from "./search-chunk";

const realFixture = (await Bun.file(
  new URL("./fixtures/search-courses.search.json", import.meta.url),
).json()) as SearchSourceCourse[];
const syllabusFixture = (await Bun.file(
  new URL("./fixtures/search-syllabus.search.json", import.meta.url),
).json()) as SearchTextSourceRow[];

const manifestRows: SearchManifestRpcRow[] = [
  {
    semester: "11510",
    row_count: 1,
    max_updated_at: "2026-09-08T14:36:28.326+00:00",
  },
  {
    semester: "11210",
    row_count: 1,
    max_updated_at: "2026-09-07T14:36:28.326+00:00",
  },
];

const fixtureRowLoader: SearchRowLoader = async (_context, semester) =>
  realFixture.filter((row) => !semester || row.semester === semester);

const fixtureManifestLoader = async (
  _context: Parameters<SearchRowLoader>[0],
  semester?: string,
) => manifestRows.filter((row) => !semester || row.semester === semester);

const fixtureTextLoader: SearchTextRowLoader = async (_context, semester) =>
  syllabusFixture.filter((row) => row.semester === semester);

const app = createSearchChunkApp({
  loadRows: fixtureRowLoader,
  loadManifest: fixtureManifestLoader,
  loadTextRows: fixtureTextLoader,
});

const manifestEntry = (semester: string) =>
  manifestRows.find((row) => row.semester === semester)!;

describe("search projection", () => {
  it("contains every field in the single exported projection contract", () => {
    for (const row of realFixture) {
      const projection = toSearchProjection(row);

      expect(Object.keys(projection)).toEqual([...SEARCH_PROJECTION_FIELDS]);
      for (const field of SEARCH_PROJECTION_FIELDS) {
        expect(projection).toHaveProperty(field);
      }
    }
  });

  it("keeps fallback and chunk derived fields differential", () => {
    for (const row of realFixture) {
      const expected = deriveSearchFields(row);
      expect(getCourseHit(row as CourseRow)).toEqual(
        expect.objectContaining(expected),
      );
      expect(toSearchProjection(row)).toEqual(
        expect.objectContaining(expected),
      );
    }
  });

  it("preserves null source values and derives schedule fields", () => {
    const row = realFixture.find((course) => course.semester === "11210")!;
    expect(row.teacher_en).toBeNull();
    expect(row.compulsory_for).toBeNull();
    expect(row.elective_for).toBeNull();
    expect(toSearchProjection(row)).toEqual(
      expect.objectContaining({
        teacher_en: null,
        for_class: [],
        separate_times: [],
      }),
    );

    const scheduled = realFixture.find(
      (course) => course.semester === "11510",
    )!;
    expect(deriveSearchFields(scheduled).separate_times).toEqual([
      "W2",
      "W3",
      "W4",
    ]);
  });
});

describe("search manifest", () => {
  it("uses one aggregate loader call and never invokes the course-row loader", async () => {
    const measure = async (rowCount: number) => {
      let manifestQueryCount = 0;
      let courseRowFetchCount = 0;
      const measuredApp = createSearchChunkApp({
        loadRows: async () => {
          courseRowFetchCount += 1;
          throw new Error("manifest must not fetch course rows");
        },
        loadManifest: async () => {
          manifestQueryCount += 1;
          return [
            {
              semester: "11510",
              row_count: rowCount,
              max_updated_at: "2026-09-08T14:36:28.326+00:00",
            },
          ];
        },
        loadTextRows: fixtureTextLoader,
      });

      const response = await measuredApp.request("/manifest");
      expect(response.status).toBe(200);
      return { manifestQueryCount, courseRowFetchCount };
    };

    expect(await measure(100)).toEqual({
      manifestQueryCount: 1,
      courseRowFetchCount: 0,
    });
    expect(await measure(50_000)).toEqual({
      manifestQueryCount: 1,
      courseRowFetchCount: 0,
    });
  });

  it("returns one filtered entry with a metadata validity token", async () => {
    const response = await app.request("/manifest?semester=11510");
    const payload = (await response.json()) as {
      success: boolean;
      data: Awaited<ReturnType<typeof buildSearchManifest>>;
    };
    const source = manifestEntry("11510");

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.semesters).toHaveLength(1);
    expect(payload.data.semesters[0]).toEqual({
      semester: "11510",
      rowCount: source.row_count,
      maxUpdatedAt: source.max_updated_at,
      contentHash: await searchValidityToken(
        source.semester,
        source.row_count,
        source.max_updated_at,
      ),
    });
  });

  it("does not change the validity token when only untracked content changes", async () => {
    const original = await buildSearchManifest(manifestRows);
    const contentChanged = await buildSearchManifest(
      manifestRows.map(
        (row) => ({ ...row, course_content: "edited" }) as SearchManifestRpcRow,
      ),
    );
    expect(contentChanged).toEqual(original);
  });
});

describe("search chunk HTTP responses", () => {
  it("parses as client JSON and never emits a gzip body or header", async () => {
    for (const acceptEncoding of ["identity", "gzip", "br", "gzip, br"]) {
      const response = await app.request("/11510", {
        headers: { "Accept-Encoding": acceptEncoding },
      });
      const bytes = new Uint8Array(await response.arrayBuffer());

      expect(response.status).toBe(200);
      expect(response.headers.get("content-encoding")).toBeNull();
      expect([...bytes.slice(0, 2)]).not.toEqual([0x1f, 0x8b]);
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
        success: boolean;
        data: { courses: SearchSourceCourse[] };
      };
      expect(payload.success).toBe(true);
      expect(payload.data.courses).toHaveLength(1);
    }
  });

  it("uses the metadata validity token for the search chunk ETag", async () => {
    const response = await app.request("/11510");
    expect(response.headers.get("etag")).toBe(
      `"${await searchValidityToken(
        "11510",
        1,
        "2026-09-08T14:36:28.326+00:00",
      )}"`,
    );
    expect(response.headers.get("etag")).not.toBe(
      `"${await sha256Hex(
        serializeSearchChunk("11510", buildSearchProjections(realFixture)),
      )}"`,
    );
  });

  it("returns syllabus text by raw_id and nulls rows without a syllabus", async () => {
    const withSyllabus = await app.request("/11510/text");
    const withSyllabusPayload = (await withSyllabus.json()) as {
      data: { texts: Record<string, unknown> };
    };
    expect(withSyllabus.status).toBe(200);
    expect(withSyllabusPayload.data.texts["11510AES 450100"]).toEqual({
      brief: "Environmental microorganisms and their applications.",
      keywords: ["environment", "microbiology"],
    });

    const withoutSyllabus = await app.request("/11210/text");
    const withoutSyllabusPayload = (await withoutSyllabus.json()) as {
      data: { texts: Record<string, unknown> };
    };
    expect(withoutSyllabus.status).toBe(200);
    expect(withoutSyllabusPayload.data.texts["11210BAI 700600"]).toEqual({
      brief: null,
      keywords: null,
    });
  });

  it("keeps the existing ETag and 304 contract for manifest and both chunks", async () => {
    for (const path of ["/manifest", "/11510", "/11510/text"]) {
      const first = await app.request(path, {
        headers: { "Accept-Encoding": "identity" },
      });
      const etag = first.headers.get("etag");
      expect(etag).toBeTruthy();

      const notModified = await app.request(path, {
        headers: {
          "Accept-Encoding": "identity",
          "If-None-Match": etag!,
        },
      });
      expect(notModified.status).toBe(304);
      expect(notModified.ok).toBe(false);
      expect((await notModified.arrayBuffer()).byteLength).toBe(0);
    }
  });
});
