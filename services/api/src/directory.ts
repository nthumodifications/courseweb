import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { fetchUpstream } from "./utils/upstream";

const UPSTREAM_URL = "https://api.nthusa.tw/directory";
const CACHE_KEY = "https://api.nthumods.com/internal/directory";
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";
const REQUEST_TIMEOUT_MS = 8_000;

export const DIRECTORY_SOURCE = {
  name: "NTHU Telephone Directory",
  url: "https://tel.net.nthu.edu.tw/nthusearch/",
} as const;

const nullableString = z.string().trim().nullable().optional();
const contactSchema = z
  .object({
    extension: nullableString,
    phone: nullableString,
    fax: nullableString,
    email: nullableString,
    website: z.string().url().nullable().optional(),
  })
  .passthrough();

const personSchema = z
  .object({
    name: z.string().trim().min(1),
    title: nullableString,
    extension: nullableString,
    note: nullableString,
    email: nullableString,
  })
  .passthrough();

const departmentSchema = z
  .object({
    index: z.string().trim().min(1),
    name: z.string().trim().min(1),
    parent_name: nullableString,
    url: z.string().url().nullable().optional(),
    details: z
      .object({
        departments: z.array(z.record(z.unknown())).optional(),
        contact: contactSchema.optional(),
        people: z.array(personSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const directorySchema = z.array(departmentSchema);

export interface DirectoryUnit {
  id: string;
  name: string;
  parentName: string | null;
  url: string | null;
  phone: string | null;
  extension: string | null;
  email: string | null;
  website: string | null;
}

export interface DirectoryResponse {
  data: DirectoryUnit[];
  source: typeof DIRECTORY_SOURCE;
  error: boolean;
}

const asNullable = (value: string | null | undefined): string | null =>
  value?.trim() || null;

export const normalizeDirectory = (payload: unknown): DirectoryUnit[] =>
  directorySchema.parse(payload).map((department) => {
    const contact = department.details?.contact;
    return {
      id: department.index,
      name: department.name,
      parentName: asNullable(department.parent_name),
      url: asNullable(department.url),
      phone: asNullable(contact?.phone),
      extension: asNullable(contact?.extension),
      email: asNullable(contact?.email),
      website: asNullable(contact?.website),
    };
  });

const getCache = (): Cache | undefined => {
  try {
    return typeof caches === "undefined" ? undefined : caches.default;
  } catch {
    return undefined;
  }
};

const readCache = async (cache: Cache): Promise<Response | undefined> => {
  try {
    return await cache.match(new Request(CACHE_KEY));
  } catch (error) {
    console.error("Failed to read directory cache", error);
    return undefined;
  }
};

const writeCache = (c: Context, response: Response, cache: Cache): void => {
  try {
    const write = cache.put(new Request(CACHE_KEY), response.clone());
    const guardedWrite = write.catch((error) => {
      console.error("Failed to write directory cache", error);
    });
    try {
      c.executionCtx.waitUntil(guardedWrite);
    } catch {
      void guardedWrite;
    }
  } catch {
    console.error("Failed to start directory cache write");
  }
};

const fetchDirectory = async (
  fetcher: typeof fetch,
): Promise<DirectoryUnit[]> => {
  const response = await fetchUpstream(
    UPSTREAM_URL,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
    { fetcher },
  );
  return normalizeDirectory(await response.json());
};

export const createDirectoryApp = (
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = getCache(),
) =>
  new Hono().get("/", async (c) => {
    const cached = cache ? await readCache(cache) : undefined;
    if (cached) return cached;

    let data: DirectoryUnit[] = [];
    let error = false;
    try {
      data = await fetchDirectory(fetcher);
    } catch (caught) {
      error = true;
      console.error("Failed to fetch directory data", caught);
    }

    const response = c.json<DirectoryResponse>(
      { data, source: DIRECTORY_SOURCE, error },
      200,
      { "Cache-Control": CACHE_CONTROL },
    );

    if (!error && cache) {
      writeCache(c, response, cache);
    }
    return response;
  });

const directory = createDirectoryApp();

export default directory;
