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
import { useRxCollection, useRxQuery } from "rxdb-hooks";
import { getDiffFunction, getActualEndDate } from "./calendar_utils";
import { subDays } from "date-fns";
import {
  serializeEvent,
  getDisplayEndDate,
} from "@/components/Calendar/calendar_utils";
import {
  EventDocType,
  getCalendarDatabaseName,
  hasCalendarScope,
  migrateEventToV2,
  TimetableSyncDocType,
} from "@/config/rxdb";
import { Badge, toast } from "@courseweb/ui";
import { replicateRxCollection } from "rxdb/plugins/replication";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";
import { RxCollection, WithDeleted } from "rxdb";
import useDictionary from "@/dictionaries/useDictionary";

export type CalendarReplicationStatus =
  | "idle"
  | "syncing"
  | "error"
  | "not-authorised";

export const isNotAuthorisedReplicationError = (error: unknown) => {
  const seen = new WeakSet<object>();
  const visit = (value: unknown): boolean => {
    if (typeof value === "string") {
      return /\b(?:401|403)\b|unauthori[sz]ed|forbidden/i.test(value);
    }
    if (typeof value !== "object" || value === null) return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if ("status" in value) {
      const status = (value as { status?: unknown }).status;
      if (status === 401 || status === 403) return true;
    }
    if (value instanceof Error && visit(value.message)) return true;
    return Object.values(value).some(visit);
  };

  return visit(error);
};

const replicationErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const combinedReplicationStatus = (
  eventStatus: CalendarReplicationStatus,
  timetableStatus: CalendarReplicationStatus,
) => {
  if (
    eventStatus === "not-authorised" ||
    timetableStatus === "not-authorised"
  ) {
    return "not-authorised" as const;
  }
  if (eventStatus === "error" || timetableStatus === "error") {
    return "error" as const;
  }
  if (eventStatus === "syncing" || timetableStatus === "syncing") {
    return "syncing" as const;
  }
  return "idle" as const;
};

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
  timetableSyncReady: false,
  replicationStatus: "idle",
  replicationError: null,
  replicationIsLocalOnly: true,
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
  const [timetableSyncReady, setTimetableSyncReady] = useState(false);
  const eventsCol = useRxCollection("events");
  const auth = useAuth();
  const subject = auth.isAuthenticated ? auth.user?.profile.sub : undefined;
  const accessToken = auth.user?.access_token;
  const hasScope = hasCalendarScope(auth.user?.scope);
  const [eventReplicationStatus, setEventReplicationStatus] =
    useState<CalendarReplicationStatus>("idle");
  const [timetableReplicationStatus, setTimetableReplicationStatus] =
    useState<CalendarReplicationStatus>("idle");
  const [eventReplicationError, setEventReplicationError] = useState<
    string | null
  >(null);
  const [timetableReplicationError, setTimetableReplicationError] = useState<
    string | null
  >(null);

  const replicationStatus = combinedReplicationStatus(
    eventReplicationStatus,
    timetableReplicationStatus,
  );
  const replicationError = eventReplicationError ?? timetableReplicationError;
  const replicationIsLocalOnly = !auth.isAuthenticated || !subject;

  useEffect(() => {
    if (!eventsCol) return;
    if (!auth.isAuthenticated || !subject) {
      setEventReplicationStatus("idle");
      setEventReplicationError(null);
      return;
    }
    if (!hasScope || !accessToken) {
      setEventReplicationStatus(hasScope ? "idle" : "not-authorised");
      setEventReplicationError(null);
      return;
    }

    let active = true;
    let isActive = false;
    let hasError = false;
    let isNotAuthorised = false;
    const setStatus = (status: CalendarReplicationStatus) => {
      if (active) setEventReplicationStatus(status);
    };
    const handleError = (error: unknown) => {
      if (!active) return;
      isNotAuthorised = isNotAuthorisedReplicationError(error);
      hasError = !isNotAuthorised;
      setEventReplicationError(
        isNotAuthorised ? null : replicationErrorMessage(error),
      );
      setStatus(isNotAuthorised ? "not-authorised" : "error");
    };

    const replicationState = replicateRxCollection<
      EventDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: eventsCol as RxCollection<EventDocType>,
      replicationIdentifier: `events-to-auth-calendar-${getCalendarDatabaseName(subject)}`,
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
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
          if (!rawResponse.ok) {
            throw new Error(
              `Calendar event push failed with status ${rawResponse.status}`,
            );
          }
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
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          if (!response.ok) {
            throw new Error(
              `Calendar event pull failed with status ${response.status}`,
            );
          }
          const data = await response.json();
          const documents = data.documents as WithDeleted<EventDocType>[];
          return {
            documents: documents.map((document) =>
              migrateEventToV2(document as Record<string, any>),
            ) as WithDeleted<EventDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });
    const subscriptions = [
      replicationState.active$.subscribe((nextActive) => {
        isActive = nextActive;
        if (hasError || isNotAuthorised) return;
        setStatus(nextActive ? "syncing" : "idle");
      }),
      replicationState.error$.subscribe(handleError),
      replicationState.received$.subscribe(() => {
        hasError = false;
        isNotAuthorised = false;
        setEventReplicationError(null);
        setStatus(isActive ? "syncing" : "idle");
      }),
      replicationState.sent$.subscribe(() => {
        hasError = false;
        isNotAuthorised = false;
        setEventReplicationError(null);
        setStatus(isActive ? "syncing" : "idle");
      }),
    ];
    setStatus("syncing");
    void replicationState.start().catch(handleError);

    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      void replicationState.cancel();
    };
  }, [accessToken, auth.isAuthenticated, eventsCol, hasScope, subject]);

  const timetableSyncCol = useRxCollection("timetablesync");

  useEffect(() => {
    if (!timetableSyncCol) return;
    if (!auth.isAuthenticated || !subject) {
      setTimetableReplicationStatus("idle");
      setTimetableReplicationError(null);
      setTimetableSyncReady(true);
      return;
    }
    if (!hasScope || !accessToken) {
      setTimetableReplicationStatus(hasScope ? "idle" : "not-authorised");
      setTimetableReplicationError(null);
      setTimetableSyncReady(true);
      return;
    }

    let active = true;
    let isActive = false;
    let hasError = false;
    let isNotAuthorised = false;
    const setStatus = (status: CalendarReplicationStatus) => {
      if (active) setTimetableReplicationStatus(status);
    };
    const handleError = (error: unknown) => {
      if (!active) return;
      isNotAuthorised = isNotAuthorisedReplicationError(error);
      hasError = !isNotAuthorised;
      setTimetableReplicationError(
        isNotAuthorised ? null : replicationErrorMessage(error),
      );
      setStatus(isNotAuthorised ? "not-authorised" : "error");
    };

    setTimetableSyncReady(false);
    setStatus("syncing");
    const replicationState = replicateRxCollection<
      TimetableSyncDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: timetableSyncCol as RxCollection<TimetableSyncDocType>,
      replicationIdentifier: `timetablesync-to-auth-calendar-${getCalendarDatabaseName(subject)}`,
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
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
          if (!rawResponse.ok) {
            throw new Error(
              `Timetable sync push failed with status ${rawResponse.status}`,
            );
          }
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
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
          if (!response.ok) {
            throw new Error(
              `Timetable sync pull failed with status ${response.status}`,
            );
          }
          const data = await response.json();
          return {
            documents: data.documents as WithDeleted<TimetableSyncDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });
    const subscriptions = [
      replicationState.active$.subscribe((nextActive) => {
        isActive = nextActive;
        if (hasError || isNotAuthorised) return;
        setStatus(nextActive ? "syncing" : "idle");
      }),
      replicationState.error$.subscribe(handleError),
      replicationState.received$.subscribe(() => {
        hasError = false;
        isNotAuthorised = false;
        setTimetableReplicationError(null);
        setStatus(isActive ? "syncing" : "idle");
      }),
      replicationState.sent$.subscribe(() => {
        hasError = false;
        isNotAuthorised = false;
        setTimetableReplicationError(null);
        setStatus(isActive ? "syncing" : "idle");
      }),
    ];
    setStatus("syncing");
    void replicationState.start().catch(handleError);
    void replicationState
      .awaitInitialReplication()
      .then(() => {
        if (active) setTimetableSyncReady(true);
      })
      .catch(handleError);

    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      void replicationState.cancel();
    };
  }, [accessToken, auth.isAuthenticated, hasScope, subject, timetableSyncCol]);

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

  const displayContainer = useRef<HTMLDivElement>(null);

  const addEvent = async (event: CalendarEvent) => {
    if (!eventsCol) return;
    await eventsCol.upsert({
      ...event,
      courseId: event.courseId ?? null,
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
                  operationEvent.displayStart,
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
            courseId: newEvent1.courseId ?? null,
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
              value: subDays(operationEvent.displayStart, 1).getTime(),
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
            courseId: newEvent3.courseId ?? null,
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
    timetableSyncReady,
    replicationStatus,
    replicationError,
    replicationIsLocalOnly,
  };
};

const CalendarReplicationIndicator = ({
  status,
  isLocalOnly,
  hasLocalEvents,
}: {
  status: CalendarReplicationStatus;
  isLocalOnly: boolean;
  hasLocalEvents: boolean;
}) => {
  const dict = useDictionary();
  if (isLocalOnly && !hasLocalEvents) return null;

  const message = isLocalOnly
    ? dict.calendar.replication.local_only
    : status === "syncing"
      ? dict.calendar.replication.syncing
      : status === "error"
        ? dict.calendar.replication.error
        : status === "not-authorised"
          ? dict.calendar.replication.not_authorised
          : null;

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40">
      <Badge
        variant={
          status === "error" || status === "not-authorised"
            ? "destructive"
            : "outline"
        }
        role="status"
        aria-live="polite"
        className="bg-background/95 shadow-sm"
      >
        {message}
      </Badge>
    </div>
  );
};

export const CalendarProvider: FC<PropsWithChildren> = ({ children }) => {
  const value = useCalendarProvider();
  return (
    <calendarContext.Provider value={value}>
      <CalendarReplicationIndicator
        status={value.replicationStatus}
        isLocalOnly={value.replicationIsLocalOnly}
        hasLocalEvents={value.events.length > 0}
      />
      {children}
    </calendarContext.Provider>
  );
};
