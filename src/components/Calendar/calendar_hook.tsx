"use client";
import {
  useContext,
  createContext,
  FC,
  PropsWithChildren,
  useRef,
  useMemo,
  useState,
  useEffect,
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
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firebaseConfig, db as firebaseDb } from "@/config/firebase";
import { replicateFirestore } from "rxdb/plugins/replication-firestore";
import { collection, where } from "firebase/firestore";
import { toast } from "../ui/use-toast";

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
  labels: [],
});

export const useCalendar = () => useContext(calendarContext);

export const useCalendarProvider = () => {
  const [HOUR_HEIGHT] = useState(48);
  const [labels] = useState([
    "Event",
    "Course",
    "Meeting",
    "Assignment",
    "Exam",
    "Holiday",
    "Birthday",
    "Anniversary",
  ]);
  const eventsCol = useRxCollection("events");

  // setup firestore replication
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (!user) return;
    if (!eventsCol) return;
    const replicationState = replicateFirestore({
      replicationIdentifier: "events-to-firestore",
      collection: eventsCol,
      firestore: {
        projectId: firebaseConfig.projectId,
        database: firebaseDb,
        collection: collection(firebaseDb, "users", user.uid, "events"),
      },
      pull: {},
      push: {},
      live: true,
      serverTimestampField: "serverTimestamp",
      autoStart: true,
    });
    // emits all errors that happen when running the push- & pull-handlers.
    replicationState.error$.subscribe((error) => console.error(error));
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("Initial replication done");
    });
    return () => {
      replicationState.cancel();
      replicationState.remove();
    };
  }, [user, eventsCol]);

  const { result: eventStore } = useRxQuery(eventsCol?.find());
  const events =
    useMemo(() => {
      return eventStore.map((e) => {
        const event = e.toJSON() as Required<EventDocType>;
        return {
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          repeat: event.repeat,
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
      repeat: event.repeat,
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
              mode: "date" as const,
              value: subDays(operationEvent.start, 1).getTime(),
            },
          };
          await eventsCol!.findOne(newEvent.id).update({
            $set: {
              ...serializeEvent(newEvent2),
              actualEnd: getActualEndDate(newEvent2),
            },
          });
          let newEvent3;
          if (oldEvent.repeat.mode == "count") {
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
                value: oldEvent.repeat.value - x,
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
    labels,
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
