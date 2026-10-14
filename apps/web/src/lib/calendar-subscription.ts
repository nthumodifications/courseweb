export type CalendarSubscriptionLinks = {
  google: string;
  apple: string;
  outlook: string;
  copy: string;
};

export const CALENDAR_FEED_INCLUDES = [
  "classes",
  "events",
  "academic",
] as const;

export type CalendarFeedInclude = (typeof CALENDAR_FEED_INCLUDES)[number];
export type CalendarFeedIncludeSelection = Record<CalendarFeedInclude, boolean>;

export const DEFAULT_CALENDAR_FEED_INCLUDES: CalendarFeedIncludeSelection = {
  classes: true,
  events: true,
  academic: true,
};

export const CALENDAR_FEED_INCLUDE_STORAGE_KEY =
  "calendar_subscription_includes";

export const parseCalendarFeedIncludeSelection = (
  value: string,
): CalendarFeedIncludeSelection => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== CALENDAR_FEED_INCLUDES.length
    ) {
      return DEFAULT_CALENDAR_FEED_INCLUDES;
    }
    const selection = parsed as Record<string, unknown>;
    if (
      CALENDAR_FEED_INCLUDES.some(
        (include) => typeof selection[include] !== "boolean",
      ) ||
      Object.keys(selection).some(
        (include) =>
          !(CALENDAR_FEED_INCLUDES as readonly string[]).includes(include),
      )
    ) {
      return DEFAULT_CALENDAR_FEED_INCLUDES;
    }
    return {
      classes: selection.classes as boolean,
      events: selection.events as boolean,
      academic: selection.academic as boolean,
    };
  } catch {
    return DEFAULT_CALENDAR_FEED_INCLUDES;
  }
};

export const addCalendarFeedIncludes = (
  feedUrl: string,
  selection: CalendarFeedIncludeSelection,
) => {
  const url = new URL(feedUrl);
  url.searchParams.set(
    "include",
    CALENDAR_FEED_INCLUDES.filter((include) => selection[include]).join(","),
  );
  return url.toString();
};

export function toHttpsCalendarFeedUrl(feedUrl: string): string {
  return feedUrl.replace(/^(?:webcals?|https?):\/\//i, "https://");
}

export function toWebcalCalendarFeedUrl(feedUrl: string): string {
  return feedUrl.replace(/^(?:webcals?|https?):\/\//i, "webcal://");
}

export function buildCalendarSubscriptionLinks(
  feedUrl: string,
  calendarName: string,
  includes?: CalendarFeedIncludeSelection,
): CalendarSubscriptionLinks {
  const selectedFeedUrl = includes
    ? addCalendarFeedIncludes(feedUrl, includes)
    : feedUrl;
  const httpsFeedUrl = toHttpsCalendarFeedUrl(selectedFeedUrl);

  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsFeedUrl)}`,
    apple: selectedFeedUrl,
    outlook:
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsFeedUrl)}` +
      `&name=${encodeURIComponent(calendarName)}`,
    copy: selectedFeedUrl,
  };
}
