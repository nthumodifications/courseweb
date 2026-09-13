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
  const nonCourseEvents = events.filter((event) => event.source !== "class");

  if (events.length === 0) return null;

  return (
    <div className="space-y-4 px-4 pb-4 xl:hidden">
      <NextUpLine event={nextEvent} />
      {nonCourseEvents.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-2 text-base font-medium">
            {dict.calendar.upcoming_events}
          </h2>
          <UpcomingEventList events={nonCourseEvents} compact maxEvents={6} />
        </section>
      )}
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
    <div className="grid h-full w-full min-w-0 grid-cols-1">
      <TodaySchedule />
    </div>
  );
};

export default TodayPage;
