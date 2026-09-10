import { lazy, Suspense } from "react";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useLocalStorage } from "usehooks-ts";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import { NextUpLine } from "@/components/Widgets/CountdownWidget";
import useDictionary from "@/dictionaries/useDictionary";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";

const CalendarPageDynamic = lazy(
  () => import("@/components/Calendar/CalendarPage"),
);
const WidgetGridDynamic = lazy(() => import("@/components/Widgets/WidgetGrid"));

const MobileCalendarUpcoming = () => {
  const dict = useDictionary();
  const { events, nextEvent } = useUpcomingEvents();

  return (
    <div className="space-y-3 px-3 pb-4 xl:hidden">
      <NextUpLine event={nextEvent} />
      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-base font-semibold">
          {dict.calendar.upcoming_events}
        </h2>
        <UpcomingEventList events={events} compact maxEvents={6} />
      </section>
    </div>
  );
};

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
        <MobileCalendarUpcoming />
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
