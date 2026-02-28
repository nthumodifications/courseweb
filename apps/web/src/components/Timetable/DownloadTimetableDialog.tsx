import useDictionary from "@/dictionaries/useDictionary";
import { Download, Image, Loader2 } from "lucide-react";
import Timetable from "./Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { toPng } from "html-to-image";
import { useCallback, useRef, useState } from "react";
import { createTimetableFromCourses } from "@/helpers/timetable";
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

const DownloadTimetableComponent = () => {
  const dict = useDictionary();
  const { getSemesterCourses, semester, colorMap, currentColors } =
    useUserTimetable();
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);

  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
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
          .toLocaleDateString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "-");
        const timeStr = now
          .toLocaleTimeString("zh-TW", {
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
            title: "下載成功",
            description: `課表圖片已下載為 ${filename}`,
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
            title: "複製成功",
            description: "已將課表圖片複製到剪貼板",
          });
        })
        .catch((err) => {
          console.error("Copy failed:", err);
          toast({
            title: "複製失敗",
            description: "無法複製到剪貼板，請手動儲存圖片",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "不支援複製功能",
        description: "您的瀏覽器不支援複製到剪貼板",
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
          className="absolute h-[915px] w-[539px] px-2 pt-4 pb-8 grid place-items-center bg-white dark:bg-background"
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
                alt="timetable"
                onClick={handleCopy}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                title="點擊複製到剪貼板"
              />
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              <Image className="w-4 h-4 mr-2" />
              複製到剪貼板
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

const DownloadTimetableDialog = ({ icsfileLink }: { icsfileLink: string }) => {
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
        <Button variant="outline">
          <Download className="w-4 h-4 mr-1" />{" "}
          {dict.timetable.actions.download}
        </Button>
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
