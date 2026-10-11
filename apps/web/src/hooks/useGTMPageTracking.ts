import { useEffect, useRef } from "react";
import { useLocation, type Location } from "react-router-dom";
import { trackPageView } from "@/lib/gtm";
import { isDialogClose, pageViewPath } from "@/lib/pageViewTracking";

/**
 * Custom hook to track page views in Google Tag Manager
 * Automatically tracks page views when route changes
 */
export function useGTMPageTracking(): void {
  const location = useLocation();
  const previousLocation = useRef<Location | null>(null);

  useEffect(() => {
    if (previousLocation.current === location) return;
    const previous = previousLocation.current;
    previousLocation.current = location;
    if (isDialogClose(previous, location)) return;

    // Get page title from document or use pathname as fallback
    const pageTitle = document.title || "NTHUMods";

    // Track the page view
    trackPageView(pageTitle, pageViewPath(location));
  }, [location]);
}
