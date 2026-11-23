import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import headlessAis from "./index";

const VALID_SESSION = "abcdefghij0123456789";

const originalFetch = globalThis.fetch;
const upstream = mock(
  async (_input: unknown, _init?: RequestInit) => new Response("<html></html>"),
);

beforeEach(() => {
  upstream.mockClear();
  globalThis.fetch = upstream as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const post = (path: string, fields: Record<string, string>) =>
  headlessAis.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });

/**
 * These routes paste the caller's school session ID into URLs and form bodies
 * sent to the school. Anything that is not shaped like a session ID could add
 * or override parameters in those requests.
 */
describe("a school session value that is not a session ID", () => {
  const routes: [string, Record<string, string>][] = [
    ["/courses", {}],
    ["/courses/latest", {}],
    ["/courses/latest-enrollment", { dept: "CS" }],
    ["/courses/hidden-course-selection", { dept: "CS" }],
    ["/courses/class-detailed", {}],
    ["/grades", {}],
    ["/inthu/code", {}],
  ];

  it.each(routes)(
    "is refused by POST %s before anything is sent upstream",
    async (path, extra) => {
      const response = await post(path, {
        ...extra,
        ACIXSTORE: `${VALID_SESSION}&stu_no=111000001`,
      });

      expect(response.status).toBe(400);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it.each(routes)(
    "does not stop POST %s from using a real one",
    async (path, extra) => {
      await post(path, { ...extra, ACIXSTORE: VALID_SESSION });

      expect(upstream).toHaveBeenCalled();
      const firstUrl = String(upstream.mock.calls[0]?.[0]);
      const firstBody = String(upstream.mock.calls[0]?.[1]?.body ?? "");
      expect(`${firstUrl} ${firstBody}`).toContain(
        `ACIXSTORE=${VALID_SESSION}`,
      );
    },
  );
});

describe("a department value with form syntax in it", () => {
  it.each([
    ["/courses/latest-enrollment", "select"],
    ["/courses/hidden-course-selection", "new_dept"],
  ])("is sent by POST %s as one value of %s", async (path, field) => {
    const dept = "CS&act=2&ACIXSTORE=other";

    await post(path, { ACIXSTORE: VALID_SESSION, dept });

    const body = String(upstream.mock.calls[0]?.[1]?.body);
    const sent = new URLSearchParams(body);
    expect(sent.get(field)).toBe(dept);
    expect(sent.getAll("ACIXSTORE")).toEqual([VALID_SESSION]);
  });
});
