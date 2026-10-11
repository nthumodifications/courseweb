import { describe, expect, it } from "bun:test";
import timetableShare from "./timetable-share";

describe("public timetable pagination", () => {
  it.each([
    ["limit=-1", "negative limits"],
    ["limit=51", "oversized limits"],
    ["limit=1.5", "fractional limits"],
    ["offset=-1", "negative offsets"],
    ["offset=1000001", "oversized offsets"],
  ])("rejects %s (%s) before querying D1", async (query) => {
    const response = await timetableShare.request(
      `/public?${query}`,
      {},
      {
        DB: {},
      },
    );

    expect(response.status).toBe(400);
  });
});
