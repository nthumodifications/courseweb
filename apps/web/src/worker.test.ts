import { describe, expect, test } from "bun:test";

import worker from "../worker";

type AssetFetcher = (request: Request) => Promise<Response>;

function testEnv(fetch: AssetFetcher) {
  return { ASSETS: { fetch } } as never;
}

function shellResponse() {
  return new Response("<!doctype html><html>app</html>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function requestUrl(input: string | Request | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return input.toString();
}

function installWorkerRuntime(fetchImpl: typeof fetch) {
  const previous = new Map(
    ["fetch", "HTMLRewriter", "caches"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );

  class FakeHTMLRewriter {
    on() {
      return this;
    }

    transform(response: Response) {
      return response;
    }
  }

  Object.defineProperties(globalThis, {
    fetch: { configurable: true, value: fetchImpl },
    HTMLRewriter: { configurable: true, value: FakeHTMLRewriter },
    caches: {
      configurable: true,
      value: {
        default: {
          match: async () => undefined,
          put: async () => undefined,
        },
      },
    },
  });

  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
}

describe("Worker asset and shell caching", () => {
  test("returns a missing asset as a 404 with no-store", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/assets/old.js"),
      testEnv(
        async () =>
          new Response("<!doctype html>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });

  test("does not treat a valid 304 asset response as a failure", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/assets/current.js", {
        headers: { "If-None-Match": '"current"' },
      }),
      testEnv(
        async () =>
          new Response(null, {
            status: 304,
            headers: {
              "Content-Type": "text/javascript; charset=utf-8",
              ETag: '"current"',
            },
          }),
      ),
    );

    expect(response.status).toBe(304);
    expect(response.ok).toBe(false);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("rejects an HTML 304 for a missing asset", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/assets/old.js"),
      testEnv(
        async () =>
          new Response(null, {
            status: 304,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("marks index.html as revalidatable", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/index.html"),
      testEnv(async (request) => {
        expect(new URL(request.url).pathname).toBe("/");
        return new Response("<!doctype html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
  });

  test("marks the service worker as revalidatable", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/sw.js"),
      testEnv(
        async () =>
          new Response("self.addEventListener('fetch', () => {})", {
            headers: { "Content-Type": "text/javascript" },
          }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
  });

  test("marks hashed assets immutable", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/assets/app-abc123.js"),
      testEnv(
        async () =>
          new Response("export default 1", {
            headers: { "Content-Type": "text/javascript" },
          }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("keeps navigation fallback available with no-cache headers", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/zh/timetable"),
      testEnv(
        async () =>
          new Response("<!doctype html><html>app</html>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
  });

  test.each([
    ["GET", "/", "/"],
    ["HEAD", "/", "/"],
    [
      "GET",
      "/zh/courses/11420PE%20%20206097",
      "/zh/courses/11420PE%20%20206097",
    ],
    [
      "HEAD",
      "/zh/courses/11420PE%20%20206097",
      "/zh/courses/11420PE%20%20206097",
    ],
    ["GET", "/robots.txt", "/robots.txt"],
    ["HEAD", "/robots.txt", "/robots.txt"],
    ["GET", "/api/health", "/api/health"],
    ["HEAD", "/__api/course", "/__api/course"],
    ["GET", "/favicon.ico", "/favicon.ico"],
    ["GET", "/fonts/inter.woff2", "/fonts/inter.woff2"],
  ] as const)(
    "passes %s %s through the correct non-bot route",
    async (method, path, expectedPath) => {
      let seenRequest: Request | undefined;
      const response = await worker.fetch(
        new Request(`https://example.test${path}`, {
          method,
          headers: { "If-None-Match": '"current"' },
        }),
        testEnv(async (request) => {
          seenRequest = request;
          return new Response(null, {
            status: 304,
            headers: { ETag: '"current"' },
          });
        }),
      );

      expect(response.status).toBe(304);
      expect(seenRequest?.method).toBe(method);
      expect(new URL(seenRequest!.url).pathname).toBe(expectedPath);
    },
  );

  test("keeps the manifest on the explicit no-cache policy", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/manifest.webmanifest"),
      testEnv(async () => new Response("{}")),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
  });

  test("serves bot metadata pages and deep course pages from the shell", async () => {
    const requestedUrls: string[] = [];
    const restore = installWorkerRuntime(async (input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url.startsWith("https://api.nthumods.com/course/")) {
        return new Response(
          JSON.stringify({
            raw_id: "11420PE  206097",
            semester: "11420",
            name_zh: "體育",
            name_en: "Physical Education",
            department: "PE",
            teacher_zh: ["Teacher"],
            teacher_en: ["Teacher"],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(null, { status: 500 });
    });

    try {
      const env = testEnv(async (request) => {
        expect(new URL(request.url).pathname).toBe("/");
        return shellResponse();
      });
      const botHeaders = { "User-Agent": "Googlebot" };

      const metadataResponse = await worker.fetch(
        new Request("https://example.test/zh/today", {
          headers: botHeaders,
        }),
        env,
      );
      const courseResponse = await worker.fetch(
        new Request("https://example.test/zh/courses/11420PE%20%20206097", {
          headers: botHeaders,
        }),
        env,
      );

      expect(metadataResponse.status).toBe(200);
      expect(metadataResponse.headers.get("Cache-Control")).toBe(
        "no-cache, must-revalidate",
      );
      expect(courseResponse.status).toBe(200);
      expect(courseResponse.headers.get("Cache-Control")).toBe(
        "no-cache, must-revalidate",
      );
      expect(requestedUrls).toContain(
        "https://api.nthumods.com/course/11420PE%20%20206097",
      );
    } finally {
      restore();
    }
  });

  test("keeps robots navigation separate from the sitemap response", async () => {
    const restore = installWorkerRuntime(
      async () => new Response(null, { status: 500 }),
    );

    try {
      const robotsResponse = await worker.fetch(
        new Request("https://example.test/robots.txt"),
        testEnv(async () => shellResponse()),
      );
      const sitemapResponse = await worker.fetch(
        new Request("https://example.test/sitemap.xml?variant=1"),
        testEnv(async () => shellResponse()),
      );

      expect(robotsResponse.status).toBe(200);
      expect(robotsResponse.headers.get("Content-Type")).toContain("text/html");
      expect(sitemapResponse.status).toBe(200);
      expect(sitemapResponse.headers.get("Content-Type")).toContain(
        "application/xml",
      );
      expect(await sitemapResponse.text()).toContain("<urlset");
    } finally {
      restore();
    }
  });
});
