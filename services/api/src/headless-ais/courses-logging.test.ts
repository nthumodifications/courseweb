import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import courses from "./courses";

const STUDENT_MARKER = "STUDENT-111000001";
// Shaped like a real session ID, so the request is not refused before the
// handler reaches the code under test.
const SESSION = "abcdefghij0123456789";

const latestLandingPage = `<html><body><form>
  <select><option value="">-</option><option value="11510">11510</option></select>
  <select><option value="100">100</option></select>
  <input name="stu_no" value="${STUDENT_MARKER}" />
</form></body></html>`;

const studentPage = `<html><body><table><tr><td height="30">
  <font color="#0180FE">${STUDENT_MARKER} class page</font>
</td></tr></table></body></html>`;

const originalFetch = globalThis.fetch;
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
  globalThis.fetch = originalFetch;
});

const respondWith = (html: string) => {
  const upstream = mock(async () => new Response(html));
  globalThis.fetch = upstream as unknown as typeof fetch;
  return upstream;
};

const post = (path: string, fields: Record<string, string>) =>
  courses.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });

/**
 * These routes fetch pages from the school on a student's own session. What
 * comes back is that student's data and must not be copied into Worker logs.
 */
describe("school pages fetched for a student stay out of the logs", () => {
  it.each([
    ["/latest", latestLandingPage, { ACIXSTORE: SESSION }],
    [
      "/hidden-course-selection",
      studentPage,
      { ACIXSTORE: SESSION, dept: "CS" },
    ],
    ["/class-detailed", studentPage, { ACIXSTORE: SESSION }],
  ])("POST %s", async (path, html, fields) => {
    const upstream = respondWith(html);

    await post(path, fields);

    expect(upstream).toHaveBeenCalled();
    expect(logged.join("\n")).not.toContain(STUDENT_MARKER);
  });
});
