import { format } from "date-fns";

export const formatAlignedDateString = (dateString: string): string => {
  const date = new Date(dateString);
  const dateMonth = format(date, "MMM.");
  const dateDay = format(date, "do").padStart(4, " ");
  const dateYear = format(date, "yyyy");
  const dateTime = format(date, "hh:mmaaa");

  return `${dateMonth} ${dateDay} ${dateYear} - ${dateTime}`;
};
