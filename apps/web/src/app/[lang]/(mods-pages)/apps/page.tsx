import { apps, categories } from "@/const/apps";
import { Settings, Star } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@courseweb/ui";
import { Dialog, DialogContent, DialogTrigger } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { Button, Badge } from "@courseweb/ui";
import AppItem from "./AppItem";
import SponsorshipBanner from "@/components/Sponsorship/SponsorshipBanner";

const AppList = () => {
  const dict = useDictionary();
  const { pinnedApps, toggleApp } = useSettings();

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 items-start">
        <div className="flex flex-col p-4 rounded-md border border-border gap-4">
          <div className="flex flex-row items-center gap-2">
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
                    <div className="flex flex-col divide-y divide-border">
                      {apps
                        .filter((a) => !a.hidden)
                        .map((app) => (
                          <div
                            key={app.id}
                            className="flex flex-row items-center gap-2 py-4"
                          >
                            <div className="p-2 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                              <app.Icon size={24} />
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="flex flex-row items-center gap-1">
                                <h2 className="font-medium min-w-0 flex-1">
                                  {
                                    dict.applist.apps[
                                      app.id as keyof typeof dict.applist.apps
                                    ]
                                  }
                                </h2>
                                {app.beta && (
                                  <Badge variant="secondary" className="shrink-0">
                                    {dict.applist.beta}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-row items-center gap-2 pr-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleApp(app.id)}
                              >
                                <Star
                                  size={20}
                                  className={cn(
                                    !pinnedApps.includes(app.id)
                                      ? "text-muted-foreground"
                                      : "fill-primary stroke-primary",
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {apps
              .filter((app) => pinnedApps.includes(app.id))
              .map((app) => (
                <AppItem key={app.id} app={app} />
              ))}
          </div>
          {pinnedApps.length == 0 && (
            <p data-nosnippet className="text-muted-foreground">
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
              {
                dict.applist.categories[
                  category as keyof typeof dict.applist.categories
                ]
              }
            </h1>
            <div className="grid grid-cols-1 gap-2">
              {apps
                .filter((a) => !a.hidden)
                .filter((m) => m.category === category)
                .map((app) => (
                  <AppItem key={app.id} app={app} />
                ))}
            </div>
          </div>
        ))}
        <SponsorshipBanner />
      </div>
    </div>
  );
};

export default AppList;
