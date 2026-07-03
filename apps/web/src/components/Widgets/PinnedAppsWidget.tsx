import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { apps } from "@/const/apps";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

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
  const navigate = useNavigate();

  const title = language === "zh" ? "快速連結" : "Quick Links";

  const pinnedAppDefs = apps.filter((app) => pinnedApps.includes(app.id));

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-3">
        {pinnedAppDefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <LayoutGrid className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {language === "zh"
                ? "前往應用程式頁面釘選捷徑"
                : "Pin shortcuts from the Apps page"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {pinnedAppDefs.map((app) => (
              <button
                key={app.id}
                onClick={() => navigate(`/${language}${app.href}`)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <app.Icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-center text-muted-foreground leading-tight">
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
