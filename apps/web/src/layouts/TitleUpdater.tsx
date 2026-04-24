import { Helmet } from "react-helmet-async";
import { useLocation, useMatches } from "react-router-dom";

interface RouteHandle {
  title?: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  noindex?: boolean;
}

const BASE_URL = "https://nthumods.com";
const DEFAULT_OG_IMAGE = "https://nthumods.com/images/icons/icon-512x512.png";
const DEFAULT_DESCRIPTION_ZH =
  "NTHUMods 清大課程整合平臺｜搜尋清大課表、校車時間表、場館資訊、畢業規劃。國立清華大學學生自主開發，提供全方位清大校園資訊服務。";
const DEFAULT_DESCRIPTION_EN =
  "NTHUMods – the all-in-one platform for National Tsing Hua University students. Search NTHU courses, check campus bus schedules, find venues, and plan your graduation.";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NTHUMods",
  alternateName: ["清大課程平臺", "NTHU Mods", "清華大學選課平臺", "清大選課"],
  url: BASE_URL,
  description: DEFAULT_DESCRIPTION_ZH,
  inLanguage: ["zh-TW", "en"],
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
  const withoutTrailing = pathname.replace(/\/+$/, "");
  return withoutTrailing || "/";
};

const replaceLangPrefix = (path: string, lang: "zh" | "en"): string => {
  const normalized = normalizePath(path);
  if (normalized === "/") return `/${lang}`;
  if (/^\/(zh|en)(\/|$)/.test(normalized)) {
    return normalized.replace(/^\/(zh|en)(?=\/|$)/, `/${lang}`);
  }
  return `/${lang}${normalized === "/" ? "" : normalized}`;
};

const getLangFromPath = (pathname: string): "zh" | "en" => {
  if (pathname.startsWith("/en/") || pathname === "/en") return "en";
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

const TitleUpdater = () => {
  const matches = useMatches();
  const location = useLocation();

  const handle = matches.at(-1)?.handle as RouteHandle | undefined;
  const pathLang = getLangFromPath(location.pathname);
  const isZh = pathLang === "zh";

  const pageTitle = isZh ? (handle?.titleZh ?? handle?.title) : handle?.title;
  const description = isZh
    ? (handle?.descriptionZh ?? handle?.description ?? DEFAULT_DESCRIPTION_ZH)
    : (handle?.description ?? handle?.descriptionZh ?? DEFAULT_DESCRIPTION_EN);

  const fullTitle = pageTitle
    ? `${pageTitle} | NTHUMods`
    : "NTHUMods - 清華課程整合平臺";

  const canonicalPath = normalizePath(location.pathname);
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const zhPath = replaceLangPrefix(canonicalPath, "zh");
  const enPath = replaceLangPrefix(canonicalPath, "en");

  const zhUrl = `${BASE_URL}${zhPath}`;
  const enUrl = `${BASE_URL}${enPath}`;
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
    inLanguage: isZh ? "zh-TW" : "en",
    isPartOf: {
      "@type": "WebSite",
      url: BASE_URL,
      name: "NTHUMods",
    },
  };

  return (
    <Helmet>
      <html lang={isZh ? "zh-TW" : "en"} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />

      <link rel="canonical" href={canonicalUrl} />
      {!pathNoindex && (
        <>
          <link rel="alternate" hrefLang="zh-TW" href={zhUrl} />
          <link rel="alternate" hrefLang="en" href={enUrl} />
          <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />
        </>
      )}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="og:site_name" content="NTHUMods" />
      <meta property="og:locale" content={isZh ? "zh_TW" : "en_US"} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />

      <script type="application/ld+json">
        {JSON.stringify([websiteJsonLd, organizationJsonLd, webPageJsonLd])}
      </script>
    </Helmet>
  );
};

export default TitleUpdater;
