import { TimeSlot } from "@/types/timetable";

export const scheduleTimeSlots: TimeSlot[] = [
  { time: "1", start: "08:00", end: "08:50" },
  { time: "2", start: "09:00", end: "09:50" },
  { time: "3", start: "10:10", end: "11:00" },
  { time: "4", start: "11:10", end: "12:00" },
  { time: "n", start: "12:10", end: "13:00" },
  { time: "5", start: "13:20", end: "14:10" },
  { time: "6", start: "14:20", end: "15:10" },
  { time: "7", start: "15:30", end: "16:20" },
  { time: "8", start: "16:30", end: "17:20" },
  { time: "9", start: "17:30", end: "18:20" },
  { time: "a", start: "18:30", end: "19:20" },
  { time: "b", start: "19:30", end: "20:20" },
  { time: "c", start: "20:30", end: "21:20" },
];

export const parseSlotTime = (time: string): [number, number] => {
  const [hour, minute] = time.split(":").map((t) => parseInt(t));
  return [hour, minute];
};
