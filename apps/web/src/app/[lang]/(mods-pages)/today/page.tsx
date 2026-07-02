import { lazy, Suspense } from "react";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useLocalStorage } from "usehooks-ts";

const CalendarPageDynamic = lazy(
  () => import("@/components/Calendar/CalendarPage"),
);
const WidgetGridDynamic = lazy(() => import("@/components/Widgets/WidgetGrid"));

const TodayPage = () => {
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
    <div className="h-full grid grid-cols-1 md:grid-cols-[380px_auto] md:grid-rows-1">
      <TodaySchedule />
    </div>
  );
};

export default TodayPage;
