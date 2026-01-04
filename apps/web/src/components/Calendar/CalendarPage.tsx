import Calendar from "@/components/Calendar/Calendar";
import UpcomingEvents from "./UpcomingEvents";
import { CalendarMigrationDialog } from "./CalendarMigrationDialog";

const CalendarPage = () => {
  return (
    <>
      <CalendarMigrationDialog />
      <div className="md:pr-8 w-full">
        <div className="flex flex-row-reverse gap-6 h-full">
          <Calendar />
          <div className="hidden xl:inline">
            <UpcomingEvents />
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
