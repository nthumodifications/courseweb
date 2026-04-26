import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/gtm";

/**
 * Custom hook to track page views in Google Tag Manager
 * Automatically tracks page views when route changes
 */
export function useGTMPageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Get page title from document or use pathname as fallback
    const pageTitle = document.title || "NTHUMods";

    // Track the page view
    trackPageView(pageTitle, location.pathname);
  }, [location.pathname]);
}
