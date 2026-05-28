export interface WebPageData {
  title: string;
  description: string;
  url: string;
  lang?: string;
}

export function useWebPageJsonLd(data: WebPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: data.url,
    inLanguage: data.lang === "en" ? "en-US" : "zh-TW",
    isPartOf: {
      "@type": "WebSite",
      url: "https://nthumods.com",
    },
  };
}
