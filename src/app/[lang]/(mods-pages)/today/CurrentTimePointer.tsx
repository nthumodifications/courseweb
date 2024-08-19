import { format } from "date-fns";
import useTime from "@/hooks/useTime";
import { useEffect } from "react";
import { useCalendar } from "./calendar_hook";

export const CurrentTimePointer = () => {
  const date = useTime();
  const { HOUR_HEIGHT, displayContainer } = useCalendar();

  useEffect(() => {
    //first load, scroll to current time
    if (date.getHours() < 8) return;
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    const currentOffset =
      currentHour * HOUR_HEIGHT + (currentMinute * HOUR_HEIGHT) / 60;
    displayContainer.current?.scrollTo({
      top: currentOffset - 200,
    });
  }, []);

  return (
    <div
      className="absolute -left-2 flex flex-row z-50 w-full items-center"
      style={{
        top:
          -8 +
          date.getHours() * HOUR_HEIGHT +
          (date.getMinutes() * HOUR_HEIGHT) / 60,
      }}
    >
      <span className="-left-11 absolute text-nthu-600 font-semibold shadow-sm text-sm">
        {format(date, "HH:mm")}
      </span>
      <div className="w-2 h-2 bg-nthu-600 rounded-full shadow-md"></div>
      <div className="flex-1 h-0 outline outline-1 outline-nthu-600 shadow-md"></div>
    </div>
  );
};
