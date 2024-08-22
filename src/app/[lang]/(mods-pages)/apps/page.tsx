"use client";
import { apps, categories } from "@/const/apps";
import { ExternalLink, Settings, Star } from "lucide-react";
import React, { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { useSettings } from "@/hooks/contexts/settings";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const AppItem = ({ app }: { app: (typeof apps)[number] }) => {
  const { language } = useSettings();
  const { ais, getACIXSTORE } = useHeadlessAIS();
  const router = useRouter();
  const dict = useDictionary();
  const [aisLoading, setAisLoading] = React.useState(false);

  const onItemClicked = useCallback(async () => {
    if (app.ais) {
      if (!ais.enabled) {
        toast({ title: dict.ccxp.not_logged_in_error });
        return;
      }

      setAisLoading(true);
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
      setAisLoading(false);
    } else {
      router.push(app.href);
    }
  }, [router, app, ais, getACIXSTORE, dict]);

  return (
    <div
      className={cn(
        "flex flex-row items-center space-x-2 flex-1",
        (app.ais && ais.enabled) || !app.ais
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-30",
      )}
      onClick={onItemClicked}
    >
      <div className="p-2 rounded-lg bg-nthu-100 text-nthu-800 grid place-items-center">
        <app.Icon size={24} />
      </div>
      <div className="flex flex-col">
        <h2 className=" font-medium">
          {language == "zh" ? app.title_zh : app.title_en}
        </h2>
        {app.href.startsWith("https://www.ccxp.nthu.edu.tw") && (
          <h3 className="text-xs text-muted-foreground">
            <ExternalLink size={12} className="inline" /> {dict.applist.to_ccxp}
          </h3>
        )}
      </div>
      <Dialog open={aisLoading} modal={true}>
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

const AppList = () => {
  const dict = useDictionary();
  const { language, pinnedApps, toggleApp } = useSettings();
  const { ais } = useHeadlessAIS();

  return (
    <div className="h-full w-full px-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="flex flex-col p-4 rounded-md border border-border gap-4">
          <div className="flex flex-row items-center">
            <h1 className="font-bold text-muted-foreground flex-1">
              {dict.applist.pinned_apps_title}
            </h1>
            <Dialog>
              <DialogTrigger asChild>
                <Settings size={20} className="cursor-pointer" />
              </DialogTrigger>
              <DialogContent>
                <div className="flex flex-col gap-4">
                  <h1 className="font-bold text-muted-foreground">
                    {dict.applist.edit_pinned_apps_title}
                  </h1>
                  <ScrollArea className="max-h-[80dvh]">
                    <div className="flex flex-col gap-2">
                      {apps.map((app) => (
                        <div
                          key={app.id}
                          className="flex flex-row items-center space-x-2"
                        >
                          <div className="p-2 rounded-lg bg-nthu-100 text-nthu-800 grid place-items-center">
                            <app.Icon size={24} />
                          </div>
                          <div className="flex flex-col flex-1">
                            <h2 className=" font-medium">
                              {language == "zh" ? app.title_zh : app.title_en}
                            </h2>
                          </div>
                          <div className="flex flex-row items-center space-x-2 pr-4">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleApp(app.id)}
                            >
                              <Star
                                size={20}
                                className={cn(
                                  !pinnedApps.includes(app.id)
                                    ? ""
                                    : "fill-yellow-500 stroke-yellow-500",
                                )}
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {apps
              .filter((app) => pinnedApps.includes(app.id))
              .map((app) => (
                <AppItem key={app.id} app={app} />
              ))}
          </div>
          {pinnedApps.length == 0 && (
            <p className="text-muted-foreground text-center">
              {dict.applist.empty_pinned_apps_reminder}
            </p>
          )}
        </div>
        {Object.keys(categories).map((category) => (
          <div
            className="flex flex-col p-4 rounded-md border border-border gap-4"
            key={category}
          >
            <h1 className="font-bold text-muted-foreground">
              {categories[category][`title_${language}`]}
            </h1>
            <div className="grid md:grid-cols-2 gap-2">
              {apps
                .filter((m) => m.category === category)
                .map((app) => (
                  <AppItem key={app.id} app={app} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppList;
