import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("API CORS", () => {
  test("exposes ETag so the search text tier can version its cache", async () => {
    const response = await app.request("/", {
      headers: { Origin: "https://nthumods.com" },
    });

    expect(
      response.headers.get("access-control-expose-headers")?.toLowerCase(),
    ).toContain("etag");
  });
});
