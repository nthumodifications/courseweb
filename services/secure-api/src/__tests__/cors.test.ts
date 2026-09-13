import { describe, expect, mock, test } from "bun:test";

/**
 * The OIDC app is mounted at "/" ahead of the /api router, and Hono's cors()
 * answers an OPTIONS preflight itself without calling next(). A "*" match here
 * therefore decides CORS for the whole service, including /api/**, which has
 * its own credentialed, origin-restricted policy with a wider method list.
 *
 * That is how `PATCH /api/admin/users/:id/role` came to be blocked in the
 * browser while the route worked from curl: the preflight was answered by this
 * app, advertising only GET and POST.
 *
 * Asserted against the OIDC app alone rather than the composed service. Pulling
 * in the /api router would evaluate every admin handler under this file's
 * Prisma stub, and bun's module mocks are process-wide — the handlers' own test
 * files would then import an already-evaluated module and fail.
 */

mock.module("@prisma/client", () => ({
  PrismaClient: class {},
  TokenType: { ACCESS: "ACCESS", REFRESH: "REFRESH" },
}));

const { default: oidc } = await import("../oidc");

const preflight = (path: string, method: string) =>
  oidc.request(path, {
    method: "OPTIONS",
    headers: {
      Origin: "https://nthumods.com",
      "Access-Control-Request-Method": method,
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

describe("OIDC CORS scope", () => {
  test("does not answer preflights for /api, which owns its own policy", async () => {
    const response = await preflight(
      "/api/admin/users/115164401/role",
      "PATCH",
    );

    // Falling through unanswered is the point: whatever this app replies with
    // is what the browser enforces for the admin API too.
    expect(response.headers.get("access-control-allow-methods")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("still answers preflights for its own endpoints", async () => {
    const response = await preflight(
      "/.well-known/openid-configuration",
      "GET",
    );

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "GET",
    );
  });
});
