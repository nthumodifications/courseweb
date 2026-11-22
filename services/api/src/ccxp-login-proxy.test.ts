import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { app } from "./index";

const originalFetch = globalThis.fetch;
const upstreamFetch = mock(async () => new Response("", { status: 200 }));

beforeEach(() => {
  upstreamFetch.mockClear();
  globalThis.fetch = upstreamFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/**
 * The API must not log in to school systems on a caller's behalf: an open
 * endpoint that takes a student ID and password and solves the CAPTCHA is a
 * password-guessing proxy for anyone on the internet.
 */
describe("school credentials are not accepted by the API", () => {
  it.each(["/ccxp/auth/login", "/ccxp/eeclass/login"])(
    "POST %s is not a route and contacts no upstream",
    async (path) => {
      const response = await app.request(path, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          studentid: "111000001",
          password: "not-a-real-password",
        }),
      });

      expect(response.status).toBe(404);
      expect(upstreamFetch).not.toHaveBeenCalled();
    },
  );
});
