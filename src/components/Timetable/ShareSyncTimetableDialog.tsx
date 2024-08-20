import { Calendar, Copy, Mail, Share } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import useDictionary from "@/dictionaries/useDictionary";
import { useEffect, useState } from "react";
import { addShortLink } from "@/lib/cloudflarekv";
import { toast } from "../ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

const ComponentSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4">
        <Skeleton className="flex-1 p-2 bg-gray-100 dark:bg-neutral-800 rounded-md w-[300px] h-[40px]" />
        <Skeleton className="w-[40px] h-[40px] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <Skeleton className="text-lg font-semibold w-[150px] h-[24px]" />
          <Skeleton className="p-2 bg-white rounded-md w-[100px] h-[100px]" />
        </div>
        <div className="flex flex-col space-y-2">
          <Skeleton className="text-lg font-semibold w-[150px] h-[24px]" />
          <Button variant="outline" disabled>
            <Skeleton className="w-[200px] h-[40px]" />
          </Button>
          <Button variant="outline" disabled>
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

  useEffect(() => {
    if (open) {
      addShortLink(shareLink).then((shortLink) => {
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
  }, [open]);

  const handleCopy = () => {
    if (link)
      navigator.clipboard.writeText(link).then(() => {
        toast({
          title: "Copied",
          description: "Link copied to clipboard",
        });
      });
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
                type="text"
                value={link}
                readOnly
                className="flex-1 p-2 bg-gray-100 dark:bg-neutral-800 rounded-md"
              />
              <Button onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">
                  {dict.dialogs.ShareSyncTimetableDialog["category:qr"]}
                </h3>
                <div className="p-2 bg-white  rounded-md w-min">
                  <QRCodeSVG value={link} />
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold">
                  {dict.dialogs.ShareSyncTimetableDialog["category:links"]}
                </h3>
                <Button variant="outline" asChild>
                  <Link
                    // Subject: Here is My Timetable, Body: My Timetable can be found on NTHUMODS at {shareLink}
                    href={`mailto:?subject=Here is My Timetable&body=My Timetable can be found on NTHUMODS at ${link}`}
                    target="_blank"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {dict.dialogs.ShareSyncTimetableDialog.links.email}
                  </Link>
                </Button>
                <Button variant="outline" asChild disabled>
                  <Link href={webcalLink} target="_blank">
                    <Calendar className="w-4 h-4 mr-2" /> Sync To Calendar
                  </Link>
                </Button>
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
