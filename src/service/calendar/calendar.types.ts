export type CalendarEvents = {
  [key: string]: CalendarEvent;
};

export type CalendarEvent = {
  id: string;
  title: string;
  rfcString: string;
};
