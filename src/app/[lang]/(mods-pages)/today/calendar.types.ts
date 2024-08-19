export interface RepeatDefinition {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
}

export interface RepeatByCount extends RepeatDefinition {
  count: number;
}

export interface RepeatByDate extends RepeatDefinition {
  date: Date;
}

export type Repeat = RepeatByCount | RepeatByDate | RepeatDefinition;

export interface CalendarEvent {
  id: string;
  title: string;
  details?: string;
  allDay: boolean;
  start: Date;
  end: Date;
  repeat: null | Repeat;
  color: string;
  tag: string | "none";
  excludedDates?: Date[];
  parentId?: string;
}

export interface CalendarEventInternal extends CalendarEvent {
  actualEnd: Date | null; // actual end of the event, used to determine repeating events
}

export interface DisplayCalendarEvent extends CalendarEventInternal {
  displayStart: Date;
  displayEnd: Date;
}
