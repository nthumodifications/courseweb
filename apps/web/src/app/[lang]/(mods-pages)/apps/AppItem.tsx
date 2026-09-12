import { apps } from "@/const/apps";
import useDictionary from "@/dictionaries/useDictionary";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import useLaunchApp from "@/hooks/useLaunchApp";

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const dict = useDictionary();

  const [onItemClicked] = useLaunchApp(app);

  return (
    <div
      className={cn(
        !mini
          ? "flex flex-row items-center gap-2 flex-1 py-4"
          : "flex flex-col items-start gap-1 py-4",
        "cursor-pointer",
      )}
      onClick={onItemClicked}
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <app.Icon size={24} />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-row items-center gap-1">
          <h2 className={cn(!mini ? "font-medium" : "text-xs")}>
            {dict.applist.apps[app.id as keyof typeof dict.applist.apps]}
          </h2>
          {app.beta && <Badge variant="secondary">{dict.applist.beta}</Badge>}
        </div>
      </div>
    </div>
  );
};

export default AppItem;
