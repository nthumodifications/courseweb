import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import { app } from "../index";
import { logger } from "./request-logger";

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

describe("request logger", () => {
  it("logs the method, path and status of a request", async () => {
    const service = new Hono()
      .use(logger())
      .get("/calendar/ical/:id", (c) => c.text("ok"));

    await service.request("/calendar/ical/111000001");

    expect(logged).toHaveLength(2);
    expect(logged[0]).toContain("GET /calendar/ical/111000001");
    expect(logged[1]).toContain("GET /calendar/ical/111000001");
    expect(logged[1]).toContain("200");
  });

  it("never writes query string values, which carry feed tokens", async () => {
    const service = new Hono()
      .use(logger())
      .get("/calendar/ical/:id", (c) => c.text("ok"));

    await service.request(
      "/calendar/ical/111000001?token=feed-secret-token&type=full",
    );

    expect(logged).toHaveLength(2);
    for (const line of logged) {
      expect(line).toContain("GET /calendar/ical/111000001");
      expect(line).not.toContain("feed-secret-token");
      expect(line).not.toContain("type=full");
    }
  });

  it("is what the API itself logs with", async () => {
    await app.request("/?token=feed-secret-token");

    expect(logged.length).toBeGreaterThan(0);
    expect(logged.join("\n")).not.toContain("feed-secret-token");
  });
});
