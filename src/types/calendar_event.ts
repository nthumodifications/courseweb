export type CalendarApiResponse = {
  summary: string;
  start: {
    date: string;
  };
};

export type EventData = {
  summary: string;
  weekday: number;
};
