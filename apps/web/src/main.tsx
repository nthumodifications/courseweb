import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { router } from "@/router";

import {
  BrowserClient,
  breadcrumbsIntegration,
  defaultStackParser,
  getCurrentHub,
  globalHandlersIntegration,
  makeFetchTransport,
} from "@sentry/browser";

import "./app/globals.css";

// Initialize Sentry
if (import.meta.env.PROD) {
  const sentryClient = new BrowserClient({
    dsn: "https://3e4ce572387315b4836eef74073f576d@o4506077215064064.ingest.sentry.io/4506077218275328",
    tracesSampleRate: 1,
    debug: false,
    replaysSessionSampleRate: 0.1,
    environment: import.meta.env.MODE,
    enabled: true,
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    integrations: [breadcrumbsIntegration(), globalHandlersIntegration()],
  });
  getCurrentHub().bindClient(sentryClient);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RouterProvider router={router} />
  </HelmetProvider>,
);
