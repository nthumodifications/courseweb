import { apps } from "@/const/apps";
import useDictionary from "@/dictionaries/useDictionary";
import { Badge, cn } from "@courseweb/ui";
import useLaunchApp from "@/hooks/useLaunchApp";
import { activateOnKey } from "@/lib/activate-on-key";
import { hasReleaseActionForHref } from "@/components/Changelog/changelogLogic";
import { useUnseenRelease } from "@/components/Changelog/useUnseenRelease";

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const dict = useDictionary();
  const unseenRelease = useUnseenRelease();

  const [onItemClicked] = useLaunchApp(app);
  const isNew =
    unseenRelease !== undefined &&
    hasReleaseActionForHref(unseenRelease, app.href);

  return (
    <div
      className={cn(
        !mini
          ? "flex flex-row items-center gap-2 flex-1"
          : "flex flex-col items-start gap-1 py-4",
        "cursor-pointer",
      )}
      onClick={onItemClicked}
      onKeyDown={activateOnKey(() => onItemClicked())}
      role="button"
      tabIndex={0}
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <app.Icon size={24} />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex flex-row items-center gap-1 min-w-0">
          <h2
            className={cn("min-w-0 flex-1", !mini ? "font-medium" : "text-xs")}
          >
            {dict.applist.apps[app.id as keyof typeof dict.applist.apps]}
          </h2>
          {app.beta && (
            <Badge variant="secondary" className="shrink-0">
              {dict.applist.beta}
            </Badge>
          )}
          {isNew && (
            <Badge variant="secondary" className="shrink-0">
              {dict.changelog.new}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppItem;
