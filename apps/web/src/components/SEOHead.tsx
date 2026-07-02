import { Helmet } from "react-helmet-async";

const BASE_URL = "https://nthumods.com";
const DEFAULT_OG_IMAGE = "https://nthumods.com/images/icons/icon-512x512.png";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: object | object[];
  breadcrumbs?: object;
  noindex?: boolean;
  lang?: string;
}

const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
  breadcrumbs,
  noindex = false,
  lang = "zh",
}: SEOHeadProps) => {
  const fullTitle = `${title} | NTHUMods`;
  const canonicalUrl = canonical ?? BASE_URL;
  const zhUrl = canonicalUrl.replace(/\/en\//, "/zh/");
  const enUrl = canonicalUrl.replace(/\/zh\//, "/en/");

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="zh-TW" href={zhUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={zhUrl} />

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="NTHUMods" />
      <meta property="og:locale" content={lang === "zh" ? "zh_TW" : "en_US"} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {(() => {
        const allJsonLd = breadcrumbs
          ? [
              breadcrumbs,
              ...(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []),
            ]
          : jsonLd;
        return allJsonLd ? (
          <script type="application/ld+json">
            {JSON.stringify(Array.isArray(allJsonLd) ? allJsonLd : [allJsonLd])}
          </script>
        ) : null;
      })()}
    </Helmet>
  );
};

export default SEOHead;
