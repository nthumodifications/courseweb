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
import { useRxCollection, useRxDB, useRxQuery } from "rxdb-hooks";
import { getDiffFunction, getActualEndDate } from "./calendar_utils";
import { subDays } from "date-fns";
import {
  serializeEvent,
  getDisplayEndDate,
} from "@/components/Calendar/calendar_utils";
import { EventDocType, TimetableSyncDocType } from "@/config/rxdb";
import { toast } from "@courseweb/ui";
import { replicateRxCollection } from "rxdb/plugins/replication";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";
import { RxCollection, WithDeleted } from "rxdb";

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
  const auth = useAuth();

  useEffect(() => {
    if (!eventsCol) return;
    if (!auth.isAuthenticated) return;
    const replicationState = replicateRxCollection<
      EventDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: eventsCol as RxCollection<EventDocType>,
      replicationIdentifier: "events-to-auth-calendar",
      live: true,
      push: {
        async handler(changeRows) {
          const rawResponse =
            await authClient.api.replication.events.push.$post(
              {
                json: changeRows,
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
          const conflictsArray = await rawResponse.json();
          return conflictsArray as WithDeleted<EventDocType>[];
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const id = lastPulledCheckpoint ? lastPulledCheckpoint.id : "";
          const response = await authClient.api.replication.events.pull.$get(
            {
              query: {
                id,
                serverTimestamp: serverTimestamp,
                batchSize: batchSize.toString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );
          const data = await response.json();
          return {
            documents: data.documents as WithDeleted<EventDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });
    replicationState.error$.subscribe((error) => console.error(error));
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[events] Initial replication done");
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, eventsCol]);

  const timetableSyncCol = useRxCollection("timetablesync");

  useEffect(() => {
    if (!timetableSyncCol) return;
    if (!auth.isAuthenticated) return;
    const replicationState = replicateRxCollection<
      TimetableSyncDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: timetableSyncCol as RxCollection<TimetableSyncDocType>,
      replicationIdentifier: "timetablesync-to-auth-calendar",
      live: true,
      push: {
        async handler(changeRows) {
          const rawResponse =
            await authClient.api.replication.timetablesync.push.$post(
              {
                json: changeRows,
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
          const conflictsArray =
            (await rawResponse.json()) as WithDeleted<TimetableSyncDocType>[];
          return conflictsArray;
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const id = lastPulledCheckpoint ? lastPulledCheckpoint.id : "";
          const response =
            await authClient.api.replication.timetablesync.pull.$get(
              {
                query: {
                  id,
                  serverTimestamp: serverTimestamp,
                  batchSize: batchSize.toString(),
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
          const data = await response.json();
          return {
            documents: data.documents as WithDeleted<TimetableSyncDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });
    replicationState.error$.subscribe((error) => console.error(error));
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[events] Initial replication done");
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, timetableSyncCol]);

  const { result: eventStore } = useRxQuery(eventsCol?.find());
  const events =
    useMemo(() => {
      return eventStore.map((e) => {
        const event = e.toJSON() as Required<EventDocType>;
        return {
          ...event,
          isAllDay: (event as any).allDay ?? false,
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
            $set: serializeEvent({
              actualEnd: getDisplayEndDate(event),
              excludedDates: [
                ...(event.excludedDates || []),
                event.displayStart,
              ],
            }),
          });
          break;
        case UpdateType.FOLLOWING:
          //set the repeat end date to the new event start date
          const { displayStart, displayEnd, ...originalEvent } = event;
          const newEvent: CalendarEvent = {
            ...originalEvent,
            repeat: {
              ...event.repeat!,
              value: subDays(displayStart, 1).getTime(),
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
    } else if (!oldEvent.repeat && newEvent.repeat) {
      // Handle transition from non-repeated to repeated event
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
          await eventsCol!.findOne(newEvent.id).update({
            $set: {
              ...serializeEvent(newEvent),
              actualEnd: getActualEndDate(newEvent),
            },
          });
          break;
      }
    } else if (oldEvent.repeat && !newEvent.repeat) {
      // Handle transition from repeated to non-repeated event
      await eventsCol!.findOne(newEvent.id).update({
        $set: {
          ...serializeEvent(newEvent),
          actualEnd: getActualEndDate(newEvent),
        },
      });
      return;
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
