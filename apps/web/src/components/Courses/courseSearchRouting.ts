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

const dialogBackground = (): DialogBackground | undefined => {
  if (typeof window === "undefined") return undefined;
  const state = window.history.state as BrowserDialogState | null;
  const background = state?.usr?.dialog?.background;
  return background && typeof background === "object" ? background : undefined;
};

const hasDialogState = () => {
  const background = dialogBackground();
  return typeof background?.pathname === "string";
};

const getLocation = () => {
  if (typeof window === "undefined") {
    throw new Error("Course search routing requires a browser window");
  }

  const background = dialogBackground();
  if (typeof background?.pathname !== "string") return window.location;

  const location = new URL(window.location.href);
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
export const createCourseSearchRouter = () => {
  const router = historyRouter<UiState>({
    getLocation,
    push: (url) => {
      if (hasDialogState()) return;
      window.history.pushState(null, "", url);
    },
    cleanUrlOnDispose: false,
  });

  const write = router.write.bind(router);
  router.write = (routeState) => {
    if (hasDialogState()) return;
    write(routeState);
  };

  return router;
};
