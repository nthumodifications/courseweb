"use client";
import * as gtag from "@/lib/gtag";
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";

const GoogleAnalytics = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [searchParams] = useSearchParams();
  const { analytics } = useSettings();

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    gtag.pageview(url);
  }, [pathname, searchParams]);

  if (!analytics) return <></>;
  if (!import.meta.env.PROD) return <></>;

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
      />
      <script
        id="gtag-init"
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
