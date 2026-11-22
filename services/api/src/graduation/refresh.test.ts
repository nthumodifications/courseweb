import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createPrismaClientMock } from "../test-helpers/module-mocks";

const findUnique = mock();
const upsert = mock(async () => ({}));

mock.module("../prisma/client", () =>
  createPrismaClientMock(async () => ({ cache: { findUnique, upsert } })),
);

const { default: graduation } = await import("./index");

const originalFetch = globalThis.fetch;
const upstream = mock(async () => new Response("<html></html>"));

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockClear();
  upstream.mockClear();
  globalThis.fetch = upstream as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const cachedAt = (ageMs: number) => ({
  key: "graduation_requirements",
  data: JSON.stringify({ colleges: [], lastUpdated: "" }),
  updatedAt: new Date(Date.now() - ageMs),
});

const refresh = (env: Record<string, unknown> = {}) =>
  graduation.request("/refresh", { method: "POST" }, { DB: {}, ...env });

describe("POST /graduation/refresh", () => {
  it("does not scrape the registrar again right after a refresh", async () => {
    findUnique.mockResolvedValue(cachedAt(60_000));

    const response = await refresh();

    expect(response.status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("scrapes when the cache is old enough", async () => {
    findUnique.mockResolvedValue(cachedAt(60 * 60_000));

    const response = await refresh();

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("scrapes when nothing has been cached yet", async () => {
    findUnique.mockResolvedValue(null);

    const response = await refresh();

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalled();
  });

  it("is rate limited per caller", async () => {
    findUnique.mockResolvedValue(null);

    const response = await refresh({
      VENUE_RATE_LIMITER: { limit: async () => ({ success: false }) },
    });

    expect(response.status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
  });
});
