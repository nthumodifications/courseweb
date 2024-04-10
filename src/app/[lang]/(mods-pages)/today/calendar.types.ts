export interface RepeatDefinition {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
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
    tag: string | 'none';
}

export interface CalendarEventInternal extends CalendarEvent {
    displayEnd: Date | null; // actual end of the event, used to determine repeating events
}