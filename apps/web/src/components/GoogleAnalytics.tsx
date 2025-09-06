"use client";
import Script from "next/script";
import * as gtag from "@/lib/gtag";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSettings } from "@/hooks/contexts/settings";

const GoogleAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { analytics } = useSettings();

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    gtag.pageview(url);
  }, [pathname, searchParams]);

  if (!analytics) return <></>;
  if (process.env.NODE_ENV !== "production") return <></>;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gtag.GA_TRACKING_ID}', {
                    page_path: window.location.pathname,
                    });
                    `,
        }}
      />
    </>
  );
};

export default GoogleAnalytics;
