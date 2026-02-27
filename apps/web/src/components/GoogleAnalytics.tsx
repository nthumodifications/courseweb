import * as gtag from "@/lib/gtag";
import { useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";

const GoogleAnalytics = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [searchParams] = useSearchParams();
  const { analytics } = useSettings();
  const scriptLoaded = useRef(false);

  // Dynamically load GA script (JSX <script> tags don't execute in SPAs)
  useEffect(() => {
    if (!analytics || !import.meta.env.PROD || scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`;
    script.async = true;
    document.head.appendChild(script);

    const initScript = document.createElement("script");
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gtag.GA_TRACKING_ID}', {
        page_path: window.location.pathname,
      });
    `;
    document.head.appendChild(initScript);
  }, [analytics]);

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    gtag.pageview(url);
  }, [pathname, searchParams]);

  return null;
};

export default GoogleAnalytics;
