import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import { logger } from "./requestLogger";

let logged: string[];
let logSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  logged = [];
  logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  logSpy.mockRestore();
});

const service = () =>
  new Hono()
    .use(logger())
    .get("/oauth/nthu", (c) => c.text("ok"))
    .get("/api/calendar/ics/:userId", (c) => c.text("ok"));

describe("request logger", () => {
  it("logs the method, path and status of a request", async () => {
    await service().request("/oauth/nthu");

    expect(logged).toHaveLength(2);
    expect(logged[0]).toContain("GET /oauth/nthu");
    expect(logged[1]).toContain("GET /oauth/nthu");
    expect(logged[1]).toContain("200");
  });

  it("never writes an OAuth code or state", async () => {
    await service().request(
      "/oauth/nthu?state=state-value-1&code=code-value-1",
    );

    expect(logged).toHaveLength(2);
    for (const line of logged) {
      expect(line).toContain("GET /oauth/nthu");
      expect(line).not.toContain("state-value-1");
      expect(line).not.toContain("code-value-1");
    }
  });

  it("never writes a calendar feed token", async () => {
    await service().request(
      "/api/calendar/ics/111000001?token=feed-secret-token&type=full",
    );

    expect(logged).toHaveLength(2);
    for (const line of logged) {
      expect(line).toContain("GET /api/calendar/ics/111000001");
      expect(line).not.toContain("feed-secret-token");
    }
  });
});
