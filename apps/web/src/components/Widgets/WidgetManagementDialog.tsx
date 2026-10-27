import { useState } from "react";
import { WidgetSection } from "@/app/[lang]/(mods-pages)/settings/WidgetSection";
import { ResponsiveDialog } from "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog";
import useDictionary from "@/dictionaries/useDictionary";

export const WidgetManagementDialog = () => {
  const dict = useDictionary();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {dict.settings.calendar.widget_dashboard.manage_widgets}
      </button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={dict.settings.calendar.widget_dashboard.title}
        contentClassName="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <WidgetSection />
      </ResponsiveDialog>
    </>
  );
};
