/**
 * Google Tag Manager Configuration and Utilities
 */

export const GTM_ID = import.meta.env.VITE_GTM_ID || "GTM-NZKGV8R3";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtmInitialized?: boolean;
  }
}

/**
 * Initialize Google Tag Manager
 * This function adds the GTM script to the page
 */
export function initializeGTM(): void {
  if (!GTM_ID) {
    console.warn("GTM ID is not configured");
    return;
  }

  // Avoid re-initializing GTM
  if (typeof window !== "undefined" && window.gtmInitialized) {
    return;
  }

  // Create script element for GTM
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

  // Insert script before first script tag
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  // Mark as initialized
  window.gtmInitialized = true;
}

/**
 * Push a custom event to the GTM dataLayer
 */
export function pushGTMEvent(
  eventName: string,
  data?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...data,
    });
  }
}

/**
 * Track a page view in GTM
 */
export function trackPageView(pageTitle: string, pagePath: string): void {
  pushGTMEvent("pageview", {
    "page.title": pageTitle,
    "page.path": pagePath,
  });
}

/**
 * Track a custom event in GTM
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, unknown>,
): void {
  pushGTMEvent(eventName, eventData);
}
