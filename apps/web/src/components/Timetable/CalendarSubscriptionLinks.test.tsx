import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "bun:test";
import { CalendarSubscriptionLinkList } from "./CalendarSubscriptionLinks";
import { buildCalendarSubscriptionLinks } from "@/lib/calendar-subscription";

const labels = {
  google: "Add to Google Calendar",
  apple: "Add to Apple Calendar",
  outlook: "Outlook",
  copy_link: "Copy link",
  copied: "Copied",
  copied_description: "Link copied to clipboard",
  calendar_name: "NTHUMods Timetable",
  subscription_hint: "Subscriptions update automatically.",
};

describe("calendar subscription links markup", () => {
  test("keeps provider links in the existing left-aligned button contract", () => {
    const feedUrl =
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510";
    const links = buildCalendarSubscriptionLinks(feedUrl, labels.calendar_name);
    const markup = renderToStaticMarkup(
      <div className="flex flex-col space-y-2">
        <CalendarSubscriptionLinkList
          links={links}
          labels={labels}
          onCopy={() => undefined}
        />
      </div>,
    );

    const anchorPattern = /<a /g;
    let anchorCount = 0;
    while (anchorPattern.exec(markup) !== null) anchorCount += 1;

    expect(anchorCount).toBe(3);
    expect(markup).toContain("w-full justify-start");
    expect(markup).toContain(labels.copy_link);
    expect(markup).toContain(feedUrl);
  });
});
