import {
  getTaipeiMonthForDisplay,
  getTaipeiWeek,
  isTaipeiDateKey,
} from "@/helpers/dates";
import { getSingleSearchParam } from "@/lib/deep-links/search-params";

export type CalendarDisplayMode = "week" | "month" | "upcoming";

export const CALENDAR_DISPLAY_MODES: readonly CalendarDisplayMode[] = [
  "week",
  "month",
  "upcoming",
];

export interface CalendarDeepLink {
  date?: string;
  view?: CalendarDisplayMode;
}

export interface CalendarTransition {
  displayDates: Date[];
  urlDate: Date;
}

export const getCalendarDeepLinkRequest = ({
  date,
  view,
}: CalendarDeepLink): string => `${date ?? ""}|${view ?? ""}`;

export const shouldResetCalendarToOrigin = (
  lastAppliedRequest: string | null,
  request: string,
): boolean =>
  lastAppliedRequest !== null &&
  lastAppliedRequest !== request &&
  request === getCalendarDeepLinkRequest({});

export const isCalendarNavigationNoop = (mode: CalendarDisplayMode): boolean =>
  mode === "upcoming";

export const getCalendarTransition = (
  mode: CalendarDisplayMode,
  anchorDate: Date | undefined,
  currentDates: Date[],
): CalendarTransition => {
  const effectiveAnchorDate = anchorDate ?? currentDates[0] ?? new Date();
  const urlDate = (displayDates: Date[]) =>
    anchorDate ??
    displayDates[Math.floor(displayDates.length / 2)] ??
    effectiveAnchorDate;

  switch (mode) {
    case "week": {
      const displayDates = getTaipeiWeek(effectiveAnchorDate);
      return { displayDates, urlDate: urlDate(displayDates) };
    }
    case "month": {
      const displayDates = getTaipeiMonthForDisplay(effectiveAnchorDate);
      return { displayDates, urlDate: urlDate(displayDates) };
    }
    case "upcoming":
      return {
        displayDates: currentDates,
        urlDate: urlDate(currentDates),
      };
  }
};

export const parseCalendarDeepLink = (
  searchParams: URLSearchParams,
): CalendarDeepLink => {
  const date = getSingleSearchParam(searchParams, "date");
  const view = getSingleSearchParam(searchParams, "view");

  return {
    date: date && isTaipeiDateKey(date) ? date : undefined,
    view: CALENDAR_DISPLAY_MODES.includes(view as CalendarDisplayMode)
      ? (view as CalendarDisplayMode)
      : undefined,
  };
};
