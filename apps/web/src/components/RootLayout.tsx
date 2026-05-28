import { Outlet } from "react-router-dom";
import { useGTMPageTracking } from "@/hooks/useGTMPageTracking";

/**
 * Root layout component that wraps all routes and enables GTM page tracking
 */
export function RootLayout() {
  // Track page views whenever route changes
  useGTMPageTracking();

  return <Outlet />;
}
