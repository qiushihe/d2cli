import { format } from "date-fns";
import { parse } from "date-fns";
import { differenceInDays } from "date-fns";
import { add as addDate } from "date-fns";
import { Duration } from "date-fns";
import { getDay } from "date-fns";
import { getDate as _getDate } from "date-fns";
import { getMonth as _getMonth } from "date-fns";
import { getYear as _getYear } from "date-fns";

import { clamp } from "~src/helper/number.helper";

// Determine if a year is a leap year:
// 1. If the year is evenly divisible by 4, go to step 2. Otherwise, go to step 5.
// 2. If the year is evenly divisible by 100, go to step 3. Otherwise, go to step 4.
// 3. If the year is evenly divisible by 400, go to step 4. Otherwise, go to step 5.
// 4. The year is a leap year (it has 366 days).
// 5. The year is not a leap year (it has 365 days).
// For more see:
// https://docs.microsoft.com/en-us/office/troubleshoot/excel/determine-a-leap-year
const step1 = (year: number): boolean => (year % 4 === 0 ? step2(year) : step5());
const step2 = (year: number): boolean => (year % 100 === 0 ? step3(year) : step4());
const step3 = (year: number): boolean => (year % 400 === 0 ? step4() : step5());
const step4 = (): boolean => true;
const step5 = (): boolean => false;
export const isLeapYear = (year: number): boolean => step1(year);

export const isLongMonth = (month: number) =>
  month === 1 ||
  month === 3 ||
  month === 5 ||
  month === 7 ||
  month === 8 ||
  month === 10 ||
  month === 12;

export const formatAlignedDateString = (dateString: string): string => {
  const date = new Date(dateString);
  const dateMonth = format(date, "MMM.");
  const dateDay = format(date, "do").padStart(4, " ");
  const dateYear = format(date, "yyyy");
  const dateTime = format(date, "hh:mmaaa");

  return `${dateMonth} ${dateDay} ${dateYear} - ${dateTime}`;
};

type ParseDateStringOptions = {
  clamp?: boolean;
};

export const parseDateString = (
  date: string,
  options?: ParseDateStringOptions
): [number, number, number] => {
  const parts = date.split("/", 3);

  const year = parseInt((parts[0] || "").replace(/^0*/, ""));
  const month = parseInt((parts[1] || "").replace(/^0*/, ""));
  const day = parseInt((parts[2] || "").replace(/^0*/, ""));

  if (options?.clamp) {
    return [
      clamp(year, 1, null),
      clamp(month, 1, 12),
      clamp(day, 1, month === 2 ? (isLeapYear(year) ? 29 : 28) : isLongMonth(month) ? 31 : 30)
    ];
  } else {
    return [year, month, day];
  }
};

export const getYear = (date: string): number => {
  return _getYear(parse(date, "yyyy-MM-dd", new Date()));
};

export const getMonth = (date: string): number => {
  return _getMonth(parse(date, "yyyy-MM-dd", new Date()));
};

export const getDate = (date: string): number => {
  return _getDate(parse(date, "yyyy-MM-dd", new Date()));
};

export const getWeekday = (date: string): number => {
  return getDay(parse(date, "yyyy-MM-dd", new Date()));
};

export const diffInDays = (lateDate: string, earlierDate: string): number => {
  try {
    return Math.floor(
      differenceInDays(
        parse(lateDate, "yyyy-MM-dd", new Date()),
        parse(earlierDate, "yyyy-MM-dd", new Date())
      )
    );
  } catch {
    return 0;
  }
};

export const isAfter = (lateDate: string, earlierDate: string): boolean => {
  if (lateDate === earlierDate) {
    return false;
  }

  const dates = [lateDate, earlierDate];
  dates.sort();

  return dates[0] === earlierDate;
};

export const add = (date: string, options: Duration): string => {
  const addedDate = addDate(parse(date, "yyyy-MM-dd", new Date()), options);

  // Use non-UTC getter methods because in this case we only care about what the YYYY-MM-DD values
  // are exactly as they appear in the local date.
  return [
    addedDate.getFullYear(),
    `${addedDate.getMonth() + 1}`.padStart(2, "0"),
    `${addedDate.getDate()}`.padStart(2, "0")
  ].join("-");
};

export const reduceDateRange = <TAccumulator>(
  from: string,
  to: string,
  iterator: (acc: TAccumulator, date: string) => TAccumulator,
  initialValue: TAccumulator
): TAccumulator => {
  let acc = initialValue;

  let date = from;
  while (true) {
    if (isAfter(date, to)) {
      break;
    }

    acc = iterator(acc, date);

    date = add(date, { days: 1 });
  }

  return acc;
};
