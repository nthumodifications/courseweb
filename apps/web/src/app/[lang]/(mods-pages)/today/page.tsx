import { lazy, Suspense } from "react";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useLocalStorage } from "usehooks-ts";
import { PageHeader, PageShell } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const CalendarPageDynamic = lazy(
  () => import("@/components/Calendar/CalendarPage"),
);
const WidgetGridDynamic = lazy(() => import("@/components/Widgets/WidgetGrid"));

const TodayPage = () => {
  const dict = useDictionary();
  const [useNewCalendar] = useLocalStorage("use_new_calendar", false);
  const [useWidgetDashboard] = useLocalStorage("use_widget_dashboard", false);

  if (useWidgetDashboard) {
    return (
      <Suspense fallback={null}>
        <WidgetGridDynamic />
      </Suspense>
    );
  }

  if (useNewCalendar) {
    return (
      <Suspense fallback={null}>
        <CalendarPageDynamic />
      </Suspense>
    );
  }

  return (
    <PageShell width="app">
      <PageHeader title={dict.today.page_title} />
      <TodaySchedule />
    </PageShell>
  );
};

export default TodayPage;
