import { Helmet } from "react-helmet-async";
import { matchRoutes } from "react-router-dom";
import { router } from "@/router";
import { usePageLocation } from "@/hooks/usePageLocation";
import { serializeJsonLd } from "@/lib/seo";
import useDictionary from "@/dictionaries/useDictionary";
import { useLocalizedZh } from "@/hooks/useLocalizedZh";
import type { Language } from "@/types/settings";

interface RouteHandle {
  title?: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  noindex?: boolean;
  titleZhKey?:
    | "course.instructor.title"
    | "course.details.native_reviews.past_page.title";
}

const BASE_URL = "https://nthumods.com";
const DEFAULT_OG_IMAGE = "https://nthumods.com/images/icons/icon-512x512.png";
const DEFAULT_DESCRIPTION_ZH =
  "國立清華大學學生自主開發的免費校園平臺。搜尋課程大綱與歷年評分、建立個人課表、追蹤校車班次、探索場館地圖與畢業學分規劃，一站搞定清大校園生活。";
const DEFAULT_DESCRIPTION_EN =
  "Student-built platform for National Tsing Hua University. Search courses with syllabi and grade data, build your timetable, check bus schedules, find venues, and plan graduation.";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NTHUMods",
  alternateName: ["清大課程平臺", "NTHU Mods", "清華大學選課平臺", "清大選課"],
  url: BASE_URL,
  description: DEFAULT_DESCRIPTION_ZH,
  inLanguage: ["zh-TW", "en", "zh-CN"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate:
        "https://nthumods.com/zh/courses?nthu_courses[query]={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NTHUMods",
  url: BASE_URL,
  logo: DEFAULT_OG_IMAGE,
  description: DEFAULT_DESCRIPTION_ZH,
  sameAs: ["https://github.com/nthumodifications/courseweb"],
  parentOrganization: {
    "@type": "EducationalOrganization",
    name: "National Tsing Hua University",
    alternateName: "國立清華大學",
    url: "https://www.nthu.edu.tw",
  },
};

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === "/") return "/";
  let withoutTrailing = pathname;
  while (withoutTrailing.endsWith("/")) {
    withoutTrailing = withoutTrailing.slice(0, -1);
  }
  return withoutTrailing || "/";
};

const replaceLangPrefix = (path: string, lang: Language): string => {
  const normalized = normalizePath(path);
  if (normalized === "/") return `/${lang}`;
  if (/^\/(zh|zh-cn|en)(\/|$)/.test(normalized)) {
    return normalized.replace(/^\/(zh|zh-cn|en)(?=\/|$)/, `/${lang}`);
  }
  return `/${lang}${normalized === "/" ? "" : normalized}`;
};

const getLangFromPath = (pathname: string): Language => {
  if (pathname.startsWith("/en/") || pathname === "/en") return "en";
  if (pathname.startsWith("/zh-cn/") || pathname === "/zh-cn") return "zh-cn";
  return "zh";
};

const shouldNoindexPath = (pathname: string): boolean => {
  const p = normalizePath(pathname);
  return (
    p === "/auth/callback" ||
    p === "/api/auth/callback/nthu_oauth" ||
    p.startsWith("/l/") ||
    p.endsWith("/proxy-login") ||
    p.endsWith("/offline")
  );
};

const getPageTitle = (
  isZh: boolean,
  dictionaryTitle: string | undefined,
  handle: RouteHandle | undefined,
) =>
  isZh ? (dictionaryTitle ?? handle?.titleZh ?? handle?.title) : handle?.title;

const getDescription = (isZh: boolean, handle: RouteHandle | undefined) => {
  if (!isZh)
    return (
      handle?.description ?? handle?.descriptionZh ?? DEFAULT_DESCRIPTION_EN
    );
  return handle?.descriptionZh ?? handle?.description ?? DEFAULT_DESCRIPTION_ZH;
};

const getFullTitle = (isZh: boolean, pageTitle: string | undefined) => {
  if (pageTitle) return `${pageTitle} | NTHUMods`;
  return isZh
    ? "NTHUMods｜清大課程查詢・課表規劃・校車時刻表"
    : "NTHUMods | NTHU Course Search & Campus Tools";
};

const getPageLanguage = (lang: Language) => {
  if (lang === "en") return "en";
  return lang === "zh-cn" ? "zh-CN" : "zh-TW";
};

const getOpenGraphLocale = (lang: Language) => {
  if (lang === "en") return "en_US";
  return lang === "zh-cn" ? "zh_CN" : "zh_TW";
};

const TitleUpdater = () => {
  const dict = useDictionary();
  const localize = useLocalizedZh();
  const location = usePageLocation();
  const matches = matchRoutes(router.routes, location) ?? [];

  const handle = (matches.at(-1)?.route as { handle?: RouteHandle } | undefined)
    ?.handle;
  const pathLang = getLangFromPath(location.pathname);
  const isZh = pathLang !== "en";

  const dictionaryTitle =
    handle?.titleZhKey === "course.instructor.title"
      ? dict.course.instructor.title
      : handle?.titleZhKey === "course.details.native_reviews.past_page.title"
        ? dict.course.details.native_reviews.past_page.title
        : undefined;
  const pageTitle = localize(getPageTitle(isZh, dictionaryTitle, handle) ?? "");
  const description = localize(getDescription(isZh, handle));
  const fullTitle = localize(getFullTitle(isZh, pageTitle || undefined));
  const pageLanguage = getPageLanguage(pathLang);
  const openGraphLocale = getOpenGraphLocale(pathLang);

  const canonicalPath = normalizePath(location.pathname);
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const zhPath = replaceLangPrefix(canonicalPath, "zh");
  const enPath = replaceLangPrefix(canonicalPath, "en");
  const zhCnPath = replaceLangPrefix(canonicalPath, "zh-cn");

  const zhUrl = `${BASE_URL}${zhPath}`;
  const enUrl = `${BASE_URL}${enPath}`;
  const zhCnUrl = `${BASE_URL}${zhCnPath}`;
  const xDefaultUrl = zhUrl;

  const routeNoindex = Boolean(handle?.noindex);
  const pathNoindex = shouldNoindexPath(canonicalPath);
  const robots =
    routeNoindex || pathNoindex ? "noindex, nofollow" : "index, follow";

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: fullTitle,
    url: canonicalUrl,
    description,
    inLanguage: pageLanguage,
    isPartOf: {
      "@type": "WebSite",
      url: BASE_URL,
      name: "NTHUMods",
    },
  };

  const localizedWebsiteJsonLd = {
    ...websiteJsonLd,
    alternateName: websiteJsonLd.alternateName.map(localize),
    description: localize(websiteJsonLd.description),
  };
  const localizedOrganizationJsonLd = {
    ...organizationJsonLd,
    description: localize(organizationJsonLd.description),
    parentOrganization: {
      ...organizationJsonLd.parentOrganization,
      alternateName: localize(
        organizationJsonLd.parentOrganization.alternateName,
      ),
    },
  };

  return (
    <Helmet defer={false}>
      <html lang={pageLanguage} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />

      <link rel="canonical" href={canonicalUrl} />
      {!routeNoindex &&
        !pathNoindex && [
          <link key="zh-TW" rel="alternate" hrefLang="zh-TW" href={zhUrl} />,
          <link key="en" rel="alternate" hrefLang="en" href={enUrl} />,
          <link key="zh-CN" rel="alternate" hrefLang="zh-CN" href={zhCnUrl} />,
          <link
            key="x-default"
            rel="alternate"
            hrefLang="x-default"
            href={xDefaultUrl}
          />,
        ]}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="og:site_name" content="NTHUMods" />
      <meta property="og:locale" content={openGraphLocale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />

      <script type="application/ld+json">
        {serializeJsonLd([
          localizedWebsiteJsonLd,
          localizedOrganizationJsonLd,
          webPageJsonLd,
        ])}
      </script>
    </Helmet>
  );
};

export default TitleUpdater;
