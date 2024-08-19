// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3e4ce572387315b4836eef74073f576d@o4506077215064064.ingest.sentry.io/4506077218275328",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production", // Only send events to Sentry in production
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
