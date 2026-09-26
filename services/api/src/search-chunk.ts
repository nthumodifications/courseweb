import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import type { Database } from "./types/supabase";
import {
  SEARCH_PROJECTION_FORMAT_VERSION,
  SEARCH_QUERY_COLUMNS,
  type CourseRow,
  type SearchSourceCourse,
  serializeSearchChunk,
  sortSearchProjections,
  toSearchProjection,
} from "./search-projection";

const PAGE_SIZE = 1_000;
const CHUNK_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const SEARCH_SOURCE_SELECT = [...SEARCH_QUERY_COLUMNS, "updated_at"].join(",");
const SEARCH_TEXT_SELECT =
  "raw_id,semester,updated_at,course_syllabus(brief,keywords,updated_at)";
const semesterParamSchema = z.object({
  semester: z.string().regex(/^\d{5}$/, "Invalid semester id"),
});
const manifestQuerySchema = z.object({
  semester: z
    .string()
    .regex(/^\d{5}$/, "Invalid semester id")
    .optional(),
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

export type SearchManifestRpcRow = {
  semester: string;
  row_count: number;
  max_updated_at: string | null;
};

export type SearchManifestLoader = (
  c: Context,
  semester?: string,
) => Promise<SearchManifestRpcRow[]>;

/**
 * The manifest reads only the aggregate RPC. It must never fall back to the
 * course-row loader: the RPC is what keeps manifest cost independent of the
 * corpus size.
 */
export const loadSearchManifest: SearchManifestLoader = async (c, semester) => {
  const client = supabase_server(c);
  const result =
    semester === undefined
      ? client.rpc("search_manifest")
      : client.rpc("search_manifest", { p_semester: semester });
  const { data, error } = await result;
  if (error) throw error;
  return (data ?? []) as SearchManifestRpcRow[];
};

export type SearchSyllabusRow = Pick<
  Database["public"]["Tables"]["course_syllabus"]["Row"],
  "brief" | "keywords" | "updated_at"
>;

export type SearchTextSourceRow = Pick<
  CourseRow,
  "raw_id" | "semester" | "updated_at"
> & {
  course_syllabus: SearchSyllabusRow | SearchSyllabusRow[] | null;
};

export type SearchTextRowLoader = (
  c: Context,
  semester: string,
) => Promise<SearchTextSourceRow[]>;

/** Load syllabus display text separately from the small search chunk. */
export const loadSearchTextRows: SearchTextRowLoader = async (c, semester) => {
  const client = supabase_server(c);
  const rows: SearchTextSourceRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("courses")
      .select(SEARCH_TEXT_SELECT)
      .eq("semester", semester)
      .order("raw_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as unknown as SearchTextSourceRow[];
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

/**
 * A validity token is deliberately derived from metadata, never serialized
 * course content. The scraper's upsert-only behavior and unconditional
 * courses.updated_at bump make count plus max timestamp sound in application
 * code; this guarantee is not enforced by the database.
 */
export const searchValidityToken = async (
  semester: string,
  rowCount: number,
  maxUpdatedAt: string | null,
) => sha256Hex(`${semester}|${rowCount}|${maxUpdatedAt ?? ""}`);

export type SearchManifestEntry = {
  semester: string;
  rowCount: number;
  maxUpdatedAt: string | null;
  /** Compatibility field containing the metadata validity token. */
  contentHash: string;
};

export type SearchManifestData = {
  schemaVersion: number;
  semesters: SearchManifestEntry[];
};

export const buildSearchProjections = (rows: SearchSourceCourse[]) =>
  sortSearchProjections(rows.map(toSearchProjection));

/** Build manifest entries from RPC metadata only. */
export const buildSearchManifest = async (
  rows: SearchManifestRpcRow[],
  schemaVersion = SEARCH_PROJECTION_FORMAT_VERSION,
): Promise<SearchManifestData> => {
  const semesters = await Promise.all(
    [...rows]
      .sort((a, b) =>
        a.semester < b.semester ? -1 : a.semester > b.semester ? 1 : 0,
      )
      .map(async (row): Promise<SearchManifestEntry> => {
        const rowCount = Number(row.row_count);
        return {
          semester: row.semester,
          rowCount,
          maxUpdatedAt: row.max_updated_at,
          contentHash: await searchValidityToken(
            row.semester,
            rowCount,
            row.max_updated_at,
          ),
        };
      }),
  );

  return { schemaVersion, semesters };
};

export const serializeSearchManifest = (data: SearchManifestData) =>
  JSON.stringify({ success: true, data });

export type SearchTextRecord = {
  brief: string | null;
  keywords: string[] | null;
};

export type SearchTextChunkData = {
  schemaVersion: number;
  semester: string;
  texts: Record<string, SearchTextRecord>;
};

const firstSyllabus = (row: SearchTextSourceRow) =>
  Array.isArray(row.course_syllabus)
    ? (row.course_syllabus[0] ?? null)
    : row.course_syllabus;

export const toSearchTextRecord = (
  row: SearchTextSourceRow,
): SearchTextRecord => {
  const syllabus = firstSyllabus(row);
  return {
    brief: syllabus?.brief ?? null,
    keywords: syllabus?.keywords ?? null,
  };
};

export const buildSearchTextChunk = (
  semester: string,
  rows: SearchTextSourceRow[],
  schemaVersion = SEARCH_PROJECTION_FORMAT_VERSION,
): SearchTextChunkData => ({
  schemaVersion,
  semester,
  texts: Object.fromEntries(
    [...rows]
      .sort((a, b) => (a.raw_id < b.raw_id ? -1 : a.raw_id > b.raw_id ? 1 : 0))
      .map((row) => [row.raw_id, toSearchTextRecord(row)]),
  ),
});

export const serializeSearchTextChunk = (data: SearchTextChunkData) =>
  JSON.stringify({ success: true, data });

const maxTimestamp = (values: Array<string | null | undefined>) => {
  let max: string | null = null;
  for (const value of values) {
    if (value && (max === null || value > max)) max = value;
  }
  return max;
};

const maxCourseUpdatedAt = (rows: SearchSourceCourse[]) =>
  maxTimestamp(rows.map((row) => row.updated_at));

const maxTextUpdatedAt = (rows: SearchTextSourceRow[]) =>
  maxTimestamp(
    rows.flatMap((row) => {
      const syllabus = firstSyllabus(row);
      return [row.updated_at, syllabus?.updated_at];
    }),
  );

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

  // Keep the body plain JSON. The edge negotiates compression; declaring a
  // manually compressed body here makes browser JSON clients see gzip bytes.
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

export type SearchChunkAppOptions = {
  loadRows?: SearchRowLoader;
  loadManifest?: SearchManifestLoader;
  loadTextRows?: SearchTextRowLoader;
};

export function createSearchChunkApp(
  loadRowsOrOptions: SearchRowLoader | SearchChunkAppOptions = loadSearchRows,
  manifestLoader?: SearchManifestLoader,
  textLoader?: SearchTextRowLoader,
) {
  const options =
    typeof loadRowsOrOptions === "function"
      ? {
          loadRows: loadRowsOrOptions,
          loadManifest: manifestLoader ?? loadSearchManifest,
          loadTextRows: textLoader ?? loadSearchTextRows,
        }
      : {
          loadRows: loadRowsOrOptions.loadRows ?? loadSearchRows,
          loadManifest: loadRowsOrOptions.loadManifest ?? loadSearchManifest,
          loadTextRows: loadRowsOrOptions.loadTextRows ?? loadSearchTextRows,
        };

  return new Hono()
    .get("/manifest", zValidator("query", manifestQuerySchema), async (c) => {
      const { semester } = c.req.valid("query");
      try {
        // This is intentionally the only loader used by this route. In
        // particular, never call loadRows here.
        const data = await buildSearchManifest(
          await options.loadManifest(c, semester),
        );
        const body = serializeSearchManifest(data);
        return jsonResponse(c, body, `"${await sha256Hex(body)}"`);
      } catch (error) {
        return appError(error);
      }
    })
    .get(
      "/:semester/text",
      zValidator("param", semesterParamSchema),
      async (c) => {
        const { semester } = c.req.valid("param");
        try {
          const rows = await options.loadTextRows(c, semester);
          if (rows.length === 0)
            return errorResponse("Semester not found", 404);

          const data = buildSearchTextChunk(semester, rows);
          const body = serializeSearchTextChunk(data);
          const token = await searchValidityToken(
            semester,
            rows.length,
            maxTextUpdatedAt(rows),
          );
          return jsonResponse(c, body, `"${token}"`);
        } catch (error) {
          return appError(error);
        }
      },
    )
    .get("/:semester", zValidator("param", semesterParamSchema), async (c) => {
      const { semester } = c.req.valid("param");
      try {
        const rows = await options.loadRows(c, semester);
        if (rows.length === 0) return errorResponse("Semester not found", 404);

        const projections = sortSearchProjections(rows.map(toSearchProjection));
        const body = serializeSearchChunk(
          semester,
          projections,
          SEARCH_PROJECTION_FORMAT_VERSION,
        );
        const token = await searchValidityToken(
          semester,
          rows.length,
          maxCourseUpdatedAt(rows),
        );
        return jsonResponse(c, body, `"${token}"`);
      } catch (error) {
        return appError(error);
      }
    });
}

export default createSearchChunkApp();
