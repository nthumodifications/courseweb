"use client";
import { apps, categories } from "@/const/apps";
import { Settings, Star } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import AppItem from "./AppItem";

const AppList = () => {
  const dict = useDictionary();
  const { language, pinnedApps, toggleApp } = useSettings();

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
