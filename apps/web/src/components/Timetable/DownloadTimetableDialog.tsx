import useDictionary from "@/dictionaries/useDictionary";
import { Download, Image, Loader2 } from "lucide-react";
import Timetable from "./Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { toPng } from "html-to-image";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { createTimetableFromCoursesAndCustomItems } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";

const DownloadTimetableComponent = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const {
    getSemesterCourses,
    getSemesterCustomItems,
    semester,
    colorMap,
    currentColors,
  } =
    useUserTimetable();
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);

  const timetableData = createTimetableFromCoursesAndCustomItems(
    getSemesterCourses(semester) as MinimalCourse[],
    getSemesterCustomItems(semester),
    colorMap,
  );

  const handleConvert = useCallback(() => {
    if (ref.current === null) {
      return;
    }
    setLoading(true);
    toPng(ref.current!, {
      cacheBust: true,
      pixelRatio: 3,
    })
      .then(async (dataUrl) => {
        setGeneratedImg(dataUrl);
        // Create a more user-friendly filename with current date
        const now = new Date();
        const dateStr = now
          .toLocaleDateString(language === "en" ? "en-US" : "zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "-");
        const timeStr = now
          .toLocaleTimeString(language === "en" ? "en-US" : "zh-TW", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(/:/g, "");
        const filename = `課表_${dateStr}_${timeStr}.png`;

        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.target = "_blank";

        // Try to trigger download
        try {
          link.click();
          // Show success toast
          toast({
            title: dict.dialogs.DownloadTimetableDialog.success_toast_title,
            description: dict.dialogs.DownloadTimetableDialog.success_toast_description.replace(
              "{filename}",
              filename,
            ),
          });
        } catch (downloadError) {
          console.error("Download failed:", downloadError);
          toast({
            title: dict.dialogs.DownloadTimetableDialog.download_error,
            description:
              dict.dialogs.DownloadTimetableDialog.download_error_description,
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        console.error("Image generation failed:", err);
        toast({
          title: dict.dialogs.DownloadTimetableDialog.download_error,
          description:
            dict.dialogs.DownloadTimetableDialog.download_error_description,
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ref, dict]);

  const handleClose = (v: boolean) => {
    if (!v) setGeneratedImg(null);
  };

  const handleCopy = () => {
    if (generatedImg === null) return;
    // base64 to blob
    const byteString = atob(generatedImg.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: "image/png" });

    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ])
        .then(() => {
          toast({
            title: dict.dialogs.DownloadTimetableDialog.copy_image_success,
            description:
              dict.dialogs.DownloadTimetableDialog.copy_image_success,
          });
        })
        .catch((err) => {
          console.error("Copy failed:", err);
          toast({
            title: dict.dialogs.DownloadTimetableDialog.copy_image_failed,
            description:
              dict.dialogs.DownloadTimetableDialog.copy_image_failed_description,
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: dict.dialogs.DownloadTimetableDialog.copy_image_unsupported,
        description:
          dict.dialogs.DownloadTimetableDialog.copy_image_unsupported_description,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button onClick={handleConvert} variant="outline" disabled={loading}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="w-4 h-4 mr-2" />{" "}
            {dict.dialogs.DownloadTimetableDialog.buttons.image}
          </>
        )}
      </Button>
      <div className="relative overflow-hidden">
        <div
          className="absolute h-[915px] w-[539px] px-2 pt-4 pb-8 grid place-items-center bg-background"
          ref={ref}
        >
          <div className="h-[915px] w-[414px]">
            <Timetable timetableData={timetableData} vertical />
          </div>
        </div>
      </div>
      <Dialog open={generatedImg !== null} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">
              {dict.dialogs.DownloadTimetableDialog.success_title}
            </DialogTitle>
            <DialogDescription>
              {dict.dialogs.DownloadTimetableDialog.success_description}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70dvh]">
            {generatedImg && (
              <img
                src={generatedImg}
                alt={dict.dialogs.DownloadTimetableDialog.image_alt}
                onClick={handleCopy}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                title={dict.dialogs.DownloadTimetableDialog.copy_image_title}
              />
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              <Image className="w-4 h-4 mr-2" />
              {dict.dialogs.DownloadTimetableDialog.copy_image}
            </Button>
            <Button
              onClick={() => handleClose(false)}
              variant="outline"
              className="flex-1"
            >
              {dict.dialogs.DownloadTimetableDialog.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DownloadTimetableDialog = ({
  icsfileLink,
  children,
}: {
  icsfileLink: string;
  children?: ReactNode;
}) => {
  const dict = useDictionary();

  const handleDownloadCalendar = async () => {
    const filename = `${new Date().toISOString()}_timetable.ics`;
    try {
      const res = await fetch(icsfileLink);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Calendar download failed:", err);
      toast({
        title: dict.dialogs.DownloadTimetableDialog.download_error,
        description:
          dict.dialogs.DownloadTimetableDialog.download_error_description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />{" "}
            {dict.timetable.actions.download}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dict.dialogs.DownloadTimetableDialog.title}
          </DialogTitle>
          <DialogDescription>
            {dict.dialogs.DownloadTimetableDialog.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button onClick={handleDownloadCalendar} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {dict.dialogs.DownloadTimetableDialog.buttons.ICS}
          </Button>
          <DownloadTimetableComponent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadTimetableDialog;
