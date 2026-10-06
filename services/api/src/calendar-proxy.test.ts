import { afterEach, describe, expect, it, mock } from "bun:test";
import calendarProxy from "./calendar-proxy";

const originalFetch = globalThis.fetch;
const originalAuthUrl = process.env.NTHUMODS_AUTH_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAuthUrl === undefined) {
    delete process.env.NTHUMODS_AUTH_URL;
  } else {
    process.env.NTHUMODS_AUTH_URL = originalAuthUrl;
  }
});

describe("calendar proxy", () => {
  it("encodes the user path and serves upstream calendars as safe attachments", async () => {
    process.env.NTHUMODS_AUTH_URL = "https://auth.nthumods.com";
    let requestedUrl = "";
    globalThis.fetch = mock(async (input) => {
      requestedUrl = String(input);
      return new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", {
        headers: { "Content-Type": "text/calendar" },
      });
    }) as unknown as typeof fetch;

    const response = await calendarProxy.request(
      "/ical/user%2Fwith%2Fslashes?token=secret&type=basic",
      {},
    );

    expect(response.status).toBe(200);
    expect(requestedUrl).toBe(
      "https://auth.nthumods.com/calendar/ics/user%2Fwith%2Fslashes?token=secret&type=basic",
    );
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="calendar.ics"',
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'",
    );
    expect(await response.text()).toContain("END:VCALENDAR");
  });

  it("does not reflect a non-calendar upstream response", async () => {
    process.env.NTHUMODS_AUTH_URL = "https://auth.nthumods.com";
    globalThis.fetch = mock(
      async () =>
        new Response("<script>alert(1)</script>", {
          headers: { "Content-Type": "text/html" },
        }),
    ) as unknown as typeof fetch;

    const response = await calendarProxy.request("/ical/user?token=secret", {});

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unexpected calendar response",
    });
  });

  it("serves event text containing angle brackets as an inert attachment", async () => {
    process.env.NTHUMODS_AUTH_URL = "https://auth.nthumods.com";
    const body =
      "BEGIN:VCALENDAR\nSUMMARY:<script>alert(1)</script>\nEND:VCALENDAR";
    globalThis.fetch = mock(
      async () =>
        new Response(body, {
          headers: { "Content-Type": "text/calendar" },
        }),
    ) as unknown as typeof fetch;

    const response = await calendarProxy.request("/ical/user?token=secret", {});

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="calendar.ics"',
    );
    expect(await response.text()).toBe(body);
  });

  it("rejects a calendar content type without a calendar body", async () => {
    process.env.NTHUMODS_AUTH_URL = "https://auth.nthumods.com";
    globalThis.fetch = mock(
      async () =>
        new Response("<html><script>alert(1)</script></html>", {
          headers: { "Content-Type": "text/calendar" },
        }),
    ) as unknown as typeof fetch;

    const response = await calendarProxy.request("/ical/user?token=secret", {});

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Invalid calendar response",
    });
  });
});
