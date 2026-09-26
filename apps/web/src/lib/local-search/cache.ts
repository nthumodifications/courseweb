import { del, get, keys, set } from "idb-keyval";
import type { SearchProjectionRecord } from "./projection";

export type CachedSearchChunk = {
  semester: string;
  formatVersion: string;
  contentHash: string;
  records: SearchProjectionRecord[];
};

export type CachedSearchTextChunk = {
  semester: string;
  formatVersion: string;
  contentHash: string;
  texts: Record<string, SearchTextRecord>;
};

export type SearchTextRecord = {
  brief: string | null;
  keywords: string[] | null;
};

export type SearchChunkCache = {
  get: (key: string) => Promise<CachedSearchChunk | undefined>;
  set: (key: string, value: CachedSearchChunk) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deleteSemester: (semester: string, exceptKey?: string) => Promise<void>;
  getText: (key: string) => Promise<CachedSearchTextChunk | undefined>;
  getLatestText: (
    semester: string,
    formatVersion: string,
  ) => Promise<CachedSearchTextChunk | undefined>;
  setText: (key: string, value: CachedSearchTextChunk) => Promise<void>;
  deleteTextSemester: (semester: string, exceptKey?: string) => Promise<void>;
};

const CACHE_PREFIX = "courseweb:local-search:chunk:";
const TEXT_CACHE_PREFIX = "courseweb:local-search:text:";

export const searchChunkCacheKey = (
  semester: string,
  contentHash: string,
  formatVersion: string,
) =>
  `${CACHE_PREFIX}${encodeURIComponent(semester)}:${encodeURIComponent(formatVersion)}:${encodeURIComponent(contentHash)}`;

export const searchTextCacheKey = (
  semester: string,
  contentHash: string,
  formatVersion: string,
) =>
  `${TEXT_CACHE_PREFIX}${encodeURIComponent(semester)}:${encodeURIComponent(formatVersion)}:${encodeURIComponent(contentHash)}`;

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
  async getText(key) {
    try {
      return await get<CachedSearchTextChunk>(key);
    } catch {
      return undefined;
    }
  },
  async getLatestText(semester, formatVersion) {
    try {
      const prefix = `${TEXT_CACHE_PREFIX}${encodeURIComponent(semester)}:${encodeURIComponent(formatVersion)}:`;
      const cacheKeys = await keys();
      const matchingKeys = cacheKeys.filter(
        (key): key is string =>
          typeof key === "string" && key.startsWith(prefix),
      );
      const values = await Promise.all(
        matchingKeys.map((key) => get<CachedSearchTextChunk>(key)),
      );
      return values.find(Boolean);
    } catch {
      return undefined;
    }
  },
  async setText(key, value) {
    try {
      await set(key, value);
    } catch {
      // A private browsing quota/permission error must not disable local search.
    }
  },
  async deleteTextSemester(semester, exceptKey) {
    try {
      const prefix = `${TEXT_CACHE_PREFIX}${encodeURIComponent(semester)}:`;
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
  private readonly textValues = new Map<string, CachedSearchTextChunk>();

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

  async getText(key: string) {
    return this.textValues.get(key);
  }

  async getLatestText(semester: string, formatVersion: string) {
    const prefix = `${TEXT_CACHE_PREFIX}${encodeURIComponent(semester)}:${encodeURIComponent(formatVersion)}:`;
    return [...this.textValues.entries()].find(([key]) =>
      key.startsWith(prefix),
    )?.[1];
  }

  async setText(key: string, value: CachedSearchTextChunk) {
    this.textValues.set(key, value);
  }

  async deleteTextSemester(semester: string, exceptKey?: string) {
    const prefix = `${TEXT_CACHE_PREFIX}${encodeURIComponent(semester)}:`;
    for (const key of this.textValues.keys()) {
      if (key.startsWith(prefix) && key !== exceptKey)
        this.textValues.delete(key);
    }
  }

  entries() {
    return [...this.values.entries()];
  }

  textEntries() {
    return [...this.textValues.entries()];
  }
}
