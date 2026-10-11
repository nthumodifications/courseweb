import { afterEach, describe, expect, it, mock } from "bun:test";
import venue, { parsePeoOccupancyPayload } from "./venue";
import { failingFetch, upstreamFailureCases } from "./test-helpers/upstream";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("venue occupancy proxy", () => {
  it("preserves a valid occupancy response", async () => {
    const occupancy = [
      {
        project_id: "1",
        project_name: "Gym",
        entry_count_now: 3,
        entry_count_today: 12,
      },
    ];
    globalThis.fetch = mock(async () =>
      Response.json({ status: 200, message: "ok", data: occupancy }),
    ) as unknown as typeof fetch;

    const response = await venue.request("/occupancy");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(occupancy);
  });

  it("returns 502 instead of leaking malformed upstream JSON as a 500", async () => {
    globalThis.fetch = mock(
      async () => new Response("not json"),
    ) as unknown as typeof fetch;

    const response = await venue.request("/occupancy");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Failed to fetch occupancy data",
    });
  });

  it("keeps the successful response shape and duplicate rows", () => {
    const row = {
      project_id: "1",
      project_name: "Gym",
      entry_count_now: 3,
      entry_count_today: 12,
    };
    expect(parsePeoOccupancyPayload({ status: 200, data: [row, row] })).toEqual(
      {
        data: [row, row],
      },
    );
  });

  it.each([
    ["empty/closed", { status: 200, data: [] }],
    ["partial row", { status: 200, data: [{ project_id: "1" }] }],
    [
      "out of range",
      {
        status: 200,
        data: [
          {
            project_id: "1",
            project_name: "Gym",
            entry_count_now: -1,
            entry_count_today: 1,
          },
        ],
      },
    ],
  ])("preserves %s occupancy payload", (_label, payload) => {
    expect(parsePeoOccupancyPayload(payload)).toEqual({ data: payload.data });
  });

  it.each(upstreamFailureCases)(
    "returns 502 for upstream %s",
    async (_label, makeResult) => {
      globalThis.fetch = failingFetch(makeResult);
      const response = await venue.request("/occupancy");
      expect(response.status).toBe(502);
    },
  );
});
