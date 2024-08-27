"use client";
import {
  useContext,
  createContext,
  FC,
  PropsWithChildren,
  useRef,
  useMemo,
  useState,
} from "react";
import {
  CalendarEvent,
  CalendarEventInternal,
  DisplayCalendarEvent,
} from "@/components/Calendar/calendar.types";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useRxCollection, useRxDB, useRxQuery } from "rxdb-hooks";
import { getDiffFunction, getActualEndDate } from "./calendar_utils";
import { subDays } from "date-fns";
import { serializeEvent } from "@/components/Calendar/calendar_utils";
import { EventDocType } from "@/config/rxdb";

export enum UpdateType {
  THIS = "THIS",
  FOLLOWING = "FOLLOWING",
  ALL = "ALL",
}

export const calendarContext = createContext<
  ReturnType<typeof useCalendarProvider>
>({
  events: [],
  addEvent: async () => {},
  removeEvent: async () => {},
  updateEvent: async () => {},
  displayContainer: { current: null },
  HOUR_HEIGHT: 48,
});

export const useCalendar = () => useContext(calendarContext);

export const useCalendarProvider = () => {
  const [HOUR_HEIGHT] = useState(48);

  const db = useRxDB();
  const eventsCol = useRxCollection("events");
  const { result: eventStore } = useRxQuery(eventsCol?.find());
  const events =
    useMemo(() => {
      return eventStore.map((e) => {
        const event = e.toJSON() as Required<EventDocType>;
        return {
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          repeat: event.repeat
            ? {
                ...event.repeat,
                ...("date" in event.repeat
                  ? { date: new Date(event.repeat.date!) }
                  : {}),
              }
            : null,
          actualEnd: event.actualEnd ? new Date(event.actualEnd) : null,
          ...(event.excludedDates
            ? { excludedDates: event.excludedDates.map((d) => new Date(d)) }
            : {}),
        } as CalendarEventInternal;
      });
    }, [eventStore]) ?? [];

  const { courses, colorMap } = useUserTimetable();

  const displayContainer = useRef<HTMLDivElement>(null);

  const addEvent = async (event: CalendarEvent) => {
    await eventsCol!.upsert({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      repeat: event.repeat
        ? {
            ...event.repeat,
            ...("date" in event.repeat
              ? { date: event.repeat.date.toISOString() }
              : {}),
          }
        : null,
      actualEnd: getActualEndDate(event),
    });
  };

  const removeEvent = async (
    event: DisplayCalendarEvent,
    type?: UpdateType,
  ) => {
    if (!event.repeat) {
      await eventsCol!.findOne(event.id).remove();
      return;
    } else {
      console.log("remove event", event, type);
      switch (type) {
        case UpdateType.THIS:
          // add this date to excluded dates
          await eventsCol!.findOne(event.id).update({
            $set: {
              actualEnd: getActualEndDate(event),
              excludedDates: [
                ...(event.excludedDates || []),
                event.displayStart,
              ],
            },
          });
          break;
        case UpdateType.FOLLOWING:
          //set the repeat end date to the new event start date
          const newEvent = {
            ...event,
            repeat: {
              ...event.repeat!,
              count: undefined,
              date: subDays(event.displayStart, 1),
            },
          };
          await eventsCol!.findOne(event.id).update({
            $set: {
              ...serializeEvent(newEvent),
              actualEnd: getActualEndDate(newEvent),
            },
          });
          break;
        case UpdateType.ALL:
          //remove all events
          //@ts-ignore
          await eventsCol!.find({ selector: { parentId: event.id } }).remove();
          await eventsCol!.findOne(event.id).remove();
          break;
      }
    }
  };

  const updateEvent = async (
    newEvent: CalendarEvent,
    operationEvent: DisplayCalendarEvent,
    type?: UpdateType,
  ) => {
    console.log("update event", newEvent, type);
    const oldEvent = events.find((e) => e.id === newEvent.id);
    if (!oldEvent) return;
    if (!oldEvent.repeat && !newEvent.repeat) {
      await eventsCol!.findOne(newEvent.id).update({
        $set: {
          ...serializeEvent(newEvent),
          actualEnd: getActualEndDate(newEvent),
        },
      });
      return;
    } else if (oldEvent.repeat && newEvent.repeat) {
      switch (type) {
        case UpdateType.THIS:
          //add this event to the list of excluded dates
          await eventsCol!.findOne(newEvent.id).update({
            $set: {
              actualEnd: getActualEndDate(oldEvent),
              ...serializeEvent({
                excludedDates: [
                  ...(oldEvent.excludedDates || []),
                  operationEvent.start,
                ],
              }),
            },
          });
          const newEvent1 = {
            ...newEvent,
            id: newEvent.id + newEvent.start.toISOString(),
            parentId: newEvent.id,
            repeat: null,
          };
          await eventsCol!.insert({
            ...serializeEvent(newEvent1),
            actualEnd: getActualEndDate(newEvent1),
          });
          break;
        case UpdateType.FOLLOWING:
          //set the repeat end date to the new event start date
          const newEvent2 = {
            ...oldEvent,
            repeat: {
              ...oldEvent.repeat!,
              count: undefined,
              date: subDays(operationEvent.start, 1),
            },
          };
          await eventsCol!.findOne(newEvent.id).update({
            $set: {
              ...serializeEvent(newEvent2),
              actualEnd: getActualEndDate(newEvent2),
            },
          });
          let newEvent3;
          if ("count" in oldEvent.repeat) {
            //if oldEvent was using count, find how many counts to subtract
            //oldEvent.start => newEvent.start = x * interval
            const interval = oldEvent.repeat.interval || 1;
            const x = Math.floor(
              getDiffFunction(oldEvent.repeat.type)(
                newEvent.start,
                oldEvent.start,
              ) / interval,
            );
            newEvent3 = {
              ...newEvent,
              id: newEvent.id + newEvent.start.toISOString(),
              parentId: newEvent.id,
              repeat: {
                ...oldEvent.repeat,
                count: oldEvent.repeat.count - x,
              },
            };
          } else {
            newEvent3 = {
              ...newEvent,
              id: newEvent.id + newEvent.start.toISOString(),
              parentId: newEvent.id,
              repeat: oldEvent.repeat,
            };
          }
          await eventsCol!.insert({
            ...serializeEvent(newEvent3),
            actualEnd: getActualEndDate(newEvent3),
          });
          break;
        case UpdateType.ALL:
          //just update the event
          const newEvent4 = {
            ...newEvent,
            start: oldEvent.start,
            end: oldEvent.end,
          };
          await eventsCol!.findOne(newEvent.id).update({
            $set: {
              ...serializeEvent(newEvent4),
              actualEnd: getActualEndDate(newEvent4),
            },
          });
          break;
      }
    }
  };

  return {
    events,
    addEvent,
    removeEvent,
    updateEvent,
    displayContainer,
    HOUR_HEIGHT,
  };
};

export const CalendarProvider: FC<PropsWithChildren> = ({ children }) => {
  const value = useCalendarProvider();
  return (
    <calendarContext.Provider value={value}>
      {children}
    </calendarContext.Provider>
  );
};
