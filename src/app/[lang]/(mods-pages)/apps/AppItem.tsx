import { apps } from "@/const/apps";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import useLaunchApp from "@/hooks/useLaunchApp";

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const { language } = useSettings();
  const { ais } = useHeadlessAIS();
  const dict = useDictionary();

  const [onItemClicked, aisLoading, cancelLoading] = useLaunchApp(app);

  const isEnabled = useMemo(
    () => (app.ais && ais.enabled) || !app.ais,
    [app, ais],
  );

  const handleDialogStateChange = () => {
    cancelLoading();
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
