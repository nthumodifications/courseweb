"use client";
import { NextPage } from "next";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useLocalStorage } from "usehooks-ts";
import CalendarPage from "@/components/Calendar/CalendarPage";

const TodayPage: NextPage = () => {
  const [useNewCalendar] = useLocalStorage("use_new_calendar", false);

  if (useNewCalendar) {
    return <CalendarPage />;
  } else
    return (
      <div className="h-full grid grid-cols-1 md:grid-cols-[380px_auto] md:grid-rows-1">
        <TodaySchedule />
      </div>
    );
};

export default TodayPage;
