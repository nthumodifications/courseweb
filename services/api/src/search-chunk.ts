import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import {
  SEARCH_PROJECTION_FORMAT_VERSION,
  SEARCH_QUERY_COLUMNS,
  type SearchSourceCourse,
  serializeSearchChunk,
  sortSearchProjections,
  toSearchProjection,
} from "./search-projection";

const PAGE_SIZE = 1_000;
const CHUNK_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const SEARCH_SOURCE_SELECT = SEARCH_QUERY_COLUMNS.join(",");
const semesterParamSchema = z.object({
  semester: z.string().regex(/^\d{5}$/, "Invalid semester id"),
});

export type SearchRowLoader = (
  c: Context,
  semester?: string,
) => Promise<SearchSourceCourse[]>;

/** Load only the source columns used by the client-side search projection. */
export const loadSearchRows: SearchRowLoader = async (c, semester) => {
  const client = supabase_server(c);
  const rows: SearchSourceCourse[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = client
      .from("courses")
      .select(SEARCH_SOURCE_SELECT)
      .order("raw_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (semester) query = query.eq("semester", semester);

    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as unknown as SearchSourceCourse[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
};

export const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export type SearchManifestEntry = {
  semester: string;
  rowCount: number;
  maxUpdatedAt: string | null;
  contentHash: string;
};

export type SearchManifestData = {
  schemaVersion: number;
  semesters: SearchManifestEntry[];
};

export const buildSearchProjections = (rows: SearchSourceCourse[]) =>
  sortSearchProjections(rows.map(toSearchProjection));

/** Build manifest metadata from the same projection bytes served by chunks. */
export const buildSearchManifest = async (
  rows: SearchSourceCourse[],
  schemaVersion = SEARCH_PROJECTION_FORMAT_VERSION,
): Promise<SearchManifestData> => {
  const bySemester = new Map<string, SearchSourceCourse[]>();
  for (const row of rows) {
    const semesterRows = bySemester.get(row.semester) ?? [];
    semesterRows.push(row);
    bySemester.set(row.semester, semesterRows);
  }

  const semesters = await Promise.all(
    [...bySemester.keys()]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map(async (semester): Promise<SearchManifestEntry> => {
        const semesterRows = bySemester.get(semester)!;
        const projections = buildSearchProjections(semesterRows);
        const maxUpdatedAt = semesterRows.reduce<string | null>(
          (max, row) =>
            max === null || row.updated_at > max ? row.updated_at : max,
          null,
        );
        return {
          semester,
          rowCount: semesterRows.length,
          maxUpdatedAt,
          contentHash: await sha256Hex(
            serializeSearchChunk(semester, projections, schemaVersion),
          ),
        };
      }),
  );

  return { schemaVersion, semesters };
};

export const serializeSearchManifest = (data: SearchManifestData) =>
  JSON.stringify({ success: true, data });

const ifNoneMatchMatches = (header: string | undefined, etag: string) =>
  header
    ?.split(",")
    .map((value) => value.trim())
    .some(
      (value) => value === "*" || value === etag || value === `W/${etag}`,
    ) ?? false;

const responseHeaders = (etag: string) =>
  new Headers({
    "Cache-Control": CHUNK_CACHE_CONTROL,
    ETag: etag,
    Vary: "Accept-Encoding",
    "Content-Type": "application/json; charset=UTF-8",
  });

const jsonResponse = (c: Context, body: string, etag: string, status = 200) => {
  const headers = responseHeaders(etag);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    // Client contract: Fetch Response.ok is false for 304; status === 304 is
    // the cache-hit signal and the client must reuse its stored chunk bytes.
    return new Response(null, { status: 304, headers });
  }

  // Deliberately no manual Content-Encoding. Compressing here and declaring
  // the encoding ourselves produced responses the browser handed to the client
  // still gzipped, so JSON.parse saw the 0x1f8b gzip magic and threw. The edge
  // already negotiates and applies compression for JSON responses.
  return new Response(body, { status, headers });
};

const errorResponse = (message: string, status: 400 | 404 | 500) =>
  new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

const appError = (error: unknown) => {
  console.error("Search chunk error:", error);
  return errorResponse(
    error instanceof Error ? error.message : "Search chunk request failed",
    500,
  );
};

export const createSearchChunkApp = (
  loadRows: SearchRowLoader = loadSearchRows,
) =>
  new Hono()
    .get("/manifest", async (c) => {
      try {
        const data = await buildSearchManifest(await loadRows(c));
        const body = serializeSearchManifest(data);
        return jsonResponse(c, body, `"${await sha256Hex(body)}"`);
      } catch (error) {
        return appError(error);
      }
    })
    .get("/:semester", zValidator("param", semesterParamSchema), async (c) => {
      const { semester } = c.req.valid("param");
      try {
        const rows = await loadRows(c, semester);
        if (rows.length === 0) return errorResponse("Semester not found", 404);

        const projections = buildSearchProjections(rows);
        const body = serializeSearchChunk(
          semester,
          projections,
          SEARCH_PROJECTION_FORMAT_VERSION,
        );
        return jsonResponse(c, body, `"${await sha256Hex(body)}"`);
      } catch (error) {
        return appError(error);
      }
    });

export default createSearchChunkApp();
