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
    title: string;
    details?: string;
    allDay: boolean;
    start: Date;
    end: Date;
    repeat: null | Repeat;
    color: string;
    tag: string | 'none';
}