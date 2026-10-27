import { WidgetSection } from "@/app/[lang]/(mods-pages)/settings/WidgetSection";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

interface WidgetManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WidgetManagementPanel({
  open,
  onOpenChange,
}: WidgetManagementPanelProps) {
  const dict = useDictionary();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dict.settings.calendar.widget_dashboard.title}
      description={
        dict.settings.calendar.widget_dashboard.manage_widgets_description
      }
      drawerDismissible={false}
      contentClassName="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      <WidgetSection disableDrawerDrag />
    </ResponsiveDialog>
  );
}
