/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker entry point for NTHUMods.
 *
 * For regular users: transparently serves the Vite SPA from Workers Assets.
 * For bots hitting course detail pages: fetches minimal course data from the
 * API and uses HTMLRewriter to inject course-specific meta tags before the
 * response leaves the edge — no build-time cost, works for every course.
 */

interface Env {
  ASSETS: Fetcher;
}

// Covers Google, Bing, social crawlers (LINE, WhatsApp, Telegram, Discord,
// Twitter/X, Facebook, LinkedIn, Slack, Apple) and popular SEO crawlers.
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

// Mirrors apps/web/src/helpers/semester.ts — semester like "11210" → "112-1"
function toPrettySemester(semester: string): string {
  const year = semester.slice(0, 3);
  const term = parseInt(semester.slice(3, 4));
  return `${year}-${term}`;
}

interface CourseData {
  name_zh: string;
  name_en: string;
  teacher_zh?: string[];
  teacher_en?: string[];
  semester: string;
  department: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userAgent = request.headers.get("User-Agent") ?? "";

    // Fast path: real users go straight to the SPA shell, zero overhead
    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    const url = new URL(request.url);
    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);

    // Non-course pages: serve normally (static meta tags are fine for bots on
    // main pages; Google renders JS for those anyway)
    if (!courseMatch) {
      return env.ASSETS.fetch(request);
    }

    const lang = courseMatch[1];
    const courseId = decodeURIComponent(courseMatch[2]);

    try {
      // Fetch only the lightweight course record — no syllabus needed here
      const apiRes = await fetch(
        `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
        {
          // Cache at the edge for 1 hour to avoid hammering the API
          cf: { cacheTtl: 3600, cacheEverything: true },
        } as RequestInit,
      );

      if (!apiRes.ok) return env.ASSETS.fetch(request);

      const course = (await apiRes.json()) as CourseData;
      if (!course?.name_zh) return env.ASSETS.fetch(request);

      const isZh = lang === "zh";
      const teachers = isZh
        ? (course.teacher_zh?.join("、") ?? "")
        : (course.teacher_en?.join(", ") ??
          course.teacher_zh?.join(", ") ??
          "");
      const semester = toPrettySemester(course.semester);

      const title = isZh
        ? `${course.name_zh} ${teachers} - 清大${course.department}課程 | NTHUMods`
        : `${course.name_en} ${teachers} - NTHU ${course.department} | NTHUMods`;

      const description = isZh
        ? `清大 ${semester} ${course.name_zh}（${course.name_en}），${teachers} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
        : `NTHU ${semester} ${course.name_en} (${course.name_zh}), taught by ${teachers}. View syllabus, past scores, and course history on NTHUMods.`;

      const canonicalUrl = `https://nthumods.com/${lang}/courses/${encodeURIComponent(courseId)}`;

      // Serve the SPA shell and rewrite the generic meta tags with
      // course-specific content before it leaves the edge
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
      // API down or malformed data — always fall back gracefully
      return env.ASSETS.fetch(request);
    }
  },
};
