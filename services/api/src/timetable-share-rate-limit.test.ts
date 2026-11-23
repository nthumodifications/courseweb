import { describe, expect, it } from "bun:test";
import timetableShare from "./timetable-share";

/**
 * Share IDs and group invite codes are short, and these two routes answer
 * anyone who presents one. The limit is what makes guessing them impractical.
 */
describe("looking up a share or group by its code is rate limited", () => {
  const blocked = {
    DB: {},
    SHARE_LOOKUP_RATE_LIMITER: { limit: async () => ({ success: false }) },
  };

  it.each(["/view/abcd1234", "/group/ABC234"])(
    "GET %s answers 429 once the caller is over the limit",
    async (path) => {
      const response = await timetableShare.request(path, {}, blocked);

      expect(response.status).toBe(429);
    },
  );

  it("counts every code a caller tries against one budget", async () => {
    const keys: string[] = [];
    const env = {
      DB: {},
      SHARE_LOOKUP_RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          keys.push(key);
          return { success: false };
        },
      },
    };
    const from = { headers: { "cf-connecting-ip": "203.0.113.7" } };

    await timetableShare.request("/view/aaaaaaaa", from, env);
    await timetableShare.request("/view/bbbbbbbb", from, env);
    await timetableShare.request("/group/CCCCCC", from, env);

    expect(keys).toEqual(["203.0.113.7", "203.0.113.7", "203.0.113.7"]);
  });
});
