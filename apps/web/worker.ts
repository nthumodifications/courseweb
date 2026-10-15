/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

declare global {
  interface CacheStorage {
    readonly default: Cache;
  }
}

const STATIC_ASSET_EXTENSION_PATTERN =
  /\.(?:js|mjs|css|map|json|woff2|woff|ttf|png|jpg|svg|webp|ico|webmanifest)$/i;
const NO_CACHE = "no-cache, must-revalidate";
const IMMUTABLE_ASSET_CACHE = "public, max-age=31536000, immutable";

function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    STATIC_ASSET_EXTENSION_PATTERN.test(pathname)
  );
}

function withCacheControl(response: Response, value: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cacheControlForStaticPath(pathname: string): string | undefined {
  if (
    pathname === "/sw.js" ||
    pathname === "/registerSW.js" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NO_CACHE;
  }
  if (pathname.startsWith("/assets/")) return IMMUTABLE_ASSET_CACHE;
  return undefined;
}

function isHtmlResponse(response: Response): boolean {
  return (
    response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() === "text/html"
  );
}

// The assets binding's default html_handling answers /index.html with a 307
// to /. Fetch the shell by its canonical path so neither this worker nor the
// PWA service worker (whose navigation fallback requests /index.html and
// cannot answer a navigation with a redirected response) ever sees that 307.
async function fetchAppShell(
  env: Env,
  origin: string,
  init?: Request,
): Promise<Response> {
  const response = await env.ASSETS.fetch(new Request(`${origin}/`, init));
  return withCacheControl(response, NO_CACHE);
}

function missingAssetResponse(): Response {
  return new Response("Asset not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}

async function fetchStaticAsset(request: Request, env: Env): Promise<Response> {
  try {
    const response = await env.ASSETS.fetch(request);

    // Only a genuine miss, or the SPA fallback serving index.html in place of
    // an asset, should 404 here. Anything below 400 must pass through
    // untouched -- in particular 304, which is what every browser reload of a
    // cached asset receives after revalidating with If-None-Match.
    if (response.status >= 400 || isHtmlResponse(response)) {
      return missingAssetResponse();
    }

    const cacheControl = cacheControlForStaticPath(
      new URL(request.url).pathname,
    );
    return cacheControl ? withCacheControl(response, cacheControl) : response;
  } catch {
    return missingAssetResponse();
  }
}

async function fetchNavigation(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (!isHtmlResponse(response)) return response;

  const url = new URL(request.url);
  const routeMatch = /^(zh-cn|zh|en)(\/|$)/.exec(url.pathname.slice(1));
  if (!routeMatch) return withCacheControl(response, NO_CACHE);

  const lang = routeMatch[1] as WorkerLocale;
  const suffix = stripLocale(url.pathname);
  const canonicalUrl = `https://nthumods.com${url.pathname}`;
  const zhUrl = `https://nthumods.com/zh${suffix === "/" ? "" : suffix}`;
  const enUrl = `https://nthumods.com/en${suffix === "/" ? "" : suffix}`;
  const zhCnUrl = `https://nthumods.com/zh-cn${suffix === "/" ? "" : suffix}`;
  const ogLocale =
    lang === "en" ? "en_US" : lang === "zh-cn" ? "zh_CN" : "zh_TW";

  let rewriter = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", htmlLanguage(lang));
      },
    })
    .on('meta[property="og:locale"]', {
      element(el) {
        el.setAttribute("content", ogLocale);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", canonicalUrl);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", canonicalUrl);
      },
    });

  rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhCnUrl, zhUrl);
  return withCacheControl(await rewriter.transform(response), NO_CACHE);
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

type WorkerLocale = "zh" | "en" | "zh-cn";

function localeFromPath(pathname: string): WorkerLocale {
  if (pathname.startsWith("/en/") || pathname === "/en") return "en";
  if (pathname.startsWith("/zh-cn/") || pathname === "/zh-cn") return "zh-cn";
  return "zh";
}

function htmlLanguage(locale: WorkerLocale): string {
  return locale === "en" ? "en" : locale === "zh-cn" ? "zh-CN" : "zh-TW";
}

function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(?:zh-cn|zh|en)(?=\/|$)/, "") || "/";
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
  zhCnUrl: string;
  ogType: string;
  jsonLd: unknown[];
}

function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildCourseMetaData(course: any, lang: string): CourseMetaData {
  const isEnglish = lang === "en";
  const nameZh =
    typeof course.name_zh === "string" && course.name_zh.trim()
      ? course.name_zh.trim()
      : "NTHU Course";
  const nameEn =
    typeof course.name_en === "string" && course.name_en.trim()
      ? course.name_en.trim()
      : nameZh;
  const department =
    typeof course.department === "string" && course.department.trim()
      ? course.department.trim()
      : "NTHU";
  const semester = toPrettySemester(String(course.semester ?? ""));
  const teachersZh = Array.isArray(course.teacher_zh)
    ? course.teacher_zh
        .filter(
          (teacher: unknown): teacher is string =>
            typeof teacher === "string" && teacher.trim().length > 0,
        )
        .join("、")
    : "";
  const teachersEn = Array.isArray(course.teacher_en)
    ? course.teacher_en
        .filter(
          (teacher: unknown): teacher is string =>
            typeof teacher === "string" && teacher.trim().length > 0,
        )
        .join(", ")
    : "";
  const displayTeachersEn = teachersEn || teachersZh || "NTHU faculty";
  const displayTeachersZh = teachersZh || "清大教師";

  const title = !isEnglish
    ? `${nameZh} ${displayTeachersZh} - ${semester} 清大${department}課程 | NTHUMods`
    : `${nameEn} ${displayTeachersEn} - ${semester} NTHU ${department} | NTHUMods`;

  const description = !isEnglish
    ? `清大 ${semester} ${nameZh}（${nameEn}），${displayTeachersZh} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
    : `NTHU ${semester} ${nameEn} (${nameZh}), taught by ${displayTeachersEn}. View syllabus, past scores, and course history.`;

  const ogTitle = !isEnglish
    ? `${nameZh} - ${department} | NTHUMods`
    : `${nameEn} - ${department} | NTHUMods`;

  const courseId = encodeURIComponent(String(course.raw_id ?? ""));
  const canonicalUrl = `https://nthumods.com/${lang}/courses/${courseId}`;
  const zhUrl = `https://nthumods.com/zh/courses/${courseId}`;
  const enUrl = `https://nthumods.com/en/courses/${courseId}`;
  const zhCnUrl = `https://nthumods.com/zh-cn/courses/${courseId}`;
  const instructors = Array.isArray(course.teacher_zh)
    ? course.teacher_zh
        .filter(
          (teacher: unknown): teacher is string =>
            typeof teacher === "string" && teacher.trim().length > 0,
        )
        .map((name: string) => ({ "@type": "Person", name }))
    : [];
  const jsonLd: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: isEnglish ? nameEn : nameZh,
      alternateName: isEnglish ? nameZh : nameEn,
      description,
      provider: {
        "@type": "Organization",
        name: "NTHUMods",
        url: "https://nthumods.com",
      },
      ...(instructors.length > 0 ? { instructor: instructors } : {}),
      courseCode: department,
      url: canonicalUrl,
      inLanguage: htmlLanguage(lang as WorkerLocale),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: isEnglish ? "Home" : "首頁",
          item: `https://nthumods.com/${lang}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: isEnglish ? "Courses" : "課程",
          item: `https://nthumods.com/${lang}/courses`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: isEnglish ? nameEn : nameZh,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return {
    title,
    description,
    ogTitle,
    ogDescription: description,
    canonicalUrl,
    zhUrl,
    enUrl,
    zhCnUrl,
    ogType: "article",
    jsonLd,
  };
}

function applyHreflang(
  rewriter: HTMLRewriter,
  zhUrl: string,
  enUrl: string,
  zhCnUrl: string,
  xDefaultUrl: string,
): HTMLRewriter {
  return rewriter
    .on('link[rel="alternate"]', {
      element(el) {
        const hreflang = el.getAttribute("hreflang");
        if (!hreflang) return;
        if (hreflang === "zh" || hreflang === "zh-TW") {
          el.setAttribute("hreflang", "zh-TW");
          el.setAttribute("href", zhUrl);
        } else if (hreflang === "zh-CN") {
          el.setAttribute("href", zhCnUrl);
        } else if (hreflang === "en") {
          el.setAttribute("href", enUrl);
        } else if (hreflang === "x-default") {
          el.setAttribute("href", xDefaultUrl);
        }
      },
    })
    .on("head", {
      element(el) {
        el.append(`<link rel="alternate" hreflang="zh-CN" href="${zhCnUrl}">`, {
          html: true,
        });
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
      return handleGenericBotPage(
        new URL(`${origin}/${lang}/courses/${encodeURIComponent(courseId)}`),
        env,
      );
    }

    const course = (await apiRes.json()) as any;

    if (!course?.name_zh) {
      return handleGenericBotPage(
        new URL(`${origin}/${lang}/courses/${encodeURIComponent(courseId)}`),
        env,
      );
    }

    const meta = buildCourseMetaData(course, lang);
    const shellRes = await fetchAppShell(env, origin);

    let rewriter = new HTMLRewriter()
      .on("html", {
        element(el) {
          el.setAttribute("lang", htmlLanguage(lang as WorkerLocale));
        },
      })
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

    rewriter = applyHreflang(
      rewriter,
      meta.zhUrl,
      meta.enUrl,
      meta.zhCnUrl,
      meta.zhUrl,
    );
    rewriter = rewriter.on("head", {
      element(el) {
        el.append(
          `<script type="application/ld+json">${escapeJsonLd([
            ...meta.jsonLd,
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: meta.title,
              description: meta.description,
              url: meta.canonicalUrl,
              inLanguage: htmlLanguage(lang as WorkerLocale),
            },
          ])}</script>`,
          { html: true },
        );
      },
    });
    return rewriter.transform(shellRes);
  } catch {
    return handleGenericBotPage(
      new URL(`${origin}/${lang}/courses/${encodeURIComponent(courseId)}`),
      env,
    );
  }
}

async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  const dept = url.searchParams.get("department") ?? "";
  const lang = localeFromPath(url.pathname);
  const isEnglish = lang === "en";
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

    const title = !isEnglish
      ? `清華大學${dept}課程列表 - ${count}門課程 | NTHUMods`
      : `NTHU ${dept} Courses - ${count} courses | NTHUMods`;

    const description = !isEnglish
      ? `${first3.map((c) => c.name_zh).join("、")}...等 ${count} 門課程。`
      : `${first3.map((c) => c.name_en ?? c.name_zh).join(", ")}... and ${count} more courses.`;

    const canonicalUrl = `https://nthumods.com/${lang}/courses?department=${encodeURIComponent(dept)}`;
    const zhUrl = `https://nthumods.com/zh/courses?department=${encodeURIComponent(dept)}`;
    const enUrl = `https://nthumods.com/en/courses?department=${encodeURIComponent(dept)}`;
    const zhCnUrl = `https://nthumods.com/zh-cn/courses?department=${encodeURIComponent(dept)}`;

    const shellRes = await fetchAppShell(env, url.origin);

    let rewriter = new HTMLRewriter()
      .on("html", {
        element(el) {
          el.setAttribute("lang", htmlLanguage(lang));
        },
      })
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
    rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhCnUrl, zhUrl);
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
  const fallback = () => fetchAppShell(env, origin);

  try {
    const routeNames: Record<string, { zh: string; en: string }> = {
      main: { zh: "校園公車", en: "Main Campus Bus" },
      nanda: { zh: "南大校區區間車", en: "Nanda Campus Shuttle" },
    };

    const mainRoute = route.split("/")[0];
    const routeName = routeNames[mainRoute] ?? { zh: "校車", en: "Campus Bus" };

    const title =
      lang !== "en"
        ? `清華大學校車 ${routeName.zh} - 即時時刻表與路線資訊 | NTHUMods`
        : `NTHU ${routeName.en} - Real-time Schedule | NTHUMods`;

    const description =
      lang !== "en"
        ? `查看清華大學校車${routeName.zh}即時時刻表、路線圖與站點資訊。`
        : `View NTHU ${routeName.en} real-time schedule, route map, and stop information.`;

    const canonicalUrl = `https://nthumods.com/${lang}/bus/${route}`;
    const zhUrl = `https://nthumods.com/zh/bus/${route}`;
    const enUrl = `https://nthumods.com/en/bus/${route}`;
    const zhCnUrl = `https://nthumods.com/zh-cn/bus/${route}`;

    const shellRes = await fetchAppShell(env, origin);

    let rewriter = new HTMLRewriter()
      .on("html", {
        element(el) {
          el.setAttribute("lang", htmlLanguage(lang as WorkerLocale));
        },
      })
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
    rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhCnUrl, zhUrl);
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
  "/courses/modules": {
    zh: {
      title: "搜尋清大課程模組 | NTHUMods",
      description: "跨學期搜尋清大課程的開課紀錄與課名變化。",
    },
    en: {
      title: "Search NTHU Course Modules | NTHUMods",
      description:
        "Search one NTHU course across its recorded semesters and title variants.",
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
  "/library": {
    zh: {
      title: "清大圖書館即時座位與空間空位 | NTHUMods",
      description:
        "即時查詢清大總圖書館、夜讀區、人社分館與科管院之座位、討論室與資訊島空位狀態。",
    },
    en: {
      title: "NTHU Library Space & Seat Vacancy Tracker | NTHUMods",
      description:
        "Check real-time seat counts, study carrels, discussion rooms, and PC workstations across NTHU libraries.",
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

// Sets canonical, hreflang, title, and description for all other bot page requests.
async function handleGenericBotPage(url: URL, env: Env): Promise<Response> {
  const pathname = url.pathname;
  const lang = localeFromPath(pathname);

  const canonicalUrl = `https://nthumods.com${pathname}`;
  const suffix = stripLocale(pathname);
  const zhPath = `/zh${suffix === "/" ? "" : suffix}`;
  const enPath = `/en${suffix === "/" ? "" : suffix}`;
  const zhCnPath = `/zh-cn${suffix === "/" ? "" : suffix}`;
  const zhUrl = `https://nthumods.com${zhPath}`;
  const enUrl = `https://nthumods.com${enPath}`;
  const zhCnUrl = `https://nthumods.com${zhCnPath}`;

  const pagePath = suffix;
  const meta = STATIC_PAGE_METADATA[pagePath]?.[lang === "en" ? "en" : "zh"];

  const shellRes = await fetchAppShell(env, url.origin);

  let rewriter = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", htmlLanguage(lang));
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", canonicalUrl);
      },
    });

  rewriter = applyHreflang(rewriter, zhUrl, enUrl, zhCnUrl, zhUrl);

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

function fallbackSitemap(): Response {
  return new Response(buildSitemapXML([]), {
    headers: { "Content-Type": "application/xml" },
  });
}

function sitemapAlternates(
  zhUrl: string,
  enUrl: string,
  zhCnUrl?: string,
): string {
  return [
    `    <xhtml:link rel="alternate" hreflang="zh-TW" href="${zhUrl}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`,
    ...(zhCnUrl
      ? [`    <xhtml:link rel="alternate" hreflang="zh-CN" href="${zhCnUrl}"/>`]
      : []),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${zhUrl}"/>`,
  ].join("\n");
}

function buildSitemapXML(courses: any[]): string {
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { path: "/zh/", priority: "1.00", changefreq: "weekly" },
    { path: "/en/", priority: "1.00", changefreq: "weekly" },
    { path: "/zh/courses", priority: "1.00", changefreq: "daily" },
    { path: "/en/courses", priority: "1.00", changefreq: "daily" },
    { path: "/zh/courses/modules", priority: "0.90", changefreq: "daily" },
    { path: "/en/courses/modules", priority: "0.90", changefreq: "daily" },
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
    { path: "/zh/laundry", priority: "0.75", changefreq: "daily" },
    { path: "/en/laundry", priority: "0.75", changefreq: "daily" },
    { path: "/zh/library", priority: "0.75", changefreq: "daily" },
    { path: "/en/library", priority: "0.75", changefreq: "daily" },
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

  const localizedStaticPages = [
    ...staticPages,
    ...staticPages
      .filter((page) => page.path.startsWith("/zh"))
      .map((page) => ({
        ...page,
        path: page.path.replace(/^\/zh(?=\/|$)/, "/zh-cn"),
      })),
  ];

  const nonInstructorNames = new Set([
    "EMS境外專班",
    "清華學院學士班",
    "SNHCC Prog",
    "服科所全體教師",
  ]);
  const instructorNames = [
    ...new Set(
      courses.flatMap((course) =>
        Array.isArray(course.teacher_zh) ? course.teacher_zh : [],
      ),
    ),
  ].filter(
    (name) =>
      typeof name === "string" &&
      name.trim().length > 0 &&
      !nonInstructorNames.has(name.trim()),
  );
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
  const estimatedNonCourseUrls =
    localizedStaticPages.length +
    instructorNames.length * 3 +
    majorDepts.length * 3;
  const includeZhCnCourseUrls =
    estimatedNonCourseUrls + courses.length * 3 <= 50_000;

  const staticUrls = localizedStaticPages
    .map((p) => {
      const zhPath = p.path
        .replace(/^\/(zh-cn|zh|en)\//, "/zh/")
        .replace(/^\/(zh-cn|zh|en)$/, "/zh");
      const enPath = p.path
        .replace(/^\/(zh-cn|zh|en)\//, "/en/")
        .replace(/^\/(zh-cn|zh|en)$/, "/en");
      const zhCnPath = p.path
        .replace(/^\/(zh-cn|zh|en)\//, "/zh-cn/")
        .replace(/^\/(zh-cn|zh|en)$/, "/zh-cn");
      const zhUrl = `https://nthumods.com${zhPath}`;
      const enUrl = `https://nthumods.com${enPath}`;
      const zhCnUrl = `https://nthumods.com${zhCnPath}`;
      const loc = `https://nthumods.com${p.path}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
${sitemapAlternates(zhUrl, enUrl, zhCnUrl)}
  </url>`;
    })
    .join("\n");

  // Each course gets BOTH zh and en URL entries so Google indexes both language versions
  const courseUrls = courses
    .flatMap((course) => {
      const courseId = encodeURIComponent(course.raw_id);
      const zhUrl = `https://nthumods.com/zh/courses/${courseId}`;
      const enUrl = `https://nthumods.com/en/courses/${courseId}`;
      const zhCnUrl = `https://nthumods.com/zh-cn/courses/${courseId}`;
      const urls = [
        `  <url>
    <loc>${zhUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
${sitemapAlternates(zhUrl, enUrl, includeZhCnCourseUrls ? zhCnUrl : undefined)}
  </url>`,
        `  <url>
    <loc>${enUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
${sitemapAlternates(zhUrl, enUrl, includeZhCnCourseUrls ? zhCnUrl : undefined)}
  </url>`,
      ];
      if (includeZhCnCourseUrls) {
        urls.push(`  <url>
    <loc>${zhCnUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
${sitemapAlternates(zhUrl, enUrl, zhCnUrl)}
  </url>`);
      }
      return urls;
    })
    .join("\n");

  const instructorUrls = instructorNames
    .flatMap((name) => {
      const routeName = encodeURIComponent(encodeURIComponent(name));
      const zhUrl = `https://nthumods.com/zh/courses/instructor/${routeName}`;
      const enUrl = `https://nthumods.com/en/courses/instructor/${routeName}`;
      return [
        `  <url>
    <loc>${zhUrl}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses/instructor/${routeName}`)}
  </url>`,
        `  <url>
    <loc>${enUrl}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.55</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses/instructor/${routeName}`)}
  </url>`,
        `  <url>
    <loc>https://nthumods.com/zh-cn/courses/instructor/${routeName}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.55</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses/instructor/${routeName}`)}
  </url>`,
      ];
    })
    .join("\n");

  const deptUrls = majorDepts
    .flatMap((dept) => {
      const zhUrl = `https://nthumods.com/zh/courses?department=${encodeURIComponent(dept)}`;
      const enUrl = `https://nthumods.com/en/courses?department=${encodeURIComponent(dept)}`;
      return [
        `  <url>
    <loc>${zhUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.65</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses?department=${encodeURIComponent(dept)}`)}
  </url>`,
        `  <url>
    <loc>${enUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.60</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses?department=${encodeURIComponent(dept)}`)}
  </url>`,
        `  <url>
    <loc>https://nthumods.com/zh-cn/courses?department=${encodeURIComponent(dept)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.60</priority>
${sitemapAlternates(zhUrl, enUrl, `https://nthumods.com/zh-cn/courses?department=${encodeURIComponent(dept)}`)}
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
${instructorUrls}
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
          `courses?select=raw_id,semester,teacher_zh&semester=eq.${sem}&limit=${pageSize}&offset=${offset}`,
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

    if (url.pathname === "/index.html") {
      return fetchAppShell(env, url.origin, request);
    }

    if (isStaticAssetPath(url.pathname)) {
      return fetchStaticAsset(request, env);
    }

    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(env);
    }

    const userAgent = request.headers.get("User-Agent") ?? "";

    if (!isBot(userAgent)) {
      return fetchNavigation(request, env);
    }

    // Course detail page
    const courseMatch =
      /^\/(zh|zh-cn|en)\/courses\/(?!modules(?:\/|$)|module(?:\/|$)|instructor(?:\/|$))(.+)$/.exec(
        url.pathname,
      );
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
      /^\/(zh|zh-cn|en)\/courses$/.exec(url.pathname) &&
      url.searchParams.has("department");
    if (deptMatch) {
      return handleDepartmentPage(url, env);
    }

    // Bus route/line pages
    const busMatch = /^\/(zh|zh-cn|en)\/bus\/(.+)$/.exec(url.pathname);
    if (busMatch) {
      return handleBusPage(busMatch[1], busMatch[2], env, url.origin);
    }

    // All other bot requests to lang-prefixed pages: inject correct canonical,
    // hreflang, title, and description so Google doesn't index generic index.html metadata.
    const langPageMatch = /^\/(zh|zh-cn|en)(\/|$)/.exec(url.pathname);
    if (langPageMatch) {
      return handleGenericBotPage(url, env);
    }

    return fetchNavigation(request, env);
  },
};
