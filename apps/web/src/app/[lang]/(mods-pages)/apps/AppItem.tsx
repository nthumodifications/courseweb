import { apps } from "@/const/apps";
import useDictionary from "@/dictionaries/useDictionary";
import { Badge, cn } from "@courseweb/ui";
import useLaunchApp from "@/hooks/useLaunchApp";

export const AppIcon = ({ app }: { app: (typeof apps)[number] }) => {
  const dict = useDictionary();

  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted text-foreground">
        <app.Icon size={24} />
      </div>
      {app.beta && (
        <Badge
          variant="outline"
          className="shrink-0 px-1 py-0 text-xs"
        >
          {dict.applist.beta}
        </Badge>
      )}
    </div>
  );
};

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const dict = useDictionary();

  const [onItemClicked] = useLaunchApp(app);
  const appTitles = dict.applist.apps as Record<string, string>;
  const title = appTitles[app.id] ?? "";

  return (
    <button
      type="button"
      className={cn(
        !mini
          ? "flex flex-1 flex-row items-center gap-2 text-left"
          : "flex flex-col items-center gap-1 p-2",
        "min-w-0 rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      onClick={onItemClicked}
    >
      <AppIcon app={app} />
      <div className="min-w-0 flex flex-col">
        <h2
          className={cn(
            !mini ? "font-medium" : "max-w-20 text-center text-xs",
          )}
        >
          {title}
        </h2>
      </div>
    </button>
  );
};

export default AppItem;
