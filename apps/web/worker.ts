/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker entry point for NTHUMods.
 *
 * Goals:
 * 1) Always serve the SPA shell for HTML navigations (no edge 404 on first load).
 * 2) Only apply bot-specific SEO meta injection on course detail pages.
 * 3) Keep asset/API/non-HTML requests untouched.
 */

interface Env {
  ASSETS: Fetcher;
}

// Covers major search/social/SEO crawlers.
const BOT_UA_FRAGMENTS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "petalbot",
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
  "rogerbot",
  "showyoubot",
  "w3c_validator",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((f) => ua.includes(f));
}

// Mirrors apps/web/src/helpers/semester.ts — semester like "11210" -> "112-1"
function toPrettySemester(semester: string): string {
  if (!semester || semester.length < 4) return semester || "";
  const year = semester.slice(0, 3);
  const term = Number.parseInt(semester.slice(3, 4), 10);
  return Number.isFinite(term) ? `${year}-${term}` : semester;
}

interface CourseData {
  name_zh?: string;
  name_en?: string;
  teacher_zh?: string[];
  teacher_en?: string[];
  semester?: string;
  department?: string;
}

function wantsHtml(request: Request): boolean {
  // Browser navigations usually send text/html in Accept.
  const accept = request.headers.get("Accept")?.toLowerCase() ?? "";
  return accept.includes("text/html");
}

function isLikelyAssetPath(pathname: string): boolean {
  // Has a file extension (e.g. .js/.css/.png/.ico/.xml/.txt/.map ...).
  return /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

function shouldServeSpaShell(request: Request, url: URL): boolean {
  // SPA fallback should only apply to navigational HTML GET/HEAD requests.
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (!wantsHtml(request)) return false;
  if (isLikelyAssetPath(url.pathname)) return false;
  return true;
}

function matchCourseDetail(
  pathname: string,
): { lang: "zh" | "en"; courseId: string } | null {
  // Exactly: /:lang/courses/:courseId (with optional trailing slash), not deeper paths.
  const m = pathname.match(/^\/(zh|en)\/courses\/([^/]+)\/?$/);
  if (!m) return null;
  return {
    lang: m[1] as "zh" | "en",
    courseId: m[2],
  };
}

function buildCanonicalUrl(lang: "zh" | "en", rawCourseId: string): string {
  // Keep canonical stable and safely encoded path segment.
  return `https://nthumods.com/${lang}/courses/${encodeURIComponent(rawCourseId)}`;
}

async function getSpaShell(env: Env, origin: string): Promise<Response> {
  // Force the SPA shell regardless of incoming path.
  return env.ASSETS.fetch(
    new Request(`${origin}/index.html`, { method: "GET" }),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1) Non-HTML or asset-like requests: pass through unchanged.
    //    This preserves proper status codes for real static misses, APIs, etc.
    if (!shouldServeSpaShell(request, url)) {
      return env.ASSETS.fetch(request);
    }

    // 2) For ALL HTML navigations, return SPA shell (never edge 404).
    //    This ensures /zh/courses, /en/courses, /zh/invalid, etc. return 200 + index.html.
    const spaRes = await getSpaShell(env, url.origin);

    // 3) Only bots on course detail pages get SEO meta rewrites.
    const userAgent = request.headers.get("User-Agent") ?? "";
    if (!isBot(userAgent)) {
      return spaRes;
    }

    const detail = matchCourseDetail(url.pathname);
    if (!detail) {
      return spaRes;
    }

    const { lang, courseId: encodedCourseId } = detail;

    // Decode safely; malformed sequences should not break routing.
    let courseId = encodedCourseId;
    try {
      courseId = decodeURIComponent(encodedCourseId);
    } catch {
      // Keep raw segment if malformed; still serve SPA shell without SEO rewrite.
      return spaRes;
    }

    try {
      const apiRes = await fetch(
        `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
        {
          cf: { cacheTtl: 3600, cacheEverything: true },
        } as RequestInit,
      );

      if (!apiRes.ok) return spaRes;

      const course = (await apiRes.json()) as CourseData;
      if (!course?.name_zh && !course?.name_en) return spaRes;

      const isZh = lang === "zh";
      const teachers = isZh
        ? (course.teacher_zh?.join("、") ?? "")
        : (course.teacher_en?.join(", ") ??
          course.teacher_zh?.join(", ") ??
          "");

      const semester = toPrettySemester(course.semester ?? "");
      const nameZh = course.name_zh ?? "";
      const nameEn = course.name_en ?? "";
      const dept = course.department ?? "";

      const title = isZh
        ? `${nameZh} ${teachers} - 清大${dept}課程 | NTHUMods`
        : `${nameEn} ${teachers} - NTHU ${dept} | NTHUMods`;

      const description = isZh
        ? `清大 ${semester} ${nameZh}（${nameEn}），${teachers} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
        : `NTHU ${semester} ${nameEn} (${nameZh}), taught by ${teachers}. View syllabus, past scores, and course history on NTHUMods.`;

      const canonicalUrl = buildCanonicalUrl(lang, courseId);

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
            el.setAttribute("content", "article");
          },
        })
        .on('meta[name="twitter:title"]', {
          element(el) {
            el.setAttribute("content", title);
          },
        })
        .on('meta[name="twitter:description"]', {
          element(el) {
            el.setAttribute("content", description);
          },
        })
        .on('link[rel="canonical"]', {
          element(el) {
            el.setAttribute("href", canonicalUrl);
          },
        })
        .transform(spaRes);
    } catch {
      // API failure or malformed payload: still return valid SPA shell.
      return spaRes;
    }
  },
};
