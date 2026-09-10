import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { Calendar as ShadcnCalendar } from "@courseweb/ui";
import { ChevronDown } from "lucide-react";
import { getLocale } from "@/helpers/dateLocale";
import {
  formatTaipei,
  fromTaipeiCalendarDate,
  toTaipeiWallClock,
} from "@/helpers/dates";
import { useSettings } from "@/hooks/contexts/settings";

export const CalendarDateSelector = ({
  date,
  setDate,
}: {
  date: Date;
  setDate: (d: Date) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { language } = useSettings();

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    setOpen(false);
    setDate(fromTaipeiCalendarDate(d));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-lg md:text-xl font-semibold md:w-40 w-36 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {formatTaipei(date, "LLLL yyyy", { locale: getLocale(language) })}{" "}
          <ChevronDown className="inline size-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <ShadcnCalendar
          mode="single"
          selected={toTaipeiWallClock(date)}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
