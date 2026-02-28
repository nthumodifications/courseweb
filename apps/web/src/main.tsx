import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { router } from "@/router";

import * as Sentry from "@sentry/browser";

import "./app/globals.css";

// Initialize Sentry
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://3e4ce572387315b4836eef74073f576d@o4506077215064064.ingest.sentry.io/4506077218275328",
    tracesSampleRate: 1,
    debug: false,
    replaysSessionSampleRate: 0.1,
    environment: import.meta.env.MODE,
    enabled: true,
    integrations: [
      Sentry.breadcrumbsIntegration(),
      Sentry.globalHandlersIntegration(),
    ],
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RouterProvider router={router} />
  </HelmetProvider>,
);
