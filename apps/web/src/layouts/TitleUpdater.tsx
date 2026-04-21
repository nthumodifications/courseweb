import { Helmet } from "react-helmet-async";
import { useMatches, useLocation } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";

interface RouteHandle {
  title?: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
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
  url: "https://nthumods.com",
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
  url: "https://nthumods.com",
  logo: "https://nthumods.com/images/icons/icon-512x512.png",
  description: DEFAULT_DESCRIPTION_ZH,
  sameAs: ["https://github.com/nthumodifications/courseweb"],
  parentOrganization: {
    "@type": "EducationalOrganization",
    name: "National Tsing Hua University",
    alternateName: "國立清華大學",
    url: "https://www.nthu.edu.tw",
  },
};

const TitleUpdater = () => {
  const matches = useMatches();
  const location = useLocation();
  const { language } = useSettings();

  const handle = matches.at(-1)?.handle as RouteHandle | undefined;
  const isZh = language === "zh";

  const pageTitle =
    isZh && handle?.titleZh ? handle.titleZh : handle?.title;
  const description = isZh
    ? (handle?.descriptionZh ?? DEFAULT_DESCRIPTION_ZH)
    : (handle?.description ?? DEFAULT_DESCRIPTION_EN);

  const fullTitle = pageTitle
    ? `${pageTitle} | NTHUMods`
    : "NTHUMods - 清華課程整合平臺";

  const canonicalPath = location.pathname.replace(/\/$/, "") || "/";
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;
  const zhUrl = canonicalUrl.includes("/en/")
    ? canonicalUrl.replace("/en/", "/zh/")
    : canonicalUrl;
  const enUrl = canonicalUrl.includes("/zh/")
    ? canonicalUrl.replace("/zh/", "/en/")
    : canonicalUrl;

  const lang = canonicalUrl.includes("/en/") ? "en" : "zh";

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hreflang="zh" href={zhUrl} />
      <link rel="alternate" hreflang="en" href={enUrl} />
      <link rel="alternate" hreflang="x-default" href={zhUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="og:site_name" content="NTHUMods" />
      <meta
        property="og:locale"
        content={lang === "zh" ? "zh_TW" : "en_US"}
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />

      <script type="application/ld+json">
        {JSON.stringify([websiteJsonLd, organizationJsonLd])}
      </script>
    </Helmet>
  );
};

export default TitleUpdater;
