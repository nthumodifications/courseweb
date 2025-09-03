import { scheduleTimeSlots } from "@/const/timetable";
import { FC } from "react";

const TimeslotSelector: FC<{
  value: string[];
  onChange: (newvalue: string[]) => void;
}> = ({ value = [], onChange }) => {
  const days = ["M", "T", "W", "R", "F", "S"];

  const isSelected = (timecode: string) => {
    return value.includes(timecode);
  };

  const handleChange = (timecode: string) => () => {
    if (isSelected(timecode)) {
      onChange(value.filter((tc) => tc != timecode));
    } else {
      onChange([...value, timecode]);
    }
  };

  const handleSelectRow = (time: string) => () => {
    //check if anything is selected in this row
    const rowSelected = days.some((day) => isSelected(day + time));
    if (rowSelected) {
      onChange(value.filter((tc) => !days.some((day) => tc == day + time)));
    } else {
      onChange([...value, ...days.map((day) => day + time)]);
    }
  };

  const handleSelectColumn = (day: string) => () => {
    //check if anything is selected in this column
    const columnSelected = scheduleTimeSlots.some((timeSlot) =>
      isSelected(day + timeSlot.time),
    );
    if (columnSelected) {
      onChange(
        value.filter(
          (tc) =>
            !scheduleTimeSlots.some((timeSlot) => tc == day + timeSlot.time),
        ),
      );
    } else {
      onChange([
        ...value,
        ...scheduleTimeSlots.map((timeSlot) => day + timeSlot.time),
      ]);
    }
  };

  return (
    <div className="grid grid-cols-[repeat(7,24px)] grid-rows-[repeat(14,24px)] gap-1 text-center text-sm">
      <div className="w-4 h-4"></div>
      {days.map((day) => (
        <div
          key={day}
          className="rounded-md hover:bg-gray-100 dark:hover:bg-background cursor-pointer"
          onClick={handleSelectColumn(day)}
        >
          {day}
        </div>
      ))}
      {scheduleTimeSlots.map((timeSlot) => [
        <div
          key={timeSlot.time}
          className="rounded-md hover:bg-gray-100 dark:hover:bg-background cursor-pointer"
          onClick={handleSelectRow(timeSlot.time)}
        >
          {timeSlot.time}
        </div>,
        ...days
          .map((day) => (
            <div
              key={day + timeSlot.time}
              className={`${!isSelected(day + timeSlot.time) ? "bg-gray-200 hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-background" : "bg-gray-400 hover:bg-gray-300 dark:bg-neutral-600 dark:hover:bg-neutral-700"} transition-colors cursor-pointer`}
              onClick={handleChange(day + timeSlot.time)}
            ></div>
          ))
          .flat(),
      ])}
    </div>
  );
};

export default TimeslotSelector;
