// {
//   kind: 'calendar#event',
//   etag: '"3424091776564000"',
//   id: '71karjaqkt5p002k4gnhrdbq7g',
//   status: 'confirmed',
//   htmlLink: 'https://www.google.com/calendar/event?eid=NzFrYXJqYXFrdDVwMDAyazRnbmhyZGJxN2cgbnRodS5hY2FkQG0',
//   created: '2024-04-02T07:14:49.000Z',
//   updated: '2024-04-02T08:18:08.282Z',
//   summary: '113學年度暑碩專班結束2024 Summer In-service Master Program Ends',
//   creator: [Object],
//   organizer: [Object],
//   start: [Object],
//   end: [Object],
//   transparency: 'transparent',
//   iCalUID: '71karjaqkt5p002k4gnhrdbq7g@google.com',
//   sequence: 0,
//   eventType: 'default'
// }
export type CalendarApiResponse = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  creator: unknown;
  organizer: unknown;
  start: { date: string };
  end: { date: string };
  transparency: string;
  iCalUID: string;
  sequence: number;
  eventType: string;
};

export type EventData = {
  summary: string;
  date: string;
  id: string;
};
