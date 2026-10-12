# Google Tag Manager setup

## Current integration

- The public container is `GTM-NZKGV8R3`. It is in `apps/web/index.html` and is
  the fallback value in `apps/web/src/lib/gtm.ts`.
- `apps/web/index.html` loads the GTM script and includes the no-script iframe.
- `apps/web/src/main.tsx` calls `initializeGTM()`.
- `VITE_GTM_ID` can override the public default. Do not put private credentials
  in a `VITE_*` variable.

`apps/web/src/lib/gtm.ts` provides these browser helpers:

- `initializeGTM()` creates `window.dataLayer`, loads the script, and marks the
  page as initialized.
- `trackPageView(title, path)` pushes a `pageview` event with `page.title` and
  `page.path`.
- `trackEvent(name, data)` and `pushGTMEvent(name, data)` push custom events.

The current event wrappers are in `apps/web/src/lib/trackingEvents.ts`. They are
used by course search, course details, timetable, and course selection paths.
The optional `useGTMPageTracking` hook pushes route page views when a caller
mounts it; it has no current caller in the web source.

## Check the integration

1. Open the app with browser developer tools.
2. Check `window.dataLayer` for the `gtm.js` event and any application events.
3. Use GTM Preview with container `GTM-NZKGV8R3` when checking a published
   container or a new event.

Keep event names and payloads free of passwords, tokens, API keys, and full email
addresses. Update this file in the same PR when the integration paths change.
