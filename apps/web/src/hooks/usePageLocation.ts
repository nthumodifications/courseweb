import { useLocation, type Location } from "react-router-dom";

type DialogBackgroundState = {
  dialog?: {
    background?: Partial<
      Pick<Location, "pathname" | "search" | "hash" | "key">
    >;
  };
};

const getDialogBackground = (state: unknown) => {
  if (!state || typeof state !== "object") return undefined;
  const dialog = (state as DialogBackgroundState).dialog;
  if (!dialog?.background || typeof dialog.background !== "object") {
    return undefined;
  }
  return dialog.background;
};

/** The route whose page owns global metadata while a dialog is open. */
export const getPageLocation = (location: Location): Location => {
  const background = getDialogBackground(location.state);
  return background
    ? {
        ...location,
        ...background,
        state: null,
      }
    : location;
};

export const usePageLocation = () => getPageLocation(useLocation());
