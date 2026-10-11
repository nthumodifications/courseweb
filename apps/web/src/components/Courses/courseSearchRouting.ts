import historyRouter from "instantsearch.js/es/lib/routers/history";
import type { UiState } from "instantsearch.js/es/types";

type DialogBackground = {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
};

type BrowserDialogState = {
  usr?: {
    dialog?: {
      background?: DialogBackground;
    };
  };
};

const dialogBackground = (
  browserWindow: Window,
): DialogBackground | undefined => {
  const state = browserWindow.history.state as BrowserDialogState | null;
  const background = state?.usr?.dialog?.background;
  return background && typeof background === "object" ? background : undefined;
};

const hasDialogState = (browserWindow: Window) => {
  const background = dialogBackground(browserWindow);
  return typeof background?.pathname === "string";
};

const getLocation = (browserWindow: Window) => {
  const background = dialogBackground(browserWindow);
  if (typeof background?.pathname !== "string") return browserWindow.location;

  const location = new URL(browserWindow.location.href);
  location.pathname = background.pathname;
  location.search =
    typeof background.search === "string" ? background.search : "";
  location.hash = typeof background.hash === "string" ? background.hash : "";
  return location as unknown as Location;
};

/**
 * Keeps InstantSearch URL routing attached to the list entry while a course
 * dialog is on top of it. The search page remains mounted as the background
 * route, but its delayed native history writer must not create a third entry.
 */
export const createCourseSearchRouter = (browserWindow = window) => {
  const router = historyRouter<UiState>({
    getLocation: () => getLocation(browserWindow),
    push: (url) => {
      if (hasDialogState(browserWindow)) return;
      browserWindow.history.pushState(null, "", url);
    },
    cleanUrlOnDispose: false,
  });

  const write = router.write.bind(router);
  router.write = (routeState) => {
    if (hasDialogState(browserWindow)) return;
    write(routeState);
  };

  return router;
};
