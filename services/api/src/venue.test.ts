import { afterEach, describe, expect, it, mock } from "bun:test";
import venue from "./venue";

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
    globalThis.fetch = mock(
      async () =>
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
});
