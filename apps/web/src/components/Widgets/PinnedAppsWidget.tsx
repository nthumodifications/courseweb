import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { apps } from "@/const/apps";
import { LayoutGrid } from "lucide-react";
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
      <div className="p-3">
        {pinnedAppDefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <LayoutGrid className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {dict.applist.pinned_widget_empty}
            </p>
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
