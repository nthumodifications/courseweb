import { Calendar, Copy } from "lucide-react";
import { Button, toast } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  buildCalendarSubscriptionLinks,
  type CalendarSubscriptionLinks as CalendarSubscriptionLinkUrls,
} from "@/lib/calendar-subscription";

export type CalendarSubscriptionLinkLabels = {
  google: string;
  apple: string;
  outlook: string;
  copy_link: string;
  copied: string;
  copied_description: string;
  calendar_name: string;
  subscription_hint: string;
};

export const CalendarSubscriptionLinkList = ({
  links,
  labels,
  onCopy,
}: {
  links: CalendarSubscriptionLinkUrls;
  labels: CalendarSubscriptionLinkLabels;
  onCopy: () => void;
}) => (
  <>
    <Button variant="outline" className="w-full justify-start" asChild>
      <a href={links.google} target="_blank" rel="noreferrer">
        <Calendar className="w-4 h-4 mr-2" />
        {labels.google}
      </a>
    </Button>
    <Button variant="outline" className="w-full justify-start" asChild>
      <a href={links.apple} target="_blank" rel="noreferrer">
        <Calendar className="w-4 h-4 mr-2" />
        {labels.apple}
      </a>
    </Button>
    <Button variant="outline" className="w-full justify-start" asChild>
      <a href={links.outlook} target="_blank" rel="noreferrer">
        <Calendar className="w-4 h-4 mr-2" />
        {labels.outlook}
      </a>
    </Button>
    <Button variant="outline" className="w-full justify-start" onClick={onCopy}>
      <Copy className="w-4 h-4 mr-2" />
      {labels.copy_link}
    </Button>
    <p className="text-xs text-muted-foreground">{labels.subscription_hint}</p>
  </>
);

const CalendarSubscriptionLinks = ({ feedUrl }: { feedUrl: string }) => {
  const dict = useDictionary();
  const labels = dict.dialogs.ShareSyncTimetableDialog.links;
  const links = buildCalendarSubscriptionLinks(feedUrl, labels.calendar_name);

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(links.copy).then(() => {
      toast({
        title: labels.copied,
        description: labels.copied_description,
      });
    });
  };

  return (
    <CalendarSubscriptionLinkList
      links={links}
      labels={labels}
      onCopy={handleCopy}
    />
  );
};

export default CalendarSubscriptionLinks;
