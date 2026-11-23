import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { securityHeaders } from "./securityHeaders";

const service = () =>
  new Hono()
    .use(securityHeaders())
    .get("/authorize", (c) => c.html("<p>Allow this app?</p>"))
    .get("/redirect", (c) => c.redirect("https://client.example/callback"));

describe("auth server security headers", () => {
  test("the consent page cannot be framed by another site", async () => {
    const response = await service().request("/authorize");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  test("responses tell browsers not to sniff or downgrade them", async () => {
    const response = await service().request("/authorize");

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).toMatch(
      /^max-age=\d+/,
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  test("leaves the opener relationship alone, for clients that sign in through a popup", async () => {
    const response = await service().request("/authorize");

    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBeNull();
  });

  test("redirects back to a client still redirect", async () => {
    const response = await service().request("/redirect");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://client.example/callback",
    );
  });
});
