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

const mockUpstreamFailure = () => {
  globalThis.fetch = mock(async (input) => {
    const requestUrl = new URL(String(input));
    const reflectedInput = `${requestUrl.pathname}${requestUrl.search}`;
    return new Response(null, {
      status: 502,
      statusText: reflectedInput,
    });
  }) as unknown as typeof fetch;
};

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

const expectSafeError = async (response: Response, status: number) => {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toBe(
    "text/plain; charset=utf-8",
  );
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const body = await response.text();
  expect(body).toBe("Calendar unavailable");
  expect(body).not.toContain("<script>");
};

describe("calendar proxy", () => {
  it("encodes the user path and serves upstream calendars as safe attachments", async () => {
    const requestedUrls = mockUpstream(
      "BEGIN:VCALENDAR\nEND:VCALENDAR",
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

  it("passes valid ICS angle brackets through byte-identically", async () => {
    const body =
      "BEGIN:VCALENDAR\r\nDESCRIPTION:Use < and > as literal text\r\nEND:VCALENDAR\r\n";
    mockUpstream(body, "text/calendar");

    const response = await requestCalendar();

    expectInertCalendar(response);
    expect(await response.text()).toBe(body);
  });

  it.each([
    ["text/html", "<script>alert(1)</script>"],
    ["text/calendar", "<html><script>alert(1)</script></html>"],
  ])(
    "returns a safe error for an invalid upstream %s response",
    async (contentType, body) => {
      mockUpstream(body, contentType);

      await expectSafeError(await requestCalendar(), 502);
    },
  );

  it.each([
    [
      "userId",
      `/ical/${encodeURIComponent("<script>alert(1)</script>")}?token=secret`,
      502,
    ],
    [
      "token",
      `/ical/user?token=${encodeURIComponent("<script>alert(1)</script>")}`,
      502,
    ],
    ["type", "/ical/user?token=secret&type=%3Cscript%3E", 400],
  ])(
    "does not reflect script input from %s in an HTML response",
    async (_field, path, status) => {
      mockUpstreamFailure();
      await expectSafeError(await requestCalendar(path), status);
    },
  );
});
