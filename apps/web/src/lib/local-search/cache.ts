import { del, get, keys, set } from "idb-keyval";
import type { SearchProjectionRecord } from "./projection";

export type CachedSearchChunk = {
  semester: string;
  formatVersion: string;
  contentHash: string;
  records: SearchProjectionRecord[];
};

export type SearchChunkCache = {
  get: (key: string) => Promise<CachedSearchChunk | undefined>;
  set: (key: string, value: CachedSearchChunk) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deleteSemester: (semester: string, exceptKey?: string) => Promise<void>;
};

const CACHE_PREFIX = "courseweb:local-search:chunk:";

export const searchChunkCacheKey = (
  semester: string,
  contentHash: string,
  formatVersion: string,
) =>
  `${CACHE_PREFIX}${encodeURIComponent(semester)}:${encodeURIComponent(formatVersion)}:${encodeURIComponent(contentHash)}`;

export const createIndexedDbSearchChunkCache = (): SearchChunkCache => ({
  async get(key) {
    try {
      return await get<CachedSearchChunk>(key);
    } catch {
      return undefined;
    }
  },
  async set(key, value) {
    try {
      await set(key, value);
    } catch {
      // A private browsing quota/permission error must not disable local search.
    }
  },
  async delete(key) {
    try {
      await del(key);
    } catch {
      // Cache cleanup is best effort.
    }
  },
  async deleteSemester(semester, exceptKey) {
    try {
      const prefix = `${CACHE_PREFIX}${encodeURIComponent(semester)}:`;
      const cacheKeys = await keys();
      await Promise.all(
        cacheKeys
          .filter(
            (key): key is string =>
              typeof key === "string" &&
              key.startsWith(prefix) &&
              key !== exceptKey,
          )
          .map((key) => del(key)),
      );
    } catch {
      // Cache cleanup is best effort.
    }
  },
});

/** Deterministic cache double used by tests and embedded consumers. */
export class MemorySearchChunkCache implements SearchChunkCache {
  private readonly values = new Map<string, CachedSearchChunk>();

  async get(key: string) {
    return this.values.get(key);
  }

  async set(key: string, value: CachedSearchChunk) {
    this.values.set(key, value);
  }

  async delete(key: string) {
    this.values.delete(key);
  }

  async deleteSemester(semester: string, exceptKey?: string) {
    const prefix = `${CACHE_PREFIX}${encodeURIComponent(semester)}:`;
    for (const key of this.values.keys()) {
      if (key.startsWith(prefix) && key !== exceptKey) this.values.delete(key);
    }
  }

  entries() {
    return [...this.values.entries()];
  }
}
