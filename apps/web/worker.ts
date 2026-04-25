/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

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
  const lowerUA = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((fragment) => lowerUA.includes(fragment));
}

function toPrettySemester(semester: string): string {
  const year = semester.slice(0, 3);
  const term = semester[3];
  return `${year}-${term}`;
}

interface CourseMetaData {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  ogType: string;
}

function buildCourseMetaData(course: any, lang: string): CourseMetaData {
  const semester = toPrettySemester(course.semester);
  const teachersZh = Array.isArray(course.teacher_zh)
    ? course.teacher_zh.join("、")
    : "";
  const teachersEn = Array.isArray(course.teacher_en)
    ? course.teacher_en.join(", ")
    : teachersZh;

  const title =
    lang === "zh"
      ? `${course.name_zh} ${teachersZh} - ${semester} 清大${course.department}課程 | NTHUMods`
      : `${course.name_en} ${teachersEn} - ${semester} NTHU ${course.department} | NTHUMods`;

  const description =
    lang === "zh"
      ? `清大 ${semester} ${course.name_zh}（${course.name_en}），${teachersZh} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
      : `NTHU ${semester} ${course.name_en} (${course.name_zh}), taught by ${teachersEn}. View syllabus, past scores, and course history.`;

  const ogTitle =
    lang === "zh"
      ? `${course.name_zh} - ${course.department} | NTHUMods`
      : `${course.name_en} - ${course.department} | NTHUMods`;

  const canonicalUrl = `https://nthumods.com/${lang}/courses/${encodeURIComponent(course.raw_id)}`;

  return {
    title,
    description,
    ogTitle,
    ogDescription: description,
    canonicalUrl,
    ogType: "article",
  };
}

async function handleCourseDetailPage(
  lang: string,
  courseId: string,
  env: Env,
  origin: string,
): Promise<Response> {
  const fallback = () => env.ASSETS.fetch(new Request(`${origin}/index.html`));

  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
      { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit,
    );

    if (!apiRes.ok) {
      return fallback();
    }

    const course = (await apiRes.json()) as any;

    if (!course?.name_zh) {
      return fallback();
    }

    const meta = buildCourseMetaData(course, lang);
    const shellRes = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`),
    );

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(meta.title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", meta.description);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute("content", meta.ogTitle);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute("content", meta.ogDescription);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", meta.canonicalUrl);
        },
      })
      .on('meta[property="og:type"]', {
        element(el) {
          el.setAttribute("content", meta.ogType);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute("content", meta.ogTitle);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(el) {
          el.setAttribute("content", meta.ogDescription);
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute("href", meta.canonicalUrl);
        },
      })
      .transform(shellRes);
  } catch {
    return fallback();
  }
}

async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  const dept = url.searchParams.get("department") ?? "";
  const lang = url.pathname.includes("/zh/") ? "zh" : "en";
  const fallback = () =>
    env.ASSETS.fetch(new Request(`${url.origin}/index.html`));

  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/courses?department=${encodeURIComponent(dept)}&limit=500`,
      { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit,
    );

    if (!apiRes.ok) {
      return fallback();
    }

    const courses = (await apiRes.json()) as any[];

    if (!Array.isArray(courses) || courses.length === 0) {
      return fallback();
    }

    const count = courses.length;
    const first3 = courses.slice(0, 3);

    const title =
      lang === "zh"
        ? `清華大學${dept}課程列表 - ${count}門課程 | NTHUMods`
        : `NTHU ${dept} Courses - ${count} courses | NTHUMods`;

    const description =
      lang === "zh"
        ? `${first3.map((c) => c.name_zh).join("、")}...等 ${count} 門課程。`
        : `${first3.map((c) => c.name_en ?? c.name_zh).join(", ")}... and ${count} more courses.`;

    const canonicalUrl = `https://nthumods.com/${lang}/courses?department=${encodeURIComponent(dept)}`;

    const shellRes = await env.ASSETS.fetch(
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
      .transform(shellRes);
  } catch {
    return fallback();
  }
}

async function handleBusPage(
  lang: string,
  route: string,
  env: Env,
  origin: string,
): Promise<Response> {
  const fallback = () => env.ASSETS.fetch(new Request(`${origin}/index.html`));

  try {
    const routeNames: Record<string, { zh: string; en: string }> = {
      main: { zh: "校園公車", en: "Main Campus Bus" },
      nanda: { zh: "南大校區區間車", en: "Nanda Campus Shuttle" },
    };

    const mainRoute = route.split("/")[0];
    const routeName = routeNames[mainRoute] ?? { zh: "校車", en: "Campus Bus" };

    const title =
      lang === "zh"
        ? `清華大學校車 ${routeName.zh} - 即時時刻表與路線資訊 | NTHUMods`
        : `NTHU ${routeName.en} - Real-time Schedule | NTHUMods`;

    const description =
      lang === "zh"
        ? `查看清華大學校車${routeName.zh}即時時刻表、路線圖與站點資訊。`
        : `View NTHU ${routeName.en} real-time schedule, route map, and stop information.`;

    const canonicalUrl = `https://nthumods.com/${lang}/bus/${route}`;

    const shellRes = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`),
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
      .transform(shellRes);
  } catch {
    return fallback();
  }
}

const FALLBACK_STATIC_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://nthumods.com/zh/</loc><changefreq>weekly</changefreq><priority>1.00</priority></url>
  <url><loc>https://nthumods.com/zh/courses</loc><changefreq>daily</changefreq><priority>1.00</priority></url>
  <url><loc>https://nthumods.com/zh/timetable</loc><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <url><loc>https://nthumods.com/zh/bus</loc><changefreq>daily</changefreq><priority>0.80</priority></url>
</urlset>`;

function fallbackSitemap(): Response {
  return new Response(FALLBACK_STATIC_SITEMAP, {
    headers: { "Content-Type": "application/xml" },
  });
}

function buildSitemapXML(courses: any[]): string {
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { path: "/zh/", priority: "1.00", changefreq: "weekly" },
    { path: "/en/", priority: "1.00", changefreq: "weekly" },
    { path: "/zh/courses", priority: "1.00", changefreq: "daily" },
    { path: "/en/courses", priority: "1.00", changefreq: "daily" },
    { path: "/zh/timetable", priority: "0.90", changefreq: "weekly" },
    { path: "/en/timetable", priority: "0.90", changefreq: "weekly" },
    { path: "/zh/today", priority: "0.85", changefreq: "daily" },
    { path: "/en/today", priority: "0.85", changefreq: "daily" },
    { path: "/zh/bus", priority: "0.80", changefreq: "daily" },
    { path: "/en/bus", priority: "0.80", changefreq: "daily" },
    { path: "/zh/venues", priority: "0.70", changefreq: "weekly" },
    { path: "/en/venues", priority: "0.70", changefreq: "weekly" },
    { path: "/zh/team", priority: "0.50", changefreq: "monthly" },
    { path: "/en/team", priority: "0.50", changefreq: "monthly" },
    { path: "/zh/contribute", priority: "0.50", changefreq: "monthly" },
    { path: "/en/contribute", priority: "0.50", changefreq: "monthly" },
  ];

  const staticUrls = staticPages
    .map(
      (p) =>
        `  <url><loc>https://nthumods.com${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
    )
    .join("\n");

  const courseUrls = courses
    .map((course) => {
      const courseId = encodeURIComponent(course.raw_id);
      return `  <url>
    <loc>https://nthumods.com/zh/courses/${courseId}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="https://nthumods.com/zh/courses/${courseId}"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://nthumods.com/en/courses/${courseId}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://nthumods.com/zh/courses/${courseId}"/>
  </url>`;
    })
    .join("\n");

  const majorDepts = [
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

  const deptUrls = majorDepts
    .map(
      (dept) =>
        `  <url><loc>https://nthumods.com/zh/courses?department=${encodeURIComponent(dept)}</loc><changefreq>weekly</changefreq><priority>0.70</priority></url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls}
${courseUrls}
${deptUrls}
</urlset>`;
}

async function generateSitemap(env: Env): Promise<Response> {
  try {
    const cache = caches.default;
    const cacheKey = new Request("https://nthumods.com/__sitemap_cache__");
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const coursesRes = await fetch(
      "https://api.nthumods.com/courses?limit=10000",
      { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit,
    );
    if (!coursesRes.ok) return fallbackSitemap();

    const allCourses = (await coursesRes.json()) as any[];
    if (!Array.isArray(allCourses)) return fallbackSitemap();

    // Get last 2 semesters
    const semesters = [...new Set(allCourses.map((c) => c.semester as string))]
      .sort()
      .reverse()
      .slice(0, 2);
    const courses = allCourses.filter((c) => semesters.includes(c.semester));

    const xml = buildSitemapXML(courses);
    const response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400",
      },
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return fallbackSitemap();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(env);
    }

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

    const busMatch = url.pathname.match(/^\/(zh|en)\/bus\/(.+)$/);
    if (busMatch) {
      return handleBusPage(busMatch[1], busMatch[2], env, url.origin);
    }

    return env.ASSETS.fetch(request);
  },
};
