import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { format } from "date-fns";

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
        <h2 className=" text-lg md:text-2xl font-semibold w-max">
          {format(date, "LLLL yyyy")}
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
