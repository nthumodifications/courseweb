import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import calendarProxy from "./calendar-proxy";

const originalFetch = globalThis.fetch;
const originalAuthUrl = process.env.NTHUMODS_AUTH_URL;

beforeEach(() => {
  process.env.NTHUMODS_AUTH_URL = "https://auth.nthumods.com";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAuthUrl === undefined) {
    delete process.env.NTHUMODS_AUTH_URL;
  } else {
    process.env.NTHUMODS_AUTH_URL = originalAuthUrl;
  }
});

// Stubs the upstream auth service and returns the URLs it was asked for.
const mockUpstream = (body: string, contentType: string) => {
  const requestedUrls: string[] = [];
  globalThis.fetch = mock(async (input) => {
    requestedUrls.push(String(input));
    return new Response(body, { headers: { "Content-Type": contentType } });
  }) as unknown as typeof fetch;
  return requestedUrls;
};

const requestCalendar = (path = "/ical/user?token=secret") =>
  calendarProxy.request(path, {});

const expectInertCalendar = (response: Response) => {
  expect(response.status).toBe(200);
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
};

describe("calendar proxy", () => {
  it("encodes the user path and serves upstream calendars as safe attachments", async () => {
    const requestedUrls = mockUpstream(
      "BEGIN:VCALENDAR
END:VCALENDAR",
      "text/calendar",
    );

    const response = await requestCalendar(
      "/ical/user%2Fwith%2Fslashes?token=secret&type=basic",
    );

    expectInertCalendar(response);
    expect(requestedUrls).toEqual([
      "https://auth.nthumods.com/calendar/ics/user%2Fwith%2Fslashes?token=secret&type=basic",
    ]);
    expect(await response.text()).toContain("END:VCALENDAR");
  });

  it("serves event text containing angle brackets as an inert attachment", async () => {
    const body =
      "BEGIN:VCALENDAR
SUMMARY:<script>alert(1)</script>
END:VCALENDAR";
    mockUpstream(body, "text/calendar");

    const response = await requestCalendar();

    expectInertCalendar(response);
    expect(await response.text()).toBe(body);
  });

  it.each([
    ["<script>alert(1)</script>", "text/html", "Unexpected calendar response"],
    [
      "<html><script>alert(1)</script></html>",
      "text/calendar",
      "Invalid calendar response",
    ],
  ])("does not reflect %p served as %s", async (body, contentType, error) => {
    mockUpstream(body, contentType);

    const response = await requestCalendar();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error });
  });
});
