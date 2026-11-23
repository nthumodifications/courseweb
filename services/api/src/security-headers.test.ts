import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("API security headers", () => {
  test("every response tells browsers not to sniff, frame or downgrade it", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Strict-Transport-Security")).toMatch(
      /^max-age=\d+/,
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  test("stays loadable from other origins, since this is a public API", async () => {
    const response = await app.request("/", {
      headers: { Origin: "https://nthumods.com" },
    });

    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "cross-origin",
    );
    // CORS still answers as before.
    expect(
      response.headers.get("access-control-expose-headers")?.toLowerCase(),
    ).toContain("etag");
  });

  test("error responses carry the headers too", async () => {
    const response = await app.request("/no-such-route");

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
