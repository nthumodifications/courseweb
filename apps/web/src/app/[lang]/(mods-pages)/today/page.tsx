"use client";
import { lazy, Suspense } from "react";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useLocalStorage } from "usehooks-ts";

const CalendarPageDynamic = lazy(
  () => import("@/components/Calendar/CalendarPage"),
);

const TodayPage = () => {
  const [useNewCalendar] = useLocalStorage("use_new_calendar", false);

  if (useNewCalendar) {
    return (
      <Suspense fallback={null}>
        <CalendarPageDynamic />
      </Suspense>
    );
  } else
    return (
      <div className="h-full grid grid-cols-1 md:grid-cols-[380px_auto] md:grid-rows-1">
        <TodaySchedule />
      </div>
    );
};

export default TodayPage;
