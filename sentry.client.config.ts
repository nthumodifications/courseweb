// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  BrowserClient,
  breadcrumbsIntegration,
  defaultStackParser,
  getCurrentHub,
  globalHandlersIntegration,
  makeFetchTransport,
} from "@sentry/browser";

const client = new BrowserClient({
  // all options you normally pass to Sentry.init
  dsn: "https://3e4ce572387315b4836eef74073f576d@o4506077215064064.ingest.sentry.io/4506077218275328",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  debug: false,

  replaysSessionSampleRate: 0.1,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production", // Only send events to Sentry in production

  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  // Only the integrations listed here will be used
  integrations: [breadcrumbsIntegration(), globalHandlersIntegration()],
});

getCurrentHub().bindClient(client);
