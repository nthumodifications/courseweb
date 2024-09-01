import { CalendarProvider } from "@/components/Calendar/calendar_hook";
import Calendar from "@/components/Calendar/Calendar";
import UpcomingEvents from "./UpcomingEvents";

const CalendarPage = () => {
  return (
    <CalendarProvider>
      <div className="px-4 md:pr-8 w-full">
        <div className="flex flex-row-reverse gap-6 h-full">
          <Calendar />
          <div className="hidden xl:inline">
            <UpcomingEvents />
          </div>
        </div>
      </div>
    </CalendarProvider>
  );
};

export default CalendarPage;
