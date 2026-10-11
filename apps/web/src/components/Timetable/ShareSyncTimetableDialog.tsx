import { Copy, Mail, Share } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import useDictionary from "@/dictionaries/useDictionary";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
  toast,
} from "@courseweb/ui";
import client from "@/config/api";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import CalendarSubscriptionLinks from "./CalendarSubscriptionLinks";

const ComponentSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4">
        <Skeleton className="flex-1 p-2 bg-muted rounded-md w-[300px] h-[40px]" />
        <Skeleton className="w-[40px] h-[40px] rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <Skeleton className="text-lg font-semibold w-[150px] h-[24px]" />
          <Skeleton className="p-2 bg-card rounded-md w-[100px] h-[100px]" />
        </div>
        <div className="flex flex-col space-y-2">
          <Skeleton className="text-lg font-semibold w-[150px] h-[24px]" />
          <Button variant="outline" className="w-full justify-start" disabled>
            <Skeleton className="w-[200px] h-[40px]" />
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Skeleton className="w-[200px] h-[40px]" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ShareSyncTimetableDialog = ({
  shareLink,
  webcalLink,
}: {
  shareLink: string;
  webcalLink: string;
}) => {
  const [open, setOpen] = useState(false);
  const dict = useDictionary();
  const [link, setLink] = useState<string | null>(null);
  const { customItems } = useUserTimetable();
  const shareLinkWithCustomItems = useMemo(() => {
    try {
      const url = new URL(shareLink);
      url.searchParams.set("customItems", JSON.stringify(customItems));
      return url.toString();
    } catch {
      return shareLink;
    }
  }, [customItems, shareLink]);

  useEffect(() => {
    if (open) {
      client.shortlink
        .$put({ query: { url: shareLinkWithCustomItems } })
        .then((res) => res.text())
        .then((shortLink) => {
          if (typeof shortLink == "object" && "error" in shortLink) {
            toast({
              title: "Short Link Error",
              description:
                "Failed to generate short link. Please try again later.",
            });
          }
          setLink(shortLink as string);
        });
    }
  }, [open, shareLinkWithCustomItems]);

  const handleCopy = (url: string | null) => {
    if (url)
      void navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({
            title: dict.dialogs.ShareSyncTimetableDialog.links.copied,
            description:
              dict.dialogs.ShareSyncTimetableDialog.links.copied_description,
          });
        })
        .catch(() => undefined);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share className="w-4 h-4 mr-1" /> {dict.timetable.actions.share}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dict.dialogs.ShareSyncTimetableDialog.title}
          </DialogTitle>
          <DialogDescription>
            {dict.dialogs.ShareSyncTimetableDialog.description}
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-4">
              <input
                aria-label="Link"
                type="text"
                value={link}
                readOnly
                className="flex-1 p-2 bg-muted rounded-md"
              />
              <Button
                onClick={() => handleCopy(link)}
                aria-label={
                  dict.dialogs.ShareSyncTimetableDialog.links.copy_link
                }
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">
                  {dict.dialogs.ShareSyncTimetableDialog["category:qr"]}
                </h3>
                <div className="p-2 bg-card  rounded-md w-min">
                  <QRCodeSVG value={link} />
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold">
                  {dict.dialogs.ShareSyncTimetableDialog["category:links"]}
                </h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    // Subject: Here is My Timetable, Body: My Timetable can be found on NTHUMODS at {shareLink}
                    href={`mailto:?subject=Here is My Timetable&body=My Timetable can be found on NTHUMODS at ${link}`}
                    target="_blank"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {dict.dialogs.ShareSyncTimetableDialog.links.email}
                  </a>
                </Button>
                <CalendarSubscriptionLinks feedUrl={webcalLink} />
              </div>
            </div>
          </div>
        ) : (
          <ComponentSkeleton />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareSyncTimetableDialog;
