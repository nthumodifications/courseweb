import type { Location } from "react-router-dom";

const getDialog = (location: Location) => {
  const dialog = (location.state as { dialog?: unknown } | null)?.dialog;
  return dialog && typeof dialog === "object"
    ? (dialog as { background?: unknown })
    : undefined;
};

export const isDialogLocation = (location: Location) =>
  Boolean(getDialog(location));

export const isDialogClose = (previous: Location | null, current: Location) => {
  const background = previous ? getDialog(previous)?.background : undefined;
  if (!background || isDialogLocation(current)) return false;
  const recorded = background as Partial<Location>;
  return (
    recorded.pathname === current.pathname &&
    (recorded.search ?? "") === current.search &&
    (recorded.hash ?? "") === current.hash
  );
};

export const pageViewPath = (location: Location) =>
  `${location.pathname}${location.search}${location.hash}`;
