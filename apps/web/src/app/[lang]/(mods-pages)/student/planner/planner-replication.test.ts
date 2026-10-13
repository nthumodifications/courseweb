import { describe, expect, test } from "bun:test";
import { ensurePlannerResponseOk } from "./planner-replication-contract";

describe("planner replication response handling", () => {
  test("accepts successful responses", async () => {
    await expect(
      ensurePlannerResponseOk(
        { ok: true, status: 200, text: async () => "" },
        "Planner pull",
      ),
    ).resolves.toBeUndefined();
  });

  test("reports failed responses so RxDB can retry them", async () => {
    await expect(
      ensurePlannerResponseOk(
        { ok: false, status: 409, text: async () => "stale checkpoint" },
        "Planner push",
      ),
    ).rejects.toThrow("Planner push failed with status 409: stale checkpoint");

    await expect(
      ensurePlannerResponseOk(
        {
          ok: false,
          status: 503,
          text: async () => {
            throw new Error();
          },
        },
        "Planner pull",
      ),
    ).rejects.toThrow("Planner pull failed with status 503");
  });
});
