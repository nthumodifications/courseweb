import {
  buildCalendarSubscriptionLinks,
  toHttpsCalendarFeedUrl,
} from "./calendar-subscription";

const feedUrl =
  "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510&semester_11510=11510CS%20135700,11510EE%20230100";

describe("calendar subscription URL builders", () => {
  it("uses HTTPS for Google and Outlook while preserving the Apple feed URL", () => {
    const links = buildCalendarSubscriptionLinks(feedUrl, "NTHUMods Timetable");
    const httpsFeedUrl = toHttpsCalendarFeedUrl(feedUrl);

    expect(links.apple).toBe(feedUrl);
    expect(links.copy).toBe(feedUrl);
    expect(links.google).toBe(
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsFeedUrl)}`,
    );
    expect(links.outlook).toBe(
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsFeedUrl)}&name=NTHUMods%20Timetable`,
    );
  });

  it("encodes feed query delimiters and non-ASCII calendar names", () => {
    const links = buildCalendarSubscriptionLinks(
      "https://api.nthumods.com/timetable/calendar.ics?semester=11510&semester_11510=course%26one,course%3Ftwo",
      "我的課表 & 115-1",
    );

    expect(links.google).toContain(
      "cid=https%3A%2F%2Fapi.nthumods.com%2Ftimetable%2Fcalendar.ics%3Fsemester%3D11510%26semester_11510%3Dcourse%2526one%2Ccourse%253Ftwo",
    );
    expect(links.outlook).toContain(
      "name=%E6%88%91%E7%9A%84%E8%AA%B2%E8%A1%A8%20%26%20115-1",
    );
  });

  it("keeps long course lists inside one encoded feed URL", () => {
    const courseIds = Array.from(
      { length: 120 },
      (_, index) => `11510CS ${String(index).padStart(6, "0")}`,
    ).join(",");
    const longFeedUrl = `webcal://api.nthumods.com/timetable/calendar.ics?semester=11510&semester_11510=${encodeURIComponent(courseIds)}`;
    const links = buildCalendarSubscriptionLinks(longFeedUrl, "Long timetable");

    expect(links.google).toContain(
      encodeURIComponent(toHttpsCalendarFeedUrl(longFeedUrl)),
    );
    expect(links.outlook).toContain(
      `url=${encodeURIComponent(toHttpsCalendarFeedUrl(longFeedUrl))}&name=Long%20timetable`,
    );
  });
});
