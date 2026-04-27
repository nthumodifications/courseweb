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
    return fallback();
  }
}

async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  const dept = url.searchParams.get("department") ?? "";
  const lang = url.pathname.includes("/zh/") ? "zh" : "en";
  const fallback = () =>
    env.ASSETS.fetch(new Request(`${url.origin}/index.html`));

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

interface PageMeta {
  title: string;
  description: string;
}

// Per-page metadata injected into the HTML shell for bot requests.
// Keyed by path suffix (without lang prefix) so it works for both /zh and /en.
const STATIC_PAGE_METADATA: Record<string, { zh: PageMeta; en: PageMeta }> = {
  "/courses": {
    zh: {
      title: "清大課程查詢 | NTHUMods",
      description:
        "搜尋清大所有課程，查看課程大綱、評分記錄與學生心得。支援跨系選修、先修課程查詢，快速找到最適合的清華大學課程。",
    },
    en: {
      title: "NTHU Course Search | NTHUMods",
      description:
        "Search all NTHU courses, view syllabi, grading policies, past scores, prerequisites, and student reviews at National Tsing Hua University.",
    },
  },
  "/timetable": {
    zh: {
      title: "清大個人課表規劃 | NTHUMods",
      description:
        "建立並管理您的清大個人課表。輕鬆規劃每週行程、避免衝堂，讓清華大學選課更有效率。",
    },
    en: {
      title: "NTHU Timetable Planner | NTHUMods",
      description:
        "Build and manage your NTHU course timetable. Easily plan your weekly schedule and avoid course conflicts at National Tsing Hua University.",
    },
  },
  "/today": {
    zh: {
      title: "清大學期行事曆 | NTHUMods",
      description:
        "清大學期行事曆與今日行程。掌握國立清華大學重要日程、校園活動與學期節點，不錯過任何重要時刻。",
    },
    en: {
      title: "NTHU Academic Calendar | NTHUMods",
      description:
        "NTHU academic calendar and today's schedule. Stay on top of important dates, events, and deadlines at National Tsing Hua University.",
    },
  },
  "/calendar": {
    zh: {
      title: "清大學期日曆 | NTHUMods",
      description:
        "清大學期日曆，包含重要日期、假期與截止時限。完整呈現國立清華大學學期行事曆，方便統籌個人規劃。",
    },
    en: {
      title: "NTHU Academic Calendar | NTHUMods",
      description:
        "NTHU academic calendar with semester dates, holidays, and important deadlines at National Tsing Hua University.",
    },
  },
  "/bus": {
    zh: {
      title: "清大校車時刻表 | NTHUMods",
      description:
        "清大校車時刻表與路線查詢。掌握國立清華大學各路線校車班次，輕鬆規劃校園內外通勤行程。",
    },
    en: {
      title: "NTHU Campus Bus Schedule | NTHUMods",
      description:
        "NTHU campus shuttle bus schedules and routes. Check real-time bus information and plan your commute at National Tsing Hua University.",
    },
  },
  "/venues": {
    zh: {
      title: "清大校園場館地圖 | NTHUMods",
      description:
        "查詢清大校園教室、建築與設施位置。互動式地圖帶您快速找到國立清華大學各地點，掌握上課地點不迷路。",
    },
    en: {
      title: "NTHU Campus Venues & Map | NTHUMods",
      description:
        "Find classrooms, buildings, and facilities on the NTHU campus. Interactive map and location details for National Tsing Hua University.",
    },
  },
  "/sports-venues": {
    zh: {
      title: "清大體育場館時間表 | NTHUMods",
      description:
        "查詢清大體育場館使用時間表與空閒狀況。球場、游泳池、健身房，掌握國立清華大學各運動設施最新資訊。",
    },
    en: {
      title: "NTHU Sports Facilities | NTHUMods",
      description:
        "Check availability and schedules for NTHU sports facilities. Find courts, pools, and gyms at National Tsing Hua University.",
    },
  },
  "/chat": {
    zh: {
      title: "清大 AI 課程助手 | NTHUMods",
      description:
        "清大 AI 課程助手，即時解答清華大學課程相關問題。選課建議、課程比較、學期規劃，一問即答。",
    },
    en: {
      title: "NTHU AI Course Assistant | NTHUMods",
      description:
        "Ask the NTHU AI course assistant anything about courses, schedules, and academic planning at National Tsing Hua University.",
    },
  },
  "/shops": {
    zh: {
      title: "清大校園餐廳 | NTHUMods",
      description:
        "清大校園餐廳、咖啡廳與店家資訊。查詢國立清華大學校園內各餐飲店家的營業時間與位置。",
    },
    en: {
      title: "NTHU Campus Shops & Restaurants | NTHUMods",
      description:
        "Discover restaurants, cafés, and shops on the NTHU campus. Find dining options and store hours at National Tsing Hua University.",
    },
  },
  "/apps": {
    zh: {
      title: "NTHUMods 功能總覽 | NTHUMods",
      description:
        "探索 NTHUMods 為清大學生提供的所有功能，包含課程查詢、校車時刻、行事曆、場館地圖等一站式服務。",
    },
    en: {
      title: "NTHUMods Features | NTHUMods",
      description:
        "Explore all NTHUMods features for NTHU students — courses, bus schedules, calendar, venues, and more in one platform.",
    },
  },
  "/team": {
    zh: {
      title: "NTHUMods 開發團隊 | NTHUMods",
      description:
        "認識 NTHUMods 背後的清大學生開發團隊，了解這個由清華大學學生自主打造的開源平臺。",
    },
    en: {
      title: "NTHUMods Team | NTHUMods",
      description:
        "Meet the NTHU students behind NTHUMods – the open-source course platform for National Tsing Hua University.",
    },
  },
  "/contribute": {
    zh: {
      title: "參與 NTHUMods 貢獻 | NTHUMods",
      description:
        "參與 NTHUMods 開源貢獻。清大學生自主開發、歡迎所有人一起讓清大資訊平臺更好。",
    },
    en: {
      title: "Contribute to NTHUMods | NTHUMods",
      description:
        "Contribute to NTHUMods – the open-source platform built by NTHU students for NTHU students.",
    },
  },
};

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

// Sets canonical, hreflang, title, and description for all other bot page requests.
async function handleGenericBotPage(url: URL, env: Env): Promise<Response> {
  const pathname = url.pathname;
  const lang = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "zh";

  // Canonical = current path with no query params
  const canonicalUrl = `https://nthumods.com${pathname}`;
  const zhPath = pathname.replace(/^\/(zh|en)(\/|$)/, "/zh$2");
  const enPath = pathname.replace(/^\/(zh|en)(\/|$)/, "/en$2");
  const zhUrl = `https://nthumods.com${zhPath}`;
  const enUrl = `https://nthumods.com${enPath}`;

  // Look up page-specific metadata by stripping the lang prefix
  const pagePath = pathname.replace(/^\/(zh|en)/, "") || "/";
  const meta = STATIC_PAGE_METADATA[pagePath]?.[lang];

  const shellRes = await env.ASSETS.fetch(
    new Request(`${url.origin}/index.html`),
  );

  let rewriter = new HTMLRewriter().on('link[rel="canonical"]', {
    element(el) {
      el.setAttribute("href", canonicalUrl);
    },
  });

  rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhUrl);

  if (meta) {
    rewriter = rewriter
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
          el.setAttribute("content", meta.title);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute("content", meta.description);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", canonicalUrl);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute("content", meta.title);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(el) {
          el.setAttribute("content", meta.description);
        },
      });
  }

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
        decodeURIComponent(courseMatch[2]),
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

    // All other bot requests to lang-prefixed pages: inject correct canonical,
    // hreflang, title, and description so Google doesn't index generic index.html metadata.
    const langPageMatch = url.pathname.match(/^\/(zh|en)(\/|$)/);
    if (langPageMatch) {
      return handleGenericBotPage(url, env);
    }

    return env.ASSETS.fetch(request);
  },
};
