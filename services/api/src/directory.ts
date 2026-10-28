import { Hono } from "hono";
import { z } from "zod";
import {
  createCachedUpstreamHandler,
  getDefaultCache,
  type CachedUpstreamResponse,
} from "./utils/cached-upstream";

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
const nullableUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  })
  .nullable()
  .optional()
  .catch(null);
const contactSchema = z
  .object({
    extension: nullableString,
    phone: nullableString,
    fax: nullableString,
    email: nullableString,
    website: nullableUrl,
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
    url: nullableUrl,
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

const directoryPayloadSchema = z.array(z.unknown());

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

export type DirectoryResponse = CachedUpstreamResponse<
  DirectoryUnit[],
  typeof DIRECTORY_SOURCE
>;

const asNullable = (value: string | null | undefined): string | null =>
  value?.trim() || null;

export const normalizeDirectory = (payload: unknown): DirectoryUnit[] => {
  const entries = directoryPayloadSchema.parse(payload);

  return entries.flatMap((entry) => {
    const parsed = departmentSchema.safeParse(entry);
    if (!parsed.success) return [];

    const department = parsed.data;
    const contact = department.details?.contact;
    return [
      {
        id: department.index,
        name: department.name,
        parentName: asNullable(department.parent_name),
        url: asNullable(department.url),
        phone: asNullable(contact?.phone),
        extension: asNullable(contact?.extension),
        email: asNullable(contact?.email),
        website: asNullable(contact?.website),
      },
    ];
  });
};

export const createDirectoryApp = (
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = getDefaultCache(),
) =>
  new Hono().get(
    "/",
    createCachedUpstreamHandler({
      upstreamUrl: UPSTREAM_URL,
      cacheKey: CACHE_KEY,
      cacheControl: CACHE_CONTROL,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      source: DIRECTORY_SOURCE,
      label: "directory",
      fetcher,
      cache,
      emptyData: (): DirectoryUnit[] => [],
      normalize: normalizeDirectory,
    }),
  );

const directory = createDirectoryApp();

export default directory;
