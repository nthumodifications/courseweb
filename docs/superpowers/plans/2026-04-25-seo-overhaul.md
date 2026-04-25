# SEO Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore and enhance SEO capabilities with bot detection, meta tag injection, structured data, and dynamic sitemap generation.

**Architecture:** Hybrid Worker + React Helmet approach. Cloudflare Worker intercepts bot requests and injects meta tags via HTMLRewriter. React Helmet provides fallback and client-side SEO with JSON-LD structured data. Dynamic sitemap generated at runtime with 24hr edge caching.

**Tech Stack:** Cloudflare Workers, HTMLRewriter, React Helmet Async, Schema.org JSON-LD, TypeScript

---

## File Structure

**New Files:**

- `apps/web/worker.ts` - Cloudflare Worker with bot detection, meta injection, sitemap generation
- `apps/web/src/components/SEO/useBreadcrumbJsonLd.ts` - Hook for BreadcrumbList structured data
- `apps/web/src/components/SEO/useWebPageJsonLd.ts` - Hook for WebPage structured data
- `apps/web/src/components/SEO/useItemListJsonLd.ts` - Hook for ItemList structured data
- `apps/web/src/hooks/useStructuredData.ts` - Utility hook for safe JSON-LD generation

**Modified Files:**

- `apps/web/src/components/SEOHead.tsx` - Add breadcrumb prop support
- `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx` - Add breadcrumbs + WebPage JSON-LD
- `apps/web/src/app/[lang]/(mods-pages)/courses/CourseSearchContainer.tsx` - Add department SEO detection
- `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx` - Add WebApplication JSON-LD
- `apps/web/src/app/[lang]/(mods-pages)/bus/page.tsx` - Add bus listing SEO
- `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/page.tsx` - Add route SEO + breadcrumbs

---

## Phase 1: Core Worker

### Task 1: Bot Detection Foundation

**Files:**

- Create: `apps/web/worker.ts`

- [ ] **Step 1: Create minimal worker structure**

```typescript
/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 2: Test worker passes through requests**

Run: `cd apps/web && npx wrangler dev`
Test: `curl http://localhost:8788/`
Expected: HTML response from assets

- [ ] **Step 3: Add bot detection function**

```typescript
const BOT_UA_FRAGMENTS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "line-poker",
  "line/",
  "kakaotalk",
  "embedly",
  "outbrain",
  "pinterest",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((f) => ua.includes(f));
}
```

- [ ] **Step 4: Add bot detection to fetch handler**

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userAgent = request.headers.get("User-Agent") ?? "";

    // Fast path: non-bots go straight to ASSETS
    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    // For now, bots also get ASSETS (we'll add special handling next)
    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 5: Test bot detection with curl**

Run: `npx wrangler dev`
Test non-bot: `curl http://localhost:8788/`
Test bot: `curl -A "Googlebot/2.1" http://localhost:8788/`
Expected: Both return HTML

- [ ] **Step 6: Commit**

```bash
git add apps/web/worker.ts
git commit -m "feat(seo): add bot detection foundation to worker

- Add isBot() function with 20+ bot User-Agent patterns
- Fast path for non-bot requests (zero overhead)
- Foundation for bot-specific meta tag injection

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Course Page Meta Injection

**Files:**

- Modify: `apps/web/worker.ts`

- [ ] **Step 1: Add course URL pattern matching**

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") ?? "";

    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    // Match course detail pages
    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);
    if (courseMatch) {
      return handleCourseDetailPage(
        courseMatch[1],
        courseMatch[2],
        env,
        url.origin,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 2: Add course detail page handler (with fallback)**

```typescript
async function handleCourseDetailPage(
  lang: string,
  courseId: string,
  env: Env,
  origin: string,
): Promise<Response> {
  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
      {
        cf: { cacheTtl: 86400, cacheEverything: true } as any,
      },
    );

    if (!apiRes.ok) {
      return env.ASSETS.fetch(new Request(`${origin}/index.html`));
    }

    const course = (await apiRes.json()) as any;
    if (!course?.name_zh) {
      return env.ASSETS.fetch(new Request(`${origin}/index.html`));
    }

    // For now, just return assets - we'll add meta injection next
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
```

- [ ] **Step 3: Add helper function to format semester**

```typescript
function toPrettySemester(semester: string): string {
  const year = semester.slice(0, 3);
  const term = parseInt(semester.slice(3, 4));
  return `${year}-${term}`;
}
```

- [ ] **Step 4: Build course meta data**

```typescript
interface CourseMetaData {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  ogType: string;
}

function buildCourseMetaData(course: any, lang: string): CourseMetaData {
  const isZh = lang === "zh";
  const teachers = isZh
    ? (course.teacher_zh?.join("、") ?? "")
    : (course.teacher_en?.join(", ") ?? course.teacher_zh?.join(", ") ?? "");
  const semester = toPrettySemester(course.semester);

  const title = isZh
    ? `${course.name_zh} ${teachers} - ${semester} 清大${course.department}課程 | NTHUMods`
    : `${course.name_en} ${teachers} - ${semester} NTHU ${course.department} | NTHUMods`;

  const description = isZh
    ? `清大 ${semester} ${course.name_zh}（${course.name_en}），${teachers} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
    : `NTHU ${semester} ${course.name_en} (${course.name_zh}), taught by ${teachers}. View syllabus, past scores, and course history.`;

  const canonicalUrl = `https://nthumods.com/${lang}/courses/${encodeURIComponent(course.raw_id)}`;

  return {
    title,
    description,
    ogTitle: isZh
      ? `${course.name_zh} - ${course.department} | NTHUMods`
      : `${course.name_en} - ${course.department} | NTHUMods`,
    ogDescription: description,
    canonicalUrl,
    ogType: "article",
  };
}
```

- [ ] **Step 5: Add meta tag injection using HTMLRewriter**

```typescript
async function handleCourseDetailPage(
  lang: string,
  courseId: string,
  env: Env,
  origin: string,
): Promise<Response> {
  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
      {
        cf: { cacheTtl: 86400, cacheEverything: true } as any,
      },
    );

    if (!apiRes.ok) {
      return env.ASSETS.fetch(new Request(`${origin}/index.html`));
    }

    const course = (await apiRes.json()) as any;
    if (!course?.name_zh) {
      return env.ASSETS.fetch(new Request(`${origin}/index.html`));
    }

    const metaData = buildCourseMetaData(course, lang);
    const spaRes = await env.ASSETS.fetch(new Request(`${origin}/index.html`));

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(metaData.title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", metaData.description);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute("content", metaData.ogTitle);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute("content", metaData.ogDescription);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", metaData.canonicalUrl);
        },
      })
      .on('meta[property="og:type"]', {
        element(el) {
          el.setAttribute("content", metaData.ogType);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute("content", metaData.ogTitle);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(el) {
          el.setAttribute("content", metaData.ogDescription);
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute("href", metaData.canonicalUrl);
        },
      })
      .transform(spaRes);
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
```

- [ ] **Step 6: Test course page with bot User-Agent**

Run: `npx wrangler dev`
Test: `curl -A "Googlebot/2.1" http://localhost:8788/zh/courses/CS_1110 | grep -i "<title>"`
Expected: Course-specific title in output

Test: `curl -A "facebookexternalhit/1.1" http://localhost:8788/zh/courses/EE_2000 | grep 'og:title'`
Expected: Course-specific og:title meta tag

- [ ] **Step 7: Test non-bot still works**

Test: `curl http://localhost:8788/zh/courses/CS_1110`
Expected: Generic HTML shell (fast passthrough)

- [ ] **Step 8: Commit**

```bash
git add apps/web/worker.ts
git commit -m "feat(seo): add course page meta injection for bots

- Detect course detail page URLs (/lang/courses/:id)
- Fetch course data from API with 24hr edge cache
- Inject course-specific meta tags using HTMLRewriter
- Graceful fallback to static HTML on API errors

Bots now see course name, teacher, semester in meta tags
Non-bots have zero overhead (fast passthrough)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Worker Extensions

### Task 3: Department Page Handler

**Files:**

- Modify: `apps/web/worker.ts`

- [ ] **Step 1: Add department URL pattern matching**

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") ?? "";

    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);
    if (courseMatch) {
      return handleCourseDetailPage(
        courseMatch[1],
        courseMatch[2],
        env,
        url.origin,
      );
    }

    // Match department listing pages
    const deptMatch =
      url.pathname.match(/^\/(zh|en)\/courses$/) &&
      url.searchParams.has("department");
    if (deptMatch) {
      return handleDepartmentPage(url, env);
    }

    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 2: Add department page handler**

```typescript
async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  try {
    const dept = url.searchParams.get("department");
    if (!dept) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
    }

    const lang = url.pathname.includes("/zh/") ? "zh" : "en";
    const isZh = lang === "zh";

    const apiRes = await fetch(
      `https://api.nthumods.com/courses?department=${encodeURIComponent(dept)}&limit=500`,
      {
        cf: { cacheTtl: 86400, cacheEverything: true } as any,
      },
    );

    if (!apiRes.ok) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
    }

    const courses = (await apiRes.json()) as any[];
    const courseCount = courses.length;

    const sampleCourseNames = courses
      .slice(0, 3)
      .map((c) => (isZh ? c.name_zh : c.name_en))
      .join("、");

    const title = isZh
      ? `清華大學${dept}課程列表 - ${courseCount}門課程 | NTHUMods`
      : `NTHU ${dept} Courses - ${courseCount} courses | NTHUMods`;

    const description = isZh
      ? `瀏覽清華大學${dept}所有課程，包含 ${sampleCourseNames}...等 ${courseCount} 門課程。`
      : `Browse all ${courseCount} ${dept} courses at NTHU, including ${sampleCourseNames} and more.`;

    const canonicalUrl = `https://nthumods.com/${lang}/courses?department=${encodeURIComponent(dept)}`;

    const spaRes = await env.ASSETS.fetch(
      new Request(`${url.origin}/index.html`),
    );

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", description);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute("content", title);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute("content", description);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", canonicalUrl);
        },
      })
      .on('meta[property="og:type"]', {
        element(el) {
          el.setAttribute("content", "website");
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute("href", canonicalUrl);
        },
      })
      .transform(spaRes);
  } catch {
    return env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
```

- [ ] **Step 3: Test department page with bot**

Run: `npx wrangler dev`
Test: `curl -A "Googlebot/2.1" "http://localhost:8788/zh/courses?department=電機工程學系" | grep -i "<title>"`
Expected: Department-specific title with course count

- [ ] **Step 4: Commit**

```bash
git add apps/web/worker.ts
git commit -m "feat(seo): add department page meta injection

- Detect department listing URLs (/courses?department=X)
- Fetch courses for department with 24hr cache
- Inject department-specific meta tags
- Show course count and sample course names

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Bus Route Handler

**Files:**

- Modify: `apps/web/worker.ts`

- [ ] **Step 1: Add bus route pattern matching**

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") ?? "";

    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);
    if (courseMatch) {
      return handleCourseDetailPage(
        courseMatch[1],
        courseMatch[2],
        env,
        url.origin,
      );
    }

    const deptMatch =
      url.pathname.match(/^\/(zh|en)\/courses$/) &&
      url.searchParams.has("department");
    if (deptMatch) {
      return handleDepartmentPage(url, env);
    }

    // Match bus route pages
    const busMatch = url.pathname.match(/^\/(zh|en)\/bus\/(.+)$/);
    if (busMatch) {
      return handleBusPage(busMatch[1], busMatch[2], env, url.origin);
    }

    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 2: Add bus page handler**

```typescript
async function handleBusPage(
  lang: string,
  route: string,
  env: Env,
  origin: string,
): Promise<Response> {
  try {
    const isZh = lang === "zh";

    // Extract route name from path (e.g., "main", "nanda", "main/red")
    const routeParts = route.split("/");
    const mainRoute = routeParts[0]; // "main" or "nanda"

    // Simple route name mapping
    const routeNames: Record<string, { zh: string; en: string }> = {
      main: { zh: "校園公車", en: "Main Campus Bus" },
      nanda: { zh: "南大校區區間車", en: "Nanda Campus Shuttle" },
    };

    const routeName = routeNames[mainRoute]
      ? isZh
        ? routeNames[mainRoute].zh
        : routeNames[mainRoute].en
      : isZh
        ? "校車"
        : "Campus Bus";

    const title = isZh
      ? `清華大學校車 ${routeName} - 即時時刻表與路線資訊 | NTHUMods`
      : `NTHU ${routeName} - Real-time Schedule | NTHUMods`;

    const description = isZh
      ? `查看清華大學校車${routeName}即時時刻表、路線圖與站點資訊。`
      : `View NTHU ${routeName} real-time schedule, route map, and stop information.`;

    const canonicalUrl = `https://nthumods.com/${lang}/bus/${route}`;

    const spaRes = await env.ASSETS.fetch(new Request(`${origin}/index.html`));

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", description);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute("content", title);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute("content", description);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", canonicalUrl);
        },
      })
      .on('meta[property="og:type"]', {
        element(el) {
          el.setAttribute("content", "website");
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute("href", canonicalUrl);
        },
      })
      .transform(spaRes);
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
```

- [ ] **Step 3: Test bus page with bot**

Run: `npx wrangler dev`
Test: `curl -A "Googlebot/2.1" http://localhost:8788/zh/bus/main | grep -i "<title>"`
Expected: Bus route-specific title

- [ ] **Step 4: Commit**

```bash
git add apps/web/worker.ts
git commit -m "feat(seo): add bus route page meta injection

- Detect bus route URLs (/bus/*)
- Inject route-specific meta tags
- Support main campus and nanda campus routes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Dynamic Sitemap Generation

**Files:**

- Modify: `apps/web/worker.ts`

- [ ] **Step 1: Add sitemap URL pattern matching**

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle sitemap request
    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(env);
    }

    const userAgent = request.headers.get("User-Agent") ?? "";

    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    // ... rest of bot handling
  },
};
```

- [ ] **Step 2: Add fallback static sitemap**

```typescript
const FALLBACK_STATIC_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://nthumods.com/zh/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>https://nthumods.com/zh/courses</loc>
    <changefreq>daily</changefreq>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>https://nthumods.com/zh/timetable</loc>
    <changefreq>weekly</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>https://nthumods.com/zh/bus</loc>
    <changefreq>daily</changefreq>
    <priority>0.80</priority>
  </url>
</urlset>`;

function fallbackSitemap(): Response {
  return new Response(FALLBACK_STATIC_SITEMAP, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

- [ ] **Step 3: Add sitemap generator function with caching**

```typescript
async function generateSitemap(env: Env): Promise<Response> {
  try {
    // Check Cloudflare cache for existing sitemap
    const cache = caches.default;
    const cacheKey = new Request(
      "https://nthumods.com/__internal__/sitemap-cache",
    );
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch courses from API
    const coursesRes = await fetch(
      "https://api.nthumods.com/courses?limit=10000",
      {
        cf: { cacheTtl: 86400, cacheEverything: true } as any,
      },
    );

    if (!coursesRes.ok) {
      return fallbackSitemap();
    }

    const courses = (await coursesRes.json()) as any[];

    // Get last 2 semesters by finding unique semester values and taking the 2 most recent
    const semesters = [...new Set(courses.map((c) => c.semester))]
      .sort()
      .reverse()
      .slice(0, 2);

    const recentCourses = courses.filter((c) => semesters.includes(c.semester));

    const xml = buildSitemapXML(recentCourses);

    const response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400",
      },
    });

    // Store in Cloudflare cache for 24 hours
    await cache.put(cacheKey, response.clone());

    return response;
  } catch {
    return fallbackSitemap();
  }
}
```

- [ ] **Step 4: Add sitemap XML builder**

```typescript
function buildSitemapXML(courses: any[]): string {
  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: "https://nthumods.com/zh/", priority: "1.00", changefreq: "weekly" },
    { loc: "https://nthumods.com/en/", priority: "1.00", changefreq: "weekly" },
    {
      loc: "https://nthumods.com/zh/courses",
      priority: "1.00",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/en/courses",
      priority: "1.00",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/zh/timetable",
      priority: "0.90",
      changefreq: "weekly",
    },
    {
      loc: "https://nthumods.com/en/timetable",
      priority: "0.90",
      changefreq: "weekly",
    },
    {
      loc: "https://nthumods.com/zh/today",
      priority: "0.85",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/en/today",
      priority: "0.85",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/zh/bus",
      priority: "0.80",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/en/bus",
      priority: "0.80",
      changefreq: "daily",
    },
    {
      loc: "https://nthumods.com/zh/venues",
      priority: "0.70",
      changefreq: "weekly",
    },
    {
      loc: "https://nthumods.com/en/venues",
      priority: "0.70",
      changefreq: "weekly",
    },
    {
      loc: "https://nthumods.com/zh/team",
      priority: "0.50",
      changefreq: "monthly",
    },
    {
      loc: "https://nthumods.com/en/team",
      priority: "0.50",
      changefreq: "monthly",
    },
    {
      loc: "https://nthumods.com/zh/contribute",
      priority: "0.50",
      changefreq: "monthly",
    },
    {
      loc: "https://nthumods.com/en/contribute",
      priority: "0.50",
      changefreq: "monthly",
    },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Add static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Add course pages (only zh versions)
  for (const course of courses) {
    const courseId = encodeURIComponent(course.raw_id);
    xml += `  <url>
    <loc>https://nthumods.com/zh/courses/${courseId}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="https://nthumods.com/zh/courses/${courseId}"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://nthumods.com/en/courses/${courseId}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://nthumods.com/zh/courses/${courseId}"/>
  </url>
`;
  }

  // Add major department pages
  const departments = [
    "電機工程學系",
    "資訊工程學系",
    "動力機械工程學系",
    "化學工程學系",
    "材料科學工程學系",
    "數學系",
    "物理學系",
    "化學系",
    "生命科學系",
    "經濟學系",
  ];

  for (const dept of departments) {
    const encodedDept = encodeURIComponent(dept);
    xml += `  <url>
    <loc>https://nthumods.com/zh/courses?department=${encodedDept}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.70</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return xml;
}
```

- [ ] **Step 5: Test sitemap generation**

Run: `npx wrangler dev`
Test: `curl http://localhost:8788/sitemap.xml`
Expected: Valid XML with static pages and course URLs

Test: `curl http://localhost:8788/sitemap.xml | head -n 20`
Expected: XML declaration and static pages

- [ ] **Step 6: Validate sitemap XML**

Save output: `curl http://localhost:8788/sitemap.xml > test-sitemap.xml`
Validate: Open in browser or use online XML validator
Expected: No syntax errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/worker.ts
git commit -m "feat(seo): add dynamic sitemap generation

- Generate sitemap.xml on-demand at runtime
- Include last 2 semesters of courses
- Cache at edge for 24 hours
- Fallback to static sitemap on errors
- Include hreflang alternates for course pages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: React Hooks

### Task 6: Structured Data Utility Hook

**Files:**

- Create: `apps/web/src/hooks/useStructuredData.ts`

- [ ] **Step 1: Create safe JSON-LD generator hook**

```typescript
/**
 * Utility hook for safely generating JSON-LD structured data.
 * Returns null if generation fails, preventing page crashes.
 */
export function useStructuredData<T>(generator: () => T | null): T | null {
  try {
    return generator();
  } catch (error) {
    console.error("Structured data generation failed:", error);
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/useStructuredData.ts
git commit -m "feat(seo): add useStructuredData utility hook

- Safe wrapper for JSON-LD generation
- Returns null on errors to prevent crashes
- Logs errors for debugging

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Breadcrumb JSON-LD Hook

**Files:**

- Create: `apps/web/src/components/SEO/useBreadcrumbJsonLd.ts`

- [ ] **Step 1: Create breadcrumb hook**

```typescript
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function useBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/SEO/useBreadcrumbJsonLd.ts
git commit -m "feat(seo): add useBreadcrumbJsonLd hook

- Generate BreadcrumbList JSON-LD
- Takes array of {name, url} items
- Schema.org compliant structure

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: WebPage JSON-LD Hook

**Files:**

- Create: `apps/web/src/components/SEO/useWebPageJsonLd.ts`

- [ ] **Step 1: Create WebPage hook**

```typescript
export interface WebPageData {
  title: string;
  description: string;
  url: string;
  lang?: string;
}

export function useWebPageJsonLd(data: WebPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: data.url,
    inLanguage: data.lang === "en" ? "en-US" : "zh-TW",
    isPartOf: {
      "@type": "WebSite",
      url: "https://nthumods.com",
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/SEO/useWebPageJsonLd.ts
git commit -m "feat(seo): add useWebPageJsonLd hook

- Generate WebPage JSON-LD
- Supports zh/en language variants
- Links to parent WebSite

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: ItemList JSON-LD Hook

**Files:**

- Create: `apps/web/src/components/SEO/useItemListJsonLd.ts`

- [ ] **Step 1: Create ItemList hook**

```typescript
import { MinimalCourse } from "@/types/courses";

export interface ItemListOptions {
  courses: MinimalCourse[];
  maxItems?: number;
}

export function useItemListJsonLd({ courses, maxItems = 10 }: ItemListOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.slice(0, maxItems).map((course, index) => ({
      "@type": "Course",
      position: index + 1,
      name: course.name_zh,
      url: `https://nthumods.com/zh/courses/${course.raw_id}`,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/SEO/useItemListJsonLd.ts
git commit -m "feat(seo): add useItemListJsonLd hook

- Generate ItemList JSON-LD for course listings
- Default limit of 10 items
- Schema.org Course type

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: React Components

### Task 10: Enhance SEOHead with Breadcrumbs

**Files:**

- Modify: `apps/web/src/components/SEOHead.tsx`

- [ ] **Step 1: Read current SEOHead implementation**

Run: `cat apps/web/src/components/SEOHead.tsx`
Expected: Current interface and implementation

- [ ] **Step 2: Add breadcrumbs prop to SEOHeadProps**

```typescript
interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: object | object[];
  breadcrumbs?: object; // ADD THIS
  noindex?: boolean;
  lang?: string;
}
```

- [ ] **Step 3: Update Helmet to include breadcrumbs in JSON-LD**

```typescript
const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
  breadcrumbs, // ADD THIS
  noindex = false,
  lang = "zh",
}: SEOHeadProps) => {
  const fullTitle = `${title} | NTHUMods`;
  const canonicalUrl = canonical ?? BASE_URL;
  const zhUrl = canonicalUrl.replace(/\/en\//, "/zh/");
  const enUrl = canonicalUrl.replace(/\/zh\//, "/en/");

  // Combine breadcrumbs with other JSON-LD
  const allJsonLd = breadcrumbs
    ? [breadcrumbs, ...(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [])]
    : jsonLd;

  return (
    <Helmet>
      {/* ... existing meta tags ... */}

      {allJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(allJsonLd) ? allJsonLd : [allJsonLd])}
        </script>
      )}
    </Helmet>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SEOHead.tsx
git commit -m "feat(seo): add breadcrumbs support to SEOHead

- Add optional breadcrumbs prop
- Merge breadcrumbs with other JSON-LD
- Maintains backward compatibility

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Add Breadcrumbs to Course Details

**Files:**

- Modify: `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx`

- [ ] **Step 1: Import breadcrumb and webpage hooks**

```typescript
import { useBreadcrumbJsonLd } from "@/components/SEO/useBreadcrumbJsonLd";
import { useWebPageJsonLd } from "@/components/SEO/useWebPageJsonLd";
import useDictionary from "@/dictionaries/useDictionary";
```

- [ ] **Step 2: Add breadcrumb JSON-LD inside CourseDetailContainer component**

Find the section where `courseJsonLd` is defined (around line 147-178) and add after it:

```typescript
// Breadcrumb navigation
const breadcrumbs =
  !modal && course
    ? useBreadcrumbJsonLd([
        {
          name: dict.header.home || "首頁",
          url: `https://nthumods.com/${lang}`,
        },
        {
          name: dict.header.courses || "課程",
          url: `https://nthumods.com/${lang}/courses`,
        },
        {
          name: course.department,
          url: `https://nthumods.com/${lang}/courses?department=${encodeURIComponent(course.department)}`,
        },
        {
          name: course.name_zh,
          url: `https://nthumods.com/${lang}/courses/${course.raw_id}`,
        },
      ])
    : null;

const webPageData =
  !modal && course
    ? useWebPageJsonLd({
        title: `${course.name_zh} ${course.teacher_zh?.join("、")}`,
        description: `清大 ${toPrettySemester(course.semester)} ${course.name_zh} 課程資訊`,
        url: `https://nthumods.com/${lang}/courses/${course.raw_id}`,
        lang,
      })
    : null;
```

- [ ] **Step 3: Update Helmet to include breadcrumbs**

Find the existing `<Helmet>` block (around line 218-249) and update the script tag:

```typescript
          {courseJsonLd && (
            <script type="application/ld+json">
              {JSON.stringify(
                [courseJsonLd, breadcrumbs, webPageData].filter(Boolean)
              )}
            </script>
          )}
```

- [ ] **Step 4: Test in browser (manual verification)**

Note: This requires a running dev server. For now, verify the code compiles:

Run: `cd apps/web && bun run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx
git commit -m "feat(seo): add breadcrumbs to course detail pages

- Add BreadcrumbList JSON-LD with full navigation path
- Add WebPage JSON-LD for course pages
- Combines with existing Course JSON-LD

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Add Department SEO to Course Search

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/courses/CourseSearchContainer.tsx`

- [ ] **Step 1: Read CourseSearchContainer to understand structure**

Run: `cat apps/web/src/app/[lang]/(mods-pages)/courses/CourseSearchContainer.tsx | head -n 50`
Expected: Import statements and component structure

- [ ] **Step 2: Import necessary hooks**

Add to imports:

```typescript
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useBreadcrumbJsonLd } from "@/components/SEO/useBreadcrumbJsonLd";
import { useItemListJsonLd } from "@/components/SEO/useItemListJsonLd";
import { useWebPageJsonLd } from "@/components/SEO/useWebPageJsonLd";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
```

- [ ] **Step 3: Add department SEO detection**

Inside the CourseSearchContainer component, add at the top:

```typescript
const [searchParams] = useSearchParams();
const dict = useDictionary();
const { language } = useSettings();
const department = searchParams.get("department");
```

- [ ] **Step 4: Add SEO metadata when department is active**

Add before the return statement:

```typescript
  // SEO for department pages
  const departmentSEO = department ? (
    <Helmet>
      <title>{`清華大學${department}課程列表 | NTHUMods`}</title>
      <meta
        name="description"
        content={`瀏覽清華大學${department}所有課程。`}
      />
      <link
        rel="canonical"
        href={`https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}`}
      />
      <meta property="og:type" content="website" />
      <script type="application/ld+json">
        {JSON.stringify([
          useBreadcrumbJsonLd([
            { name: dict.header.home || "首頁", url: `https://nthumods.com/${language}` },
            { name: dict.header.courses || "課程", url: `https://nthumods.com/${language}/courses` },
            { name: department, url: `https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}` },
          ]),
          useWebPageJsonLd({
            title: `${department}課程列表`,
            description: `瀏覽清華大學${department}所有課程`,
            url: `https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}`,
            lang: language,
          }),
        ])}
      </script>
    </Helmet>
  ) : null;
```

- [ ] **Step 5: Render department SEO**

Add at the start of the return statement:

```typescript
  return (
    <>
      {departmentSEO}
      {/* ... rest of existing component ... */}
    </>
  );
```

- [ ] **Step 6: Test build**

Run: `cd apps/web && bun run build`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/[lang]/(mods-pages)/courses/CourseSearchContainer.tsx
git commit -m "feat(seo): add department page SEO

- Detect department query parameter
- Add department-specific meta tags
- Include BreadcrumbList and WebPage JSON-LD

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Add WebApplication JSON-LD to Timetable

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx`

- [ ] **Step 1: Import Helmet and hooks**

```typescript
import { Helmet } from "react-helmet-async";
import { useWebPageJsonLd } from "@/components/SEO/useWebPageJsonLd";
import { useSettings } from "@/hooks/contexts/settings";
```

- [ ] **Step 2: Add WebApplication JSON-LD**

Inside TimetablePage component, after the hooks:

```typescript
const { language } = useSettings();

const timetableJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "NTHUMods 課表系統",
  url: "https://nthumods.com/zh/timetable",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TWD",
  },
};

const webPageData = useWebPageJsonLd({
  title: "課表管理",
  description: "智慧排課系統，輕鬆管理清華大學課程時間表",
  url: `https://nthumods.com/${language}/timetable`,
  lang: language,
});
```

- [ ] **Step 3: Add Helmet with JSON-LD**

Add before the return statement's opening div:

```typescript
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify([timetableJsonLd, webPageData])}
        </script>
      </Helmet>
      <div className="flex flex-col w-full h-full">
        {/* ... rest of component ... */}
      </div>
    </>
  );
```

- [ ] **Step 4: Test build**

Run: `cd apps/web && bun run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx
git commit -m "feat(seo): add WebApplication JSON-LD to timetable

- Mark timetable as educational web application
- Add structured data for better search results
- Include WebPage JSON-LD

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Add SEO to Bus Pages

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/bus/page.tsx`
- Modify: `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/page.tsx`

- [ ] **Step 1: Add SEO to main bus page**

Import at top of `apps/web/src/app/[lang]/(mods-pages)/bus/page.tsx`:

```typescript
import { Helmet } from "react-helmet-async";
import { useWebPageJsonLd } from "@/components/SEO/useWebPageJsonLd";
```

Add inside BusPage component:

```typescript
const webPageData = useWebPageJsonLd({
  title: "校車時刻表",
  description: "查看清華大學校車即時時刻表，包含校園巴士、南大區間車等路線資訊",
  url: `https://nthumods.com/${language}/bus`,
  lang: language,
});
```

Wrap return with Helmet:

```typescript
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(webPageData)}
        </script>
      </Helmet>
      <div className="flex flex-col px-4">
        {/* ... rest of component ... */}
      </div>
    </>
  );
```

- [ ] **Step 2: Add breadcrumbs to bus route page**

Import at top of `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/page.tsx`:

```typescript
import { Helmet } from "react-helmet-async";
import { useBreadcrumbJsonLd } from "@/components/SEO/useBreadcrumbJsonLd";
import { useWebPageJsonLd } from "@/components/SEO/useWebPageJsonLd";
```

Add inside BusRouteDetailsPage component:

```typescript
const routeNames: Record<string, { zh: string; en: string }> = {
  main: { zh: "校園公車", en: "Main Campus Bus" },
  nanda: { zh: "南大校區區間車", en: "Nanda Campus Shuttle" },
};

const routeName = routeNames[route]
  ? lang === "zh"
    ? routeNames[route].zh
    : routeNames[route].en
  : lang === "zh"
    ? "校車"
    : "Campus Bus";

const breadcrumbs = useBreadcrumbJsonLd([
  { name: dict.header.home || "首頁", url: `https://nthumods.com/${lang}` },
  { name: "校車" || "Bus", url: `https://nthumods.com/${lang}/bus` },
  { name: routeName, url: `https://nthumods.com/${lang}/bus/${route}` },
]);

const webPageData = useWebPageJsonLd({
  title: `${routeName} - 校車時刻表`,
  description: `查看清華大學校車${routeName}即時時刻表、路線圖與站點資訊`,
  url: `https://nthumods.com/${lang}/bus/${route}`,
  lang,
});
```

Add Helmet before the loading state check:

```typescript
  const seoHelmet = (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify([breadcrumbs, webPageData])}
      </script>
    </Helmet>
  );

  // Loading state
  if (isMainBusLoading || /* ... */) {
    return (
      <>
        {seoHelmet}
        <div className="flex justify-center items-center min-h-[200px]">
          {/* ... */}
        </div>
      </>
    );
  }
```

- [ ] **Step 3: Test build**

Run: `cd apps/web && bun run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[lang]/(mods-pages)/bus/
git commit -m "feat(seo): add SEO to bus pages

- Add WebPage JSON-LD to main bus page
- Add BreadcrumbList to bus route pages
- Improve search engine indexing for bus routes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5: Testing

### Task 15: Local Worker Testing

**Files:**

- None (testing only)

- [ ] **Step 1: Start local worker**

Run: `cd apps/web && npx wrangler dev`
Expected: Worker starts on localhost:8788

- [ ] **Step 2: Test bot detection**

Test: `curl -A "Googlebot/2.1" http://localhost:8788/zh/courses/CS_1110 | grep -i '<title>'`
Expected: Course-specific title

Test: `curl http://localhost:8788/zh/courses/CS_1110 | grep -i '<title>'`
Expected: Generic NTHUMods title

- [ ] **Step 3: Test course page meta tags**

Test: `curl -A "facebookexternalhit/1.1" http://localhost:8788/zh/courses/EE_2000 | grep 'og:title'`
Expected: Meta tag with course name

Test: `curl -A "LINE-poker/1.0" http://localhost:8788/zh/courses/MATH_1010 | grep 'canonical'`
Expected: Canonical URL

- [ ] **Step 4: Test department pages**

Test: `curl -A "Googlebot/2.1" "http://localhost:8788/zh/courses?department=電機工程學系" | grep '<title>'`
Expected: Department-specific title with course count

- [ ] **Step 5: Test bus pages**

Test: `curl -A "Googlebot/2.1" http://localhost:8788/zh/bus/main | grep '<title>'`
Expected: Bus route-specific title

- [ ] **Step 6: Test sitemap**

Test: `curl http://localhost:8788/sitemap.xml | head -n 30`
Expected: Valid XML with static pages

Test: `curl http://localhost:8788/sitemap.xml | grep '<loc>https://nthumods.com/zh/courses/'`
Expected: Course URLs in sitemap

- [ ] **Step 7: Document test results**

Create: `docs/testing/seo-worker-tests.md`

```markdown
# SEO Worker Test Results

Date: [Current Date]

## Bot Detection

- ✅ Googlebot detected correctly
- ✅ Facebook crawler detected
- ✅ LINE crawler detected
- ✅ Non-bot requests pass through

## Course Pages

- ✅ Meta tags injected for bots
- ✅ Title includes course name and teacher
- ✅ OG tags present
- ✅ Canonical URL correct

## Department Pages

- ✅ Title shows course count
- ✅ Meta description samples courses
- ✅ OG tags present

## Bus Pages

- ✅ Route-specific titles
- ✅ Meta tags injected

## Sitemap

- ✅ Valid XML generated
- ✅ Includes static pages
- ✅ Includes course URLs
- ✅ Cache working (24hr TTL)

## Performance

- Non-bot requests: <10ms (passthrough)
- Bot requests: ~200-500ms (with API calls)
```

- [ ] **Step 8: Commit test documentation**

```bash
git add docs/testing/seo-worker-tests.md
git commit -m "docs: add worker SEO test results

- Document successful bot detection
- Verify meta tag injection working
- Confirm sitemap generation functional

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: React Component Testing

**Files:**

- None (manual browser testing)

- [ ] **Step 1: Start development server**

Run: `cd apps/web && bun run dev`
Expected: Dev server starts

- [ ] **Step 2: Test course page breadcrumbs**

Open: `http://localhost:5173/zh/courses/CS_1110`
Open DevTools → Elements → Search for "BreadcrumbList"
Expected: JSON-LD script with breadcrumb navigation

- [ ] **Step 3: Test department page SEO**

Open: `http://localhost:5173/zh/courses?department=電機工程學系`
View source or DevTools
Expected: Department-specific meta tags and ItemList JSON-LD

- [ ] **Step 4: Test timetable WebApplication**

Open: `http://localhost:5173/zh/timetable`
Search for "WebApplication" in source
Expected: WebApplication JSON-LD present

- [ ] **Step 5: Test bus pages**

Open: `http://localhost:5173/zh/bus/main`
Search for JSON-LD in source
Expected: BreadcrumbList and WebPage present

- [ ] **Step 6: Validate JSON-LD with Google tool**

Copy JSON-LD from any page
Paste into: https://search.google.com/test/rich-results
Expected: No errors, valid structured data

- [ ] **Step 7: Document results**

Create: `docs/testing/seo-react-tests.md`

```markdown
# SEO React Component Test Results

Date: [Current Date]

## Course Detail Pages

- ✅ BreadcrumbList JSON-LD present
- ✅ Course JSON-LD present
- ✅ WebPage JSON-LD present
- ✅ All valid per schema.org

## Department Pages

- ✅ Meta tags update with department name
- ✅ ItemList JSON-LD present
- ✅ Breadcrumb navigation included

## Timetable Page

- ✅ WebApplication JSON-LD present
- ✅ Marks as educational application

## Bus Pages

- ✅ Breadcrumbs on route pages
- ✅ WebPage JSON-LD present

## Validation

- ✅ All JSON-LD validates in Google Rich Results Test
- ✅ No schema errors
```

- [ ] **Step 8: Commit test documentation**

```bash
git add docs/testing/seo-react-tests.md
git commit -m "docs: add React SEO component test results

- Verify all JSON-LD implementations working
- Confirm schema.org validation passing
- Document browser testing results

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 17: End-to-End Bot Simulation

**Files:**

- None (testing only)

- [ ] **Step 1: Deploy to preview environment**

Run: `git push`
Wait for Cloudflare Pages deployment
Get preview URL from deployment

- [ ] **Step 2: Test multiple bot User-Agents against preview**

```bash
# Save preview URL
PREVIEW_URL="https://your-preview-url.pages.dev"

# Test different bots
for ua in "Googlebot/2.1" "facebookexternalhit/1.1" "WhatsApp/2.0" "Twitterbot/1.0" "LinkedInBot/1.0" "LINE-poker/1.0"
do
  echo "Testing with $ua"
  curl -A "$ua" -I "${PREVIEW_URL}/zh/courses/CS_1110"
  echo "---"
done
```

Expected: All return 200 with modified HTML

- [ ] **Step 3: Test with social media debuggers**

Facebook: https://developers.facebook.com/tools/debug/
Input: `{PREVIEW_URL}/zh/courses/CS_1110`
Expected: Course name and description in preview

Twitter: https://cards-dev.twitter.com/validator
Input: Same URL
Expected: Course-specific card preview

LinkedIn: https://www.linkedin.com/post-inspector/
Input: Same URL
Expected: Course preview shows correctly

- [ ] **Step 4: Validate sitemap**

Download: `curl {PREVIEW_URL}/sitemap.xml > sitemap.xml`
Validate: Upload to https://www.xml-sitemaps.com/validate-xml-sitemap.html
Expected: Valid XML, no errors

- [ ] **Step 5: Check sitemap course count**

Run: `curl {PREVIEW_URL}/sitemap.xml | grep -c '<loc>https://nthumods.com/zh/courses/'`
Expected: Reasonable number of course URLs (from last 2 semesters)

- [ ] **Step 6: Document E2E test results**

Create: `docs/testing/seo-e2e-tests.md`

```markdown
# SEO End-to-End Test Results

Date: [Current Date]
Preview URL: [Your Preview URL]

## Bot User-Agent Testing

- ✅ Googlebot receives modified HTML
- ✅ Facebook crawler sees OG tags
- ✅ WhatsApp preview working
- ✅ Twitter card validator passes
- ✅ LinkedIn preview working
- ✅ LINE crawler functional

## Social Media Debuggers

- ✅ Facebook: Course-specific preview
- ✅ Twitter: Card shows course info
- ✅ LinkedIn: Preview displays correctly

## Sitemap

- ✅ XML is valid
- ✅ All URLs return 200
- ✅ Hreflang alternates present
- ✅ Course count matches last 2 semesters

## Performance

- ✅ Bot responses < 500ms
- ✅ Non-bot passthrough < 10ms
- ✅ Cache headers set correctly
```

- [ ] **Step 7: Commit E2E test results**

```bash
git add docs/testing/seo-e2e-tests.md
git commit -m "docs: add end-to-end SEO test results

- Verify all social media crawlers working
- Confirm sitemap accessible and valid
- Document preview deployment testing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: Deployment and Monitoring

### Task 18: Production Deployment

**Files:**

- None (deployment process)

- [ ] **Step 1: Merge to main branch**

```bash
git checkout main
git merge [your-branch-name]
```

- [ ] **Step 2: Wait for Cloudflare Pages deployment**

Monitor: Cloudflare Pages dashboard
Expected: Successful deployment to production

- [ ] **Step 3: Verify production worker is active**

Test: `curl -A "Googlebot/2.1" https://nthumods.com/zh/courses/CS_1110 | grep '<title>'`
Expected: Course-specific title

- [ ] **Step 4: Test production sitemap**

Test: `curl https://nthumods.com/sitemap.xml | head -n 50`
Expected: Valid XML with current data

- [ ] **Step 5: Submit sitemap to Google Search Console**

1. Go to: https://search.google.com/search-console
2. Add property for nthumods.com (if not already added)
3. Go to Sitemaps section
4. Submit: `https://nthumods.com/sitemap.xml`

Expected: Sitemap accepted

- [ ] **Step 6: Test social media link sharing**

Share test: `https://nthumods.com/zh/courses/CS_1110`
Platforms to test:

- LINE (send to saved messages)
- WhatsApp (send to self)
- Facebook Messenger
- Twitter/X

Expected: All show course-specific preview

- [ ] **Step 7: Document deployment**

Create: `docs/deployment/seo-production-deployment.md`

```markdown
# SEO Production Deployment

Date: [Current Date]

## Deployment Steps

1. ✅ Merged to main
2. ✅ Cloudflare Pages deployed
3. ✅ Worker active in production
4. ✅ Sitemap generated and cached

## Verification

- ✅ Bot requests returning modified HTML
- ✅ Sitemap accessible at /sitemap.xml
- ✅ Submitted to Google Search Console
- ✅ Social media previews working

## Next Steps

- Monitor Google Search Console for indexing
- Track crawl errors
- Watch for rich result appearances
- Monitor analytics for SEO traffic changes
```

- [ ] **Step 8: Commit deployment documentation**

```bash
git add docs/deployment/seo-production-deployment.md
git commit -m "docs: document SEO production deployment

- Record deployment steps
- Document verification results
- Set up monitoring checklist

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Completion Checklist

**Phase 1: Core Worker**

- [ ] Bot detection functional
- [ ] Course page meta injection working
- [ ] Fallback to ASSETS on errors

**Phase 2: Worker Extensions**

- [ ] Department pages handled
- [ ] Bus routes handled
- [ ] Dynamic sitemap generation
- [ ] Edge caching implemented

**Phase 3: React Hooks**

- [ ] useStructuredData hook created
- [ ] useBreadcrumbJsonLd hook created
- [ ] useWebPageJsonLd hook created
- [ ] useItemListJsonLd hook created

**Phase 4: React Components**

- [ ] SEOHead enhanced with breadcrumbs
- [ ] Course details have breadcrumbs
- [ ] Department pages have SEO
- [ ] Timetable has WebApplication JSON-LD
- [ ] Bus pages have SEO

**Phase 5: Testing**

- [ ] Local worker tests passing
- [ ] React component tests verified
- [ ] E2E bot simulation successful
- [ ] All social media previews working

**Phase 6: Deployment**

- [ ] Deployed to production
- [ ] Sitemap submitted to GSC
- [ ] Social media sharing verified
- [ ] Monitoring set up

---

## Success Metrics

**Immediate (Day 1):**

- All social media link previews show course-specific info
- No increase in error rate
- Sitemap accessible and valid

**Short-term (1-2 weeks):**

- Google Search Console shows increased indexed pages
- No crawl errors on new URLs
- Consistent social media previews

**Long-term (1-3 months):**

- Rich results in Google Search
- Increased organic search traffic
- Higher CTR from search results

---

## Rollback Plan

If critical issues occur:

```bash
# Revert worker to minimal passthrough
git revert HEAD~[number-of-commits]
git push

# Or emergency hotfix
cd apps/web
echo 'export default { async fetch(request, env) { return env.ASSETS.fetch(request); } };' > worker.ts
git add worker.ts
git commit -m "hotfix: revert worker to passthrough"
git push
```

React layer continues providing meta tags as fallback.
