import { apps } from "@/const/apps";
import { ExternalLink } from "lucide-react";
import React, { useMemo } from "react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { useSettings } from "@/hooks/contexts/settings";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { event } from "@/lib/gtag";

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const { language } = useSettings();
  const { ais, getACIXSTORE } = useHeadlessAIS();
  const router = useRouter();
  const dict = useDictionary();
  const [aisLoading, setAisLoading] = React.useState(false);

  const onItemClicked = useCallback(async () => {
    event({
      action: "open_app",
      category: "app",
      label: "open_app_" + app.id,
    });
    if (app.ais) {
      if (!ais.enabled) {
        toast({ title: dict.ccxp.not_logged_in_error });
        return;
      }

      setAisLoading(true);
      try {
        const token = await getACIXSTORE();
        if (!token) {
          setAisLoading(false);
          return;
        }

        // if starts with http, open in new tab
        if (app.href.startsWith("https://www.ccxp.nthu.edu.tw")) {
          // Redirect user
          const redirect_url = app.href + `?ACIXSTORE=${token}`;
          console.log(redirect_url);
          const link = document.createElement("a");
          link.href = redirect_url;
          link.target = "_blank";
          link.click();
        } else {
          router.push(app.href);
        }
      } catch (e) {
        console.error("Failed to get ACIXSTORE", e);
      } finally {
        setAisLoading(false);
      }
    } else {
      router.push(app.href);
    }
  }, [router, app, ais, getACIXSTORE, dict]);

  const isEnabled = useMemo(
    () => (app.ais && ais.enabled) || !app.ais,
    [app, ais],
  );

  const handleDialogStateChange = () => {
    setAisLoading(false);
  };

  return (
    <div
      className={cn(
        !mini
          ? "flex flex-row items-center space-x-2 flex-1"
          : "flex flex-col items-center space-y-1",
        isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-30",
      )}
      onClick={onItemClicked}
    >
      <div className="p-2 rounded-lg bg-nthu-100 text-nthu-800 grid place-items-center">
        <app.Icon size={24} />
      </div>
      <div className="flex flex-col">
        <h2
          className={cn(!mini ? "font-medium" : "text-xs max-w-20 text-center")}
        >
          {language == "zh" ? app.title_zh : app.title_en}
        </h2>
        {!mini && app.href.startsWith("https://www.ccxp.nthu.edu.tw") && (
          <h3 className="text-xs text-muted-foreground">
            <ExternalLink size={12} className="inline" /> {dict.applist.to_ccxp}
          </h3>
        )}
      </div>
      <Dialog
        open={aisLoading}
        modal={true}
        onOpenChange={handleDialogStateChange}
      >
        <DialogContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex flex-col space-y-4 items-center">
              {/* <div className='animate-spin rounded-full h-16 w-16 border-2 border-gray-900'></div> */}
              <svg
                className="animate-spin h-14 w-14 text-gray-900 dark:text-gray-100"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-0"
                  cx="12"
                  cy="12"
                  r="12"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              <p className="text-gray-700 dark:text-gray-500">
                {dict.ccxp.logging_in_please_wait}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppItem;
