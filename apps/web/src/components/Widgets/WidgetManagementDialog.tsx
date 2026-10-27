import { Suspense, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { lazyWithRetry } from "@/lib/chunk-recovery";

const WidgetManagementPanel = lazyWithRetry(
  () => import("./WidgetManagementPanel"),
);

export const WidgetManagementDialog = () => {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const dict = useDictionary();

  const handleOpen = () => {
    setHasOpened(true);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        aria-expanded={open}
        onClick={handleOpen}
      >
        {dict.settings.calendar.widget_dashboard.manage_widgets}
      </button>
      {hasOpened && (
        <Suspense fallback={null}>
          <WidgetManagementPanel open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
};
