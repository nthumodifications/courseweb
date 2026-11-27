import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { apps } from "@/const/apps";
import useLaunchApp from "@/hooks/useLaunchApp";
import useDictionary from "@/dictionaries/useDictionary";

interface PinnedAppsWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const PinnedAppButton = ({
  app,
  label,
}: {
  app: (typeof apps)[number];
  label: string;
}) => {
  const [launchApp] = useLaunchApp(app);

  return (
    <button
      onClick={launchApp}
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
        <app.Icon className="w-5 h-5 text-foreground" />
      </div>
      <span className="text-xs text-center text-muted-foreground leading-tight">
        {label}
      </span>
    </button>
  );
};

const PinnedAppsWidget: FC<PinnedAppsWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { pinnedApps } = useSettings();
  const dict = useDictionary();

  const pinnedAppDefs = apps.filter((app) => pinnedApps.includes(app.id));

  return (
    <WidgetShell
      title={dict.applist.quick_links_title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="px-4 py-2">
        {pinnedAppDefs.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            {dict.applist.pinned_widget_empty}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {pinnedAppDefs.map((app) => (
              <PinnedAppButton
                key={app.id}
                app={app}
                label={
                  dict.applist.apps[app.id as keyof typeof dict.applist.apps]
                }
              />
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default PinnedAppsWidget;
