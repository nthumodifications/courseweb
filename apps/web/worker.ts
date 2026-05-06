/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

const SUPABASE_URL = "https://cmzdlrqfpuktcczvsobs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtemRscnFmcHVrdGNjenZzb2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkzNDAzNDMsImV4cCI6MjAxNDkxNjM0M30.SJwTEP3fUQ8emcwIZS8sRMC4eStYFrkk2rninsv8CqY";

async function supabaseFetch(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
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
  zhUrl: string;
  enUrl: string;
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

  const courseId = encodeURIComponent(course.raw_id);
  const canonicalUrl = `https://nthumods.com/${lang}/courses/${courseId}`;
  const zhUrl = `https://nthumods.com/zh/courses/${courseId}`;
  const enUrl = `https://nthumods.com/en/courses/${courseId}`;

  return {
    title,
    description,
    ogTitle,
    ogDescription: description,
    canonicalUrl,
    zhUrl,
    enUrl,
    ogType: "article",
  };
}

function applyHreflang(
  rewriter: HTMLRewriter,
  zhUrl: string,
  enUrl: string,
  xDefaultUrl: string,
): HTMLRewriter {
  return rewriter.on('link[rel="alternate"]', {
    element(el) {
      const hreflang = el.getAttribute("hreflang");
      if (!hreflang) return;
      if (hreflang === "zh" || hreflang === "zh-TW") {
        el.setAttribute("hreflang", "zh-TW");
        el.setAttribute("href", zhUrl);
      } else if (hreflang === "en") {
        el.setAttribute("href", enUrl);
      } else if (hreflang === "x-default") {
        el.setAttribute("href", xDefaultUrl);
      }
    },
  });
}

async function handleCourseDetailPage(
  lang: string,
  courseId: string,
  env: Env,
  origin: string,
): Promise<Response> {
  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
      { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit,
    );

    if (!apiRes.ok || apiRes.status === 404) {
      return handleMissingCourse(lang, env, origin);
    }

    const course = (await apiRes.json()) as any;

    if (!course?.name_zh) {
      return handleMissingCourse(lang, env, origin);
    }

    const meta = buildCourseMetaData(course, lang);
    const shellRes = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`),
    );

    let rewriter = new HTMLRewriter()
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
      });

    rewriter = applyHreflang(rewriter, meta.zhUrl, meta.enUrl, meta.zhUrl);

    return rewriter.transform(shellRes);
  } catch {
    return handleMissingCourse(lang, env, origin);
  }
}

async function handleMissingCourse(
  lang: string,
  env: Env,
  origin: string,
): Promise<Response> {
  const shellRes = await env.ASSETS.fetch(new Request(`${origin}/index.html`));
  const coursesUrl = `https://nthumods.com/${lang}/courses`;

  const notFoundShell = new Response(shellRes.body, {
    status: 404,
    statusText: "Not Found",
    headers: new Headers({
      ...Object.fromEntries(shellRes.headers),
      "X-Robots-Tag": "noindex, follow",
    }),
  });

  return new HTMLRewriter()
    .on('meta[name="robots"]', {
      element(el) {
        el.setAttribute("content", "noindex, follow");
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", coursesUrl);
      },
    })
    .transform(notFoundShell);
}

async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  const dept = url.searchParams.get("department") ?? "";
  const lang = url.pathname.includes("/zh/") ? "zh" : "en";
  const fallback = () => handleGenericBotPage(url, env);

  try {
    const apiRes = await supabaseFetch(
      `courses?select=raw_id,name_zh,name_en&department=eq.${encodeURIComponent(dept)}&limit=500&order=semester.desc`,
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
    const zhUrl = `https://nthumods.com/zh/courses?department=${encodeURIComponent(dept)}`;
    const enUrl = `https://nthumods.com/en/courses?department=${encodeURIComponent(dept)}`;

    const shellRes = await env.ASSETS.fetch(
      new Request(`${url.origin}/index.html`),
    );

    let rewriter = new HTMLRewriter()
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
      });

    rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhUrl);

    return rewriter.transform(shellRes);
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
    const zhUrl = `https://nthumods.com/zh/bus/${route}`;
    const enUrl = `https://nthumods.com/en/bus/${route}`;

    const shellRes = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`),
    );

    let rewriter = new HTMLRewriter()
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
      });

    rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhUrl);

    return rewriter.transform(shellRes);
  } catch {
    return fallback();
  }
}

// Generic handler for all other bot page requests: sets canonical and hreflang
// based on the current URL (strips query params from canonical for non-dept pages)
async function handleGenericBotPage(url: URL, env: Env): Promise<Response> {
  const pathname = url.pathname;
  // Canonical strips query params unless it's a department filter
  const canonicalUrl = `https://nthumods.com${pathname}`;

  const zhPath = pathname.replace(/^\/(zh|en)\//, "/zh/");
  const enPath = pathname.replace(/^\/(zh|en)\//, "/en/");
  const zhUrl = `https://nthumods.com${zhPath}`;
  const enUrl = `https://nthumods.com${enPath}`;

  const shellRes = await env.ASSETS.fetch(
    new Request(`${url.origin}/index.html`),
  );

  let rewriter = new HTMLRewriter().on('link[rel="canonical"]', {
    element(el) {
      el.setAttribute("href", canonicalUrl);
    },
  });

  rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhUrl);

  return rewriter.transform(shellRes);
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
    { path: "/zh/calendar", priority: "0.85", changefreq: "weekly" },
    { path: "/en/calendar", priority: "0.85", changefreq: "weekly" },
    { path: "/zh/bus", priority: "0.80", changefreq: "daily" },
    { path: "/en/bus", priority: "0.80", changefreq: "daily" },
    { path: "/zh/bus/main", priority: "0.75", changefreq: "weekly" },
    { path: "/en/bus/main", priority: "0.75", changefreq: "weekly" },
    { path: "/zh/bus/nanda", priority: "0.75", changefreq: "weekly" },
    { path: "/en/bus/nanda", priority: "0.75", changefreq: "weekly" },
    { path: "/zh/venues", priority: "0.70", changefreq: "weekly" },
    { path: "/en/venues", priority: "0.70", changefreq: "weekly" },
    { path: "/zh/sports-venues", priority: "0.70", changefreq: "weekly" },
    { path: "/en/sports-venues", priority: "0.70", changefreq: "weekly" },
    { path: "/zh/chat", priority: "0.65", changefreq: "monthly" },
    { path: "/en/chat", priority: "0.65", changefreq: "monthly" },
    { path: "/zh/shops", priority: "0.65", changefreq: "weekly" },
    { path: "/en/shops", priority: "0.65", changefreq: "weekly" },
    { path: "/zh/apps", priority: "0.65", changefreq: "monthly" },
    { path: "/en/apps", priority: "0.65", changefreq: "monthly" },
    { path: "/zh/team", priority: "0.50", changefreq: "monthly" },
    { path: "/en/team", priority: "0.50", changefreq: "monthly" },
    { path: "/zh/contribute", priority: "0.50", changefreq: "monthly" },
    { path: "/en/contribute", priority: "0.50", changefreq: "monthly" },
    { path: "/zh/privacy-policy", priority: "0.40", changefreq: "yearly" },
    { path: "/en/privacy-policy", priority: "0.40", changefreq: "yearly" },
  ];

  const staticUrls = staticPages
    .map((p) => {
      const zhPath = p.path
        .replace(/^\/(zh|en)\//, "/zh/")
        .replace(/^\/(zh|en)$/, "/zh");
      const enPath = p.path
        .replace(/^\/(zh|en)\//, "/en/")
        .replace(/^\/(zh|en)$/, "/en");
      const zhUrl = `https://nthumods.com${zhPath}`;
      const enUrl = `https://nthumods.com${enPath}`;
      const loc = `https://nthumods.com${p.path}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>
  </url>`;
    })
    .join("\n");

  // Each course gets BOTH zh and en URL entries so Google indexes both language versions
  const courseUrls = courses
    .flatMap((course) => {
      const courseId = encodeURIComponent(course.raw_id);
      const zhUrl = `https://nthumods.com/zh/courses/${courseId}`;
      const enUrl = `https://nthumods.com/en/courses/${courseId}`;
      return [
        `  <url>
    <loc>${zhUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>
  </url>`,
        `  <url>
    <loc>${enUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>
  </url>`,
      ];
    })
    .join("\n");

  const majorDepts = [
    "EE",
    "CS",
    "PM",
    "CHE",
    "MSE",
    "MATH",
    "PHYS",
    "CHEM",
    "LS",
    "ECON",
  ];

  const deptUrls = majorDepts
    .flatMap((dept) => {
      const zhUrl = `https://nthumods.com/zh/courses?department=${encodeURIComponent(dept)}`;
      const enUrl = `https://nthumods.com/en/courses?department=${encodeURIComponent(dept)}`;
      return [
        `  <url>
    <loc>${zhUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.65</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>
  </url>`,
        `  <url>
    <loc>${enUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.60</priority>
    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>
  </url>`,
      ];
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
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

    // Get latest semester first
    const latestRes = await supabaseFetch(
      "courses?select=semester&limit=1&order=semester.desc",
    );
    if (!latestRes.ok) return fallbackSitemap();
    const latestRows = (await latestRes.json()) as any[];
    if (!Array.isArray(latestRows) || latestRows.length === 0)
      return fallbackSitemap();

    const latestSem = latestRows[0].semester as string;
    const year = latestSem.slice(0, 3);
    const term = latestSem[3];
    const prevSem =
      term === "2" ? `${year}10` : `${String(Number(year) - 1)}20`;

    // Fetch up to 10000 courses from last 2 semesters via pagination
    const allCourses: any[] = [];
    for (const sem of [latestSem, prevSem]) {
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const res = await supabaseFetch(
          `courses?select=raw_id,semester&semester=eq.${sem}&limit=${pageSize}&offset=${offset}`,
        );
        if (!res.ok) break;
        const rows = (await res.json()) as any[];
        if (!Array.isArray(rows) || rows.length === 0) break;
        allCourses.push(...rows);
        if (rows.length < pageSize) break;
        offset += pageSize;
        if (allCourses.length >= 10000) break;
      }
    }
    const courses = allCourses;

    const xml = buildSitemapXML(courses);
    const response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
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

    // Course detail page
    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);
    if (courseMatch) {
      return handleCourseDetailPage(
        courseMatch[1],
        decodeURIComponent(courseMatch[2]),
        env,
        url.origin,
      );
    }

    // Department-filtered course list
    const deptMatch =
      url.pathname.match(/^\/(zh|en)\/courses$/) &&
      url.searchParams.has("department");
    if (deptMatch) {
      return handleDepartmentPage(url, env);
    }

    // Bus route/line pages
    const busMatch = url.pathname.match(/^\/(zh|en)\/bus\/(.+)$/);
    if (busMatch) {
      return handleBusPage(busMatch[1], busMatch[2], env, url.origin);
    }

    // All other bot requests to lang-prefixed pages: fix canonical and hreflang
    const langPageMatch = url.pathname.match(/^\/(zh|en)(\/|$)/);
    if (langPageMatch) {
      return handleGenericBotPage(url, env);
    }

    return env.ASSETS.fetch(request);
  },
};
