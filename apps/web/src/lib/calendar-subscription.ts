export type CalendarSubscriptionLinks = {
  google: string;
  apple: string;
  outlook: string;
  copy: string;
};

export function toHttpsCalendarFeedUrl(feedUrl: string): string {
  return feedUrl.replace(/^(?:webcals?|http):\/\//i, "https://");
}

export function buildCalendarSubscriptionLinks(
  feedUrl: string,
  calendarName: string,
): CalendarSubscriptionLinks {
  const httpsFeedUrl = toHttpsCalendarFeedUrl(feedUrl);

  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsFeedUrl)}`,
    apple: feedUrl,
    outlook:
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsFeedUrl)}` +
      `&name=${encodeURIComponent(calendarName)}`,
    copy: feedUrl,
  };
}
