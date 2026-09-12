import { apps, categories } from "@/const/apps";
import { Settings, Star } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@courseweb/ui";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  PageHeader,
  PageShell,
  ScrollArea,
} from "@courseweb/ui";
import AppItem, { AppIcon } from "./AppItem";

const AppList = () => {
  const dict = useDictionary();
  const { pinnedApps, toggleApp } = useSettings();
  const appTitles = dict.applist.apps as Record<string, string>;
  const categoryTitles = dict.applist.categories as Record<string, string>;

  return (
    <PageShell width="app">
      <PageHeader title={dict.applist.title} />
      <div className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Dialog>
          <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-row items-center">
              <h2 className="flex-1 text-base font-semibold">
                {dict.applist.pinned_apps_title}
              </h2>
              {pinnedApps.length > 0 && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={dict.applist.open_settings}
                    title={dict.applist.open_settings}
                  >
                    <Settings aria-hidden="true" />
                  </Button>
                </DialogTrigger>
              )}
            </div>

            <div className="grid flex-1 gap-2 md:grid-cols-2">
              {apps
                .filter((app) => pinnedApps.includes(app.id))
                .map((app) => (
                  <AppItem key={app.id} app={app} />
                ))}
            </div>

            {pinnedApps.length === 0 && (
              <EmptyState
                size="sm"
                icon={Star}
                title={dict.applist.empty_pinned_apps_title}
                description={dict.applist.empty_pinned_apps_description}
                action={
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Settings aria-hidden="true" />
                      {dict.applist.pin_apps}
                    </Button>
                  </DialogTrigger>
                }
              />
            )}
          </div>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.applist.edit_pinned_apps_title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80dvh]">
              <div className="flex flex-col gap-2">
                {apps
                  .filter((app) => !app.hidden)
                  .map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-row items-center gap-2"
                    >
                      <AppIcon app={app} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="font-medium">{appTitles[app.id]}</h3>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={appTitles[app.id]}
                        onClick={() => toggleApp(app.id)}
                      >
                        <Star
                          aria-hidden="true"
                          className={cn(
                            pinnedApps.includes(app.id) &&
                              "fill-primary stroke-primary",
                          )}
                        />
                      </Button>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {Object.keys(categories).map((category) => (
          <div
            className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4"
            key={category}
          >
            <h2 className="text-base font-semibold">
              {categoryTitles[category]}
            </h2>
            <div className="grid flex-1 gap-2 md:grid-cols-2">
              {apps
                .filter((app) => !app.hidden)
                .filter((app) => app.category === category)
                .map((app) => (
                  <AppItem key={app.id} app={app} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

export default AppList;
