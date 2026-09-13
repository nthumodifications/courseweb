import { describe, expect, it } from "bun:test";
import {
  buildSearchManifest,
  buildSearchProjections,
  createSearchChunkApp,
  sha256Hex,
  serializeSearchManifest,
  type SearchRowLoader,
} from "./search-chunk";
import {
  SEARCH_PROJECTION_FORMAT_VERSION,
  SEARCH_SOURCE_COLUMNS,
  deriveSearchFields,
  serializeSearchChunk,
  toSearchProjection,
  type CourseRow,
} from "./search-projection";
import { getCourseHit } from "./search-fallback";

const realFixture = (await Bun.file(
  new URL("./fixtures/search-courses.real.json", import.meta.url),
).json()) as CourseRow[];

const fixtureById = (rawId: string) => {
  const row = realFixture.find((course) => course.raw_id === rawId);
  if (!row) throw new Error(`Fixture row not found: ${rawId}`);
  return row;
};

const fixtureLoader: SearchRowLoader = async (_context, semester) =>
  realFixture.filter((course) => !semester || course.semester === semester);

const manifestEntry = (
  manifest: Awaited<ReturnType<typeof buildSearchManifest>>,
  semester: string,
) => {
  const entry = manifest.semesters.find((item) => item.semester === semester);
  if (!entry) throw new Error(`Manifest entry not found: ${semester}`);
  return entry;
};

describe("search projection", () => {
  it("uses one differential derivation for fallback hits and chunks", () => {
    for (const row of realFixture) {
      const expected = {
        objectID: row.raw_id,
        courseLevel: `${row.course[0] ?? ""}000`,
        separate_times: row.times.flatMap(
          (time) => time.match(/.{1,2}/g) ?? [],
        ),
        for_class: [...(row.elective_for ?? []), ...(row.compulsory_for ?? [])],
      };

      expect(deriveSearchFields(row)).toEqual(expected);
      expect(getCourseHit(row)).toEqual(expect.objectContaining(expected));
      expect(toSearchProjection(row)).toEqual(
        expect.objectContaining(expected),
      );
    }
  });

  it("contains exactly the result and facet fields, without detail content", () => {
    const expectedKeys = [
      "objectID",
      ...SEARCH_SOURCE_COLUMNS,
      "courseLevel",
      "separate_times",
      "for_class",
    ];

    for (const row of realFixture) {
      const projection = toSearchProjection(row);
      expect(Object.keys(projection)).toEqual(expectedKeys);
      for (const omitted of [
        "brief",
        "content",
        "keywords",
        "scores",
        "course_syllabus",
        "course_scores",
        "time_slots",
      ]) {
        expect(projection).not.toHaveProperty(omitted);
      }
    }
  });

  it("covers live schedule, nullability, odd levels, and unicode cases", () => {
    expect(
      deriveSearchFields(fixtureById("11510CL  534200")).separate_times,
    ).toEqual(["M3", "M4", "Mn"]);
    expect(
      deriveSearchFields(fixtureById("11510EMBA509600")).separate_times,
    ).toEqual(["U2"]);

    const periods = new Set(
      realFixture.flatMap((row) =>
        deriveSearchFields(row).separate_times.map((slot) => slot[1]),
      ),
    );
    expect(
      [..."123456789nab cd".replace(" ", "")].every((period) =>
        periods.has(period),
      ),
    ).toBe(true);

    const nullRow = fixtureById("11210BAI 700600");
    expect(nullRow.teacher_en).toBeNull();
    expect(nullRow.compulsory_for).toBeNull();
    expect(nullRow.elective_for).toBeNull();
    expect(toSearchProjection(nullRow)).toEqual(
      expect.objectContaining({ teacher_en: null, for_class: [] }),
    );
    const absentFor = {
      ...nullRow,
      compulsory_for: undefined,
      elective_for: undefined,
    } as unknown as CourseRow;
    expect(deriveSearchFields(absentFor).for_class).toEqual([]);

    expect(deriveSearchFields(fixtureById("11510AES 510100")).courseLevel).toBe(
      "5000",
    );
    expect(
      realFixture.some((row) => /[\u3400-\u9fff]/u.test(row.name_zh)),
    ).toBe(true);
  });
});

describe("search chunk manifest and serialization", () => {
  it("reports a small semester and a real-data-derived large-chunk size", async () => {
    const smallManifest = await buildSearchManifest(
      realFixture.filter((row) => row.semester === "11210"),
    );
    expect(manifestEntry(smallManifest, "11210").rowCount).toBe(1);

    // The committed fixture is intentionally trimmed. Repeat the real rows
    // for a serialization-size stress test rather than committing a 3,165-row
    // dump; 11510 has 3,165 live rows as of fixture capture.
    const realLargeSemesterRows = realFixture.filter(
      (row) => row.semester === "11510",
    );
    const largeRows = Array.from(
      { length: 3_165 },
      (_, index) =>
        realLargeSemesterRows[index % realLargeSemesterRows.length]!,
    );
    const largeManifest = await buildSearchManifest(largeRows);
    expect(manifestEntry(largeManifest, "11510").rowCount).toBe(3_165);
  });

  it("changes content hashes for deletion, edits, and format versions", async () => {
    const original = await buildSearchManifest(realFixture);
    const originalEntry = manifestEntry(original, "11510");
    const originalManifestHash = await sha256Hex(
      serializeSearchManifest(original),
    );

    const deleted = await buildSearchManifest(
      realFixture.filter((row) => row.raw_id !== "11510CL  534200"),
    );
    expect(manifestEntry(deleted, "11510").contentHash).not.toBe(
      originalEntry.contentHash,
    );
    expect(await sha256Hex(serializeSearchManifest(deleted))).not.toBe(
      originalManifestHash,
    );

    const edited = realFixture.map((row) =>
      row.raw_id === "11510CL  534200"
        ? { ...row, name_en: `${row.name_en} (edited)` }
        : row,
    );
    const editedManifest = await buildSearchManifest(edited);
    expect(manifestEntry(editedManifest, "11510").contentHash).not.toBe(
      originalEntry.contentHash,
    );
    expect(await sha256Hex(serializeSearchManifest(editedManifest))).not.toBe(
      originalManifestHash,
    );

    const newVersion = await buildSearchManifest(
      realFixture,
      SEARCH_PROJECTION_FORMAT_VERSION + 1,
    );
    expect(serializeSearchManifest(newVersion)).not.toBe(
      serializeSearchManifest(original),
    );
    expect(manifestEntry(newVersion, "11510").contentHash).not.toBe(
      originalEntry.contentHash,
    );
    expect(await sha256Hex(serializeSearchManifest(newVersion))).not.toBe(
      originalManifestHash,
    );
  });

  it("is stable for repeated serialization and reordered input", async () => {
    const projections = buildSearchProjections(realFixture);
    const reversed = buildSearchProjections([...realFixture].reverse());
    const first = serializeSearchChunk("11510", projections);
    const second = serializeSearchChunk("11510", reversed);
    expect(first).toBe(second);
    expect(await sha256Hex(first)).toBe(await sha256Hex(second));

    const manifest = await buildSearchManifest(realFixture);
    const repeated = await buildSearchManifest([...realFixture]);
    expect(serializeSearchManifest(manifest)).toBe(
      serializeSearchManifest(repeated),
    );
  });
});

describe("search chunk HTTP routes", () => {
  const app = createSearchChunkApp(fixtureLoader);

  it("returns the manifest and a versioned projected semester chunk", async () => {
    const manifestResponse = await app.request("/manifest", {
      headers: { "Accept-Encoding": "identity" },
    });
    expect(manifestResponse.status).toBe(200);
    const manifestBody = (await manifestResponse.json()) as {
      success: boolean;
      data: Awaited<ReturnType<typeof buildSearchManifest>>;
    };
    expect(manifestBody.success).toBe(true);
    expect(manifestBody.data.schemaVersion).toBe(
      SEARCH_PROJECTION_FORMAT_VERSION,
    );
    expect(manifestBody.data.semesters.map((item) => item.semester)).toEqual([
      "11210",
      "11510",
    ]);

    const chunkResponse = await app.request("/11510", {
      headers: { "Accept-Encoding": "identity" },
    });
    expect(chunkResponse.status).toBe(200);
    expect(chunkResponse.headers.get("cache-control")).toContain("public");
    expect(chunkResponse.headers.get("etag")).toBe(
      `"${manifestEntry(manifestBody.data, "11510").contentHash}"`,
    );
    const chunkBody = (await chunkResponse.json()) as {
      success: boolean;
      data: { schemaVersion: number; semester: string; courses: CourseRow[] };
    };
    expect(chunkBody.success).toBe(true);
    expect(chunkBody.data.schemaVersion).toBe(SEARCH_PROJECTION_FORMAT_VERSION);
    expect(chunkBody.data.semester).toBe("11510");
    expect(chunkBody.data.courses).toEqual(
      buildSearchProjections(
        realFixture.filter((row) => row.semester === "11510"),
      ),
    );
  });

  it("returns 304 with no body for a matching ETag and 200 otherwise", async () => {
    const first = await app.request("/11510", {
      headers: { "Accept-Encoding": "identity" },
    });
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();

    const notModified = await app.request("/11510", {
      headers: {
        "Accept-Encoding": "identity",
        "If-None-Match": etag!,
      },
    });
    expect(notModified.status).toBe(304);
    expect(notModified.ok).toBe(false);
    expect((await notModified.arrayBuffer()).byteLength).toBe(0);

    const changed = await app.request("/11510", {
      headers: {
        "Accept-Encoding": "identity",
        "If-None-Match": '"does-not-match"',
      },
    });
    expect(changed.status).toBe(200);
    expect((await changed.text()).length).toBeGreaterThan(0);
  });

  it("also validates the manifest with its own ETag", async () => {
    const first = await app.request("/manifest", {
      headers: { "Accept-Encoding": "identity" },
    });
    const notModified = await app.request("/manifest", {
      headers: {
        "Accept-Encoding": "identity",
        "If-None-Match": first.headers.get("etag")!,
      },
    });
    expect(notModified.status).toBe(304);
    expect((await notModified.arrayBuffer()).byteLength).toBe(0);
  });

  it("returns a body the client can parse, whatever encoding is offered", async () => {
    // Regression: the endpoint used to gzip the body itself and declare
    // Content-Encoding. The browser then handed the client gzipped bytes, so
    // JSON.parse threw on the 0x1f8b magic and local search never loaded.
    // Compression belongs to the edge; the body we emit must always be JSON.
    for (const acceptEncoding of ["gzip", "br", "gzip, deflate, br", "*"]) {
      const response = await app.request("/11510", {
        headers: { "Accept-Encoding": acceptEncoding },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-encoding")).toBeNull();

      const bytes = new Uint8Array(await response.clone().arrayBuffer());
      expect([bytes[0], bytes[1]]).not.toEqual([0x1f, 0x8b]);

      const body = (await response.json()) as { success: boolean };
      expect(body.success).toBe(true);
    }

    const invalid = await app.request("/not-a-semester", {
      headers: { "Accept-Encoding": "identity" },
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()) as { success: boolean }).toEqual(
      expect.objectContaining({ success: false }),
    );

    const unknown = await app.request("/99999", {
      headers: { "Accept-Encoding": "identity" },
    });
    expect(unknown.status).toBe(404);
    expect((await unknown.json()) as { success: boolean }).toEqual({
      success: false,
      error: { message: "Semester not found" },
    });
  });
});
