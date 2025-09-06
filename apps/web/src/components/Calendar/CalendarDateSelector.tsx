import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { Calendar as ShadcnCalendar } from "@courseweb/ui";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";

export const CalendarDateSelector = ({
  date,
  setDate,
}: {
  date: Date;
  setDate: (d: Date) => void;
}) => {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (d: Date | undefined) => {
    setDate(d!);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <h2 className="text-lg md:text-xl font-semibold md:w-40 w-36 whitespace-nowrap">
          {format(date, "LLLL yyyy")} <ChevronDown className="inline size-3" />
        </h2>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <ShadcnCalendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
