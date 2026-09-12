import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { apps } from "@/const/apps";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

interface PinnedAppsWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const PinnedAppsWidget: FC<PinnedAppsWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { language, pinnedApps } = useSettings();
  const dict = useDictionary();
  const navigate = useNavigate();

  const title = dict.widgets.pinned_title;

  const pinnedAppDefs = apps.filter((app) => pinnedApps.includes(app.id));

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div>
        {pinnedAppDefs.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title={dict.widgets.pinned_title}
            description={dict.widgets.pinned_empty}
            size="sm"
          />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {pinnedAppDefs.map((app) => (
              <button
                key={app.id}
                onClick={() => navigate(`/${language}${app.href}`)}
                type="button"
                className="flex min-h-10 flex-col items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <app.Icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-center text-xs leading-tight text-muted-foreground">
                  {language === "zh" ? app.title_zh : app.title_en}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default PinnedAppsWidget;
