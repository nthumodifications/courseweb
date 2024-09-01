"use server";
import { CalendarApiResponse, EventData } from "@/types/calendar_event";

export const getNTHUCalendar = async (startDate: Date, endDate: Date) => {
  const CLOUD_API = process.env.CALENDAR_API_KEY;
  const CALENDAR_API_URL = `https://www.googleapis.com/calendar/v3/calendars/nthu.acad%40gmail.com/events?key=${CLOUD_API}&timeMin=${startDate.toISOString().slice(0, 10)}T00:00:00Z&timeMax=${endDate.toISOString().slice(0, 10)}T00:00:00Z`;
  const res = await fetch(CALENDAR_API_URL);
  if (!res.ok) {
    throw new Error("Failed to fetch data " + res.status + (await res.text()));
  }
  const resJson = await res.json();
  if (resJson.success === false) {
    throw new Error("Failed to fetch data " + resJson.result);
  }
  const calendarDatas = resJson.items as CalendarApiResponse[];

  return calendarDatas.map((item) => {
    return {
      summary: item.summary,
      date: item.start.date,
      id: item.id,
    };
  }) as EventData[];
};
