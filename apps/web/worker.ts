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

    return env.ASSETS.fetch(request);
  },
};
