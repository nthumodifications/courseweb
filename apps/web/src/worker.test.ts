import { describe, expect, test } from "bun:test";

import worker from "../worker";

type AssetFetcher = (request: Request) => Promise<Response>;

function testEnv(fetch: AssetFetcher) {
  return { ASSETS: { fetch } } as never;
}

function shellResponse() {
  return new Response(
    `<!doctype html>
<html lang="zh">
  <head>
    <title>Shell title</title>
    <meta name="description" content="Shell description" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Shell title" />
    <meta property="og:description" content="Shell description" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:url" content="https://nthumods.com/" />
    <meta name="twitter:title" content="Shell title" />
    <meta name="twitter:description" content="Shell description" />
    <link rel="canonical" href="https://nthumods.com/" />
    <link rel="alternate" hreflang="zh" href="https://nthumods.com/zh" />
    <link rel="alternate" hreflang="en" href="https://nthumods.com/en" />
    <link rel="alternate" hreflang="x-default" href="https://nthumods.com/" />
  </head>
  <body><div id="root"></div></body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function requestUrl(input: string | Request | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return input.toString();
}

function loadHeadWorker() {
  const source = Bun.spawnSync([
    "git",
    "show",
    "HEAD:apps/web/worker.ts",
  ]).stdout.toString();
  const javascript = new Bun.Transpiler({ loader: "ts" })
    .transformSync(source)
    .replace("export default", "return");
  return new Function(javascript)() as typeof worker;
}

async function responseSnapshot(response: Response) {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: await response.text(),
  };
}

function htmlAttribute(html: string, tag: string, attribute: string) {
  const match = new RegExp(
    `<${tag}\\b[^>]*\\b${attribute}=(['"])(.*?)\\1`,
    "i",
  ).exec(html);
  return match?.[2];
}

function jsonLdBlocks(html: string): unknown[] {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
    ),
  ].map((match) => JSON.parse(match[1]));
}

function installWorkerRuntime(fetchImpl: typeof fetch) {
  const previous = new Map(
    ["fetch", "HTMLRewriter", "caches"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );

  class FakeElement {
    private readonly attributes = new Map<string, string>();
    private innerContent: string | undefined;
    private appendedContent = "";

    constructor(
      readonly tagName: string,
      attributeText: string,
      private readonly hasClosingTag = false,
    ) {
      for (const match of attributeText.matchAll(
        /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
      )) {
        this.attributes.set(
          match[1].toLowerCase(),
          match[2] ?? match[3] ?? match[4] ?? "",
        );
      }
    }

    getAttribute(name: string) {
      return this.attributes.get(name.toLowerCase()) ?? null;
    }

    setAttribute(name: string, value: string) {
      this.attributes.set(name.toLowerCase(), value);
    }

    setInnerContent(value: string) {
      this.innerContent = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    append(value: string) {
      this.appendedContent += value;
    }

    renderOpening() {
      const attributes = [...this.attributes]
        .map(
          ([name, value]) =>
            ` ${name}="${value
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")}"`,
        )
        .join("");
      return `<${this.tagName}${attributes}>`;
    }

    renderInner(original: string) {
      return `${this.renderOpening()}${this.innerContent ?? original}${this.appendedContent}`;
    }
  }

  class FakeHTMLRewriter {
    private readonly handlers = new Map<
      string,
      { element?: (element: FakeElement) => void }
    >();

    on(
      selector: string,
      handler: { element?: (element: FakeElement) => void },
    ) {
      this.handlers.set(selector, handler);
      return this;
    }

    private matches(element: FakeElement, selector: string) {
      const match = /^(\w+)(?:\[([^=]+)=["']([^"']+)["']\])?$/.exec(selector);
      if (!match || match[1] !== element.tagName) return false;
      return !match[2] || element.getAttribute(match[2]) === match[3];
    }

    private apply(element: FakeElement) {
      for (const [selector, handler] of this.handlers) {
        if (this.matches(element, selector)) handler.element?.(element);
      }
    }

    async transform(response: Response) {
      let html = await response.text();
      html = html.replace(
        /<head\b([^>]*)>([\s\S]*?)<\/head>/i,
        (_whole, attributes: string, inner: string) => {
          const element = new FakeElement("head", attributes, true);
          this.apply(element);
          return `${element.renderOpening()}${inner}${element.appendedContent}</head>`;
        },
      );
      html = html.replace(/<html\b([^>]*)>/i, (_whole, attributes: string) => {
        const element = new FakeElement("html", attributes);
        this.apply(element);
        return element.renderOpening();
      });
      html = html.replace(
        /<title\b([^>]*)>([\s\S]*?)<\/title>/i,
        (_whole, attributes: string, inner: string) => {
          const element = new FakeElement("title", attributes, true);
          this.apply(element);
          return `${element.renderInner(inner)}</title>`;
        },
      );
      html = html.replace(
        /<(meta|link)\b([^>]*)>/gi,
        (whole, tagName: string, attributes: string) => {
          const element = new FakeElement(tagName.toLowerCase(), attributes);
          this.apply(element);
          return element.renderOpening() || whole;
        },
      );
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
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
    ["/zh/today", "zh-TW", "https://nthumods.com/zh/today", "zh_TW"],
    ["/en/today", "en", "https://nthumods.com/en/today", "en_US"],
    ["/zh-cn/today", "zh-CN", "https://nthumods.com/zh-cn/today", "zh_CN"],
  ] as const)(
    "rewrites normal-browser navigation metadata for %s",
    async (path, htmlLang, canonical, ogLocale) => {
      const restore = installWorkerRuntime(async () => shellResponse());
      try {
        const response = await worker.fetch(
          new Request(`https://example.test${path}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          }),
          testEnv(async () => shellResponse()),
        );
        const html = await response.text();

        expect(htmlAttribute(html, "html", "lang")).toBe(htmlLang);
        expect(html).toContain(`property="og:locale" content="${ogLocale}"`);
        expect(html).toContain(`rel="canonical" href="${canonical}"`);
        expect(html).toContain('hreflang="zh-TW"');
        expect(html).toContain('hreflang="zh-CN"');
        expect(html).toContain('hreflang="en"');
        expect(response.headers.get("Cache-Control")).toBe(
          "no-cache, must-revalidate",
        );
      } finally {
        restore();
      }
    },
  );

  test("dynamic sitemap includes zh-cn static and course alternates", async () => {
    const restore = installWorkerRuntime(async (input) => {
      const url = requestUrl(input);
      if (url.includes("select=semester")) {
        return new Response(JSON.stringify([{ semester: "11510" }]), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("semester=eq.11510")) {
        return new Response(
          JSON.stringify([
            { raw_id: "CS 101", semester: "11510", teacher_zh: [] },
          ]),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", {
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const response = await worker.fetch(
        new Request("https://example.test/sitemap.xml"),
        testEnv(async () => shellResponse()),
      );
      const sitemap = await response.text();

      expect(sitemap).toContain("https://nthumods.com/zh-cn/");
      expect(sitemap).toContain("https://nthumods.com/zh-cn/courses/CS%20101");
      expect(sitemap).toContain('hreflang="zh-CN"');
    } finally {
      restore();
    }
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

  test.each([
    "/",
    "/zh",
    "/en",
    "/zh/today",
    "/zh/courses/11420PE%20%20206097",
    "/index.html",
    "/sw.js",
    "/manifest.webmanifest",
    "/assets/app-abc123.js",
    "/assets/missing.js",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap-1.xml",
    "/sitemap-index.xml",
  ] as const)(
    "keeps normal-browser response parity with HEAD for %s",
    async (path) => {
      const headWorker = loadHeadWorker();
      const restore = installWorkerRuntime(
        async () => new Response(null, { status: 500 }),
      );
      const assetFetcher: AssetFetcher = async (request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/") return shellResponse();
        if (pathname === "/assets/missing.js") {
          return new Response("<!doctype html>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        if (pathname === "/assets/app-abc123.js") {
          return new Response("export default 1", {
            headers: { "Content-Type": "text/javascript", ETag: '"asset"' },
          });
        }
        if (pathname === "/sw.js") {
          return new Response("self.addEventListener('fetch', () => {})", {
            headers: { "Content-Type": "text/javascript" },
          });
        }
        return new Response(`asset:${pathname}`, {
          headers: { "Content-Type": "text/plain", ETag: '"asset"' },
        });
      };

      try {
        const request = (handler: typeof worker) =>
          handler.fetch(
            new Request(`https://example.test${path}`, {
              headers: { "User-Agent": "Mozilla/5.0" },
            }),
            testEnv(assetFetcher),
          );
        const [headResponse, newResponse] = await Promise.all([
          request(headWorker),
          request(worker),
        ]);

        if (path === "/sitemap.xml") {
          expect(newResponse.status).toBe(headResponse.status);
          expect(newResponse.headers.get("Content-Type")).toBe(
            headResponse.headers.get("Content-Type"),
          );
          expect(await newResponse.text()).toContain(
            "https://nthumods.com/zh-cn/",
          );
        } else {
          expect(await responseSnapshot(newResponse)).toEqual(
            await responseSnapshot(headResponse),
          );
        }
      } finally {
        restore();
      }
    },
  );

  const routerRouteSuffixes = [
    "",
    "today",
    "timetable",
    "timetable/view",
    "courses",
    "courses/modules",
    "courses/module/CS%20%2F%20101",
    "courses/instructor/%E6%9E%97%E6%95%99%E6%8E%88",
    "courses/CS%20101%20%26%201",
    "bus",
    "bus/main",
    "bus/main/line-1",
    "bus/city/route123",
    "calendar",
    "settings",
    "venues",
    "venues/engineering",
    "sports-venues",
    "laundry",
    "youbike",
    "library",
    "map",
    "chat",
    "shops",
    "apps",
    "student/grades",
    "student/id",
    "student/parcel",
    "student/planner",
    "issues",
    "contribute",
    "team",
    "recruit",
    "privacy-policy",
    "changelog",
    "proxy-login",
    "next-steps",
    "offline",
    "design-system",
    "timetable/share/share-123",
    "timetable/community",
    "timetable/group/group-123",
    "admin",
    "admin/users",
    "admin/users/user-123",
    "admin/announcements",
    "admin/recruitment",
    "admin/clients",
    "admin/audit",
    "waitlist",
    "unknown-route",
  ] as const;

  test.each(
    routerRouteSuffixes.flatMap((suffix) =>
      ["zh", "en"].map((lang) => [`/${lang}/${suffix}`, lang] as const),
    ),
  )(
    "keeps bot status equal to HEAD and never adds noindex for %s",
    async (path) => {
      const headWorker = loadHeadWorker();
      const restore = installWorkerRuntime(async (input) => {
        if (requestUrl(input).startsWith("https://api.nthumods.com/course/")) {
          return new Response(
            JSON.stringify({
              raw_id: "CS 101 & 1",
              semester: "11510",
              name_zh: "課程",
              name_en: "Course",
              department: "CS",
              teacher_zh: ["Teacher"],
              teacher_en: ["Teacher"],
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(null, { status: 500 });
      });
      const env = testEnv(async () => shellResponse());

      try {
        const request = (handler: typeof worker) =>
          handler.fetch(
            new Request(`https://example.test${path}`, {
              headers: { "User-Agent": "Googlebot" },
            }),
            env,
          );
        const [headResponse, newResponse] = await Promise.all([
          request(headWorker),
          request(worker),
        ]);

        expect(newResponse.status).toBe(headResponse.status);
        expect(await newResponse.text()).not.toContain("noindex");
      } finally {
        restore();
      }
    },
  );

  test.each([
    ["404", async () => new Response(null, { status: 404 })],
    ["500", async () => new Response(null, { status: 500 })],
    [
      "timeout",
      async () => {
        throw new Error("timeout");
      },
    ],
  ] as const)(
    "falls back to the 200 shell when course lookup fails (%s)",
    async (_label, fetchImpl) => {
      const restore = installWorkerRuntime(fetchImpl);
      try {
        const response = await worker.fetch(
          new Request("https://example.test/en/courses/CS%20101", {
            headers: { "User-Agent": "Googlebot" },
          }),
          testEnv(async () => shellResponse()),
        );
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Robots-Tag")).toBeNull();
        expect(html).not.toContain("noindex");
      } finally {
        restore();
      }
    },
  );

  test.each([
    ["/zh/today", "zh-TW", "https://nthumods.com/zh/today"],
    ["/en/today", "en", "https://nthumods.com/en/today"],
    ["/zh-cn/today", "zh-CN", "https://nthumods.com/zh-cn/today"],
    ["/zh/apps", "zh-TW", "https://nthumods.com/zh/apps"],
    ["/en/apps", "en", "https://nthumods.com/en/apps"],
    [
      "/zh/courses/instructor/%E6%9E%97%E6%95%99%E6%8E%88",
      "zh-TW",
      "https://nthumods.com/zh/courses/instructor/%E6%9E%97%E6%95%99%E6%8E%88",
    ],
    [
      "/en/courses/module/CS%20%2F%20101",
      "en",
      "https://nthumods.com/en/courses/module/CS%20%2F%20101",
    ],
  ] as const)(
    "keeps bot language and canonical links correct for %s",
    async (path, lang, canonical) => {
      const restore = installWorkerRuntime(
        async () => new Response(null, { status: 500 }),
      );
      try {
        const html = await (
          await worker.fetch(
            new Request(`https://example.test${path}`, {
              headers: { "User-Agent": "Googlebot" },
            }),
            testEnv(async () => shellResponse()),
          )
        ).text();

        expect(htmlAttribute(html, "html", "lang")).toBe(lang);
        expect(html).toContain(`rel="canonical" href="${canonical}"`);
        const zhUrl = canonical.replace(/\/(?:zh|zh-cn|en)(?=\/|$)/, "/zh");
        const enUrl = canonical.replace(/\/(?:zh|zh-cn|en)(?=\/|$)/, "/en");
        expect(html).toContain(`hreflang="zh-TW" href="${zhUrl}"`);
        expect(html).toContain(
          `hreflang="zh-CN" href="${canonical.replace(/\/(?:zh|zh-cn|en)(?=\/|$)/, "/zh-cn")}"`,
        );
        expect(html).toContain(`hreflang="en" href="${enUrl}"`);
        expect(html).toContain(`hreflang="x-default" href="${zhUrl}"`);
      } finally {
        restore();
      }
    },
  );

  test("escapes course metadata and JSON-LD without double escaping", async () => {
    const restore = installWorkerRuntime(async (input) => {
      if (requestUrl(input).startsWith("https://api.nthumods.com/course/")) {
        return new Response(
          JSON.stringify({
            raw_id: "CS 101 & 1",
            semester: "11510",
            name_zh: "「A&B」<課程> </script>",
            name_en: 'A "quoted" & advanced <course>',
            department: "CS&AI",
            teacher_zh: ["Teacher"],
            teacher_en: ["Teacher"],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(null, { status: 500 });
    });

    try {
      const response = await worker.fetch(
        new Request(
          "https://example.test/en/courses/CS%20101%20%26%201?utm_source=preview",
          { headers: { "User-Agent": "Twitterbot" } },
        ),
        testEnv(async () => shellResponse()),
      );
      const html = await response.text();
      const canonical = "https://nthumods.com/en/courses/CS%20101%20%26%201";
      const blocks = jsonLdBlocks(html);

      expect(response.status).toBe(200);
      expect(html).toContain(`href="${canonical}"`);
      expect(html).toContain("\\u003c/script\\u003e");
      expect(html).not.toContain("</script><script>");
      expect(blocks).toHaveLength(1);
      expect((blocks[0] as Record<string, unknown>[])[0]).toMatchObject({
        "@type": "Course",
        name: 'A "quoted" & advanced <course>',
        url: canonical,
      });
      expect(html).toContain("&lt;course&gt;");
    } finally {
      restore();
    }
  });
});
