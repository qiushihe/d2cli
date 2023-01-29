import { getMonth } from "~src/helper/date-string.helper";
import { getDate } from "~src/helper/date-string.helper";
import { getWeekday } from "~src/helper/date-string.helper";
import { reduceDateRange } from "~src/helper/date-string.helper";

export enum RepeatMode {
  None = "None",
  Daily = "daily",
  Weekdays = "weekdays",
  Weekly = "weekly",
  Monthly = "monthly",
  Annual = "annual"
}

export enum Weekday {
  Sunday = "sunday",
  Monday = "monday",
  Tuesday = "tuesday",
  Wednesday = "wednesday",
  Thursday = "thursday",
  Friday = "friday",
  Saturday = "saturday"
}

export type OccurrenceOptions = {
  /**
   * Start date in string form. Must be formatted as YYYY-MM-DD.
   */
  startDate: string;

  /**
   * End date in string form. Must be formatted as YYYY-MM-DD.
   */
  endDate: string;

  repeatMode: RepeatMode;

  /**
   * Weekdays to repeat occurrences on. This option only has effect
   * with `repeatMode` is set to `RepeatMode.Weekdays`,
   */
  repeatWeekdays?: Weekday[];

  /**
   * Optional end date in string form. Must be formatted as YYYY-MM-DD.
   */
  repeatEndDate?: string;
};

const weekdayIndex = (weekday: Weekday): number =>
  [
    Weekday.Sunday,
    Weekday.Monday,
    Weekday.Tuesday,
    Weekday.Wednesday,
    Weekday.Thursday,
    Weekday.Friday,
    Weekday.Saturday
  ].indexOf(weekday);

export const getOccurrences = (options: OccurrenceOptions): [Error, null] | [null, string[]] => {
  if (!options.startDate) {
    return [new Error("Must provide start date"), null];
  }

  if (!options.endDate) {
    return [new Error("Must provide end date"), null];
  }

  if (options.repeatMode === RepeatMode.None) {
    return [null, [options.startDate]];
  }

  if (options.repeatMode === RepeatMode.Weekdays && (options.repeatWeekdays || []).length <= 0) {
    return [new Error("Must provide weekdays"), null];
  }

  const startDateMonth = getMonth(options.startDate);
  const startDateDate = getDate(options.startDate);
  const startDateWeekday = getWeekday(options.startDate);
  const repeatWeekdays =
    options.repeatMode === RepeatMode.Weekdays
      ? (options.repeatWeekdays || []).map(weekdayIndex)
      : [];

  return [
    null,
    reduceDateRange(
      options.startDate,
      options.endDate,
      (acc, date) => {
        if (options.repeatMode === RepeatMode.Daily) {
          return [...acc, date];
        } else if (options.repeatMode === RepeatMode.Weekdays) {
          if (date === options.startDate) {
            return [...acc, date];
          } else if (repeatWeekdays.includes(getWeekday(date))) {
            return [...acc, date];
          } else {
            return acc;
          }
        } else if (options.repeatMode === RepeatMode.Weekly) {
          if (date === options.startDate) {
            return [...acc, date];
          } else if (getWeekday(date) === startDateWeekday) {
            return [...acc, date];
          } else {
            return acc;
          }
        } else if (options.repeatMode === RepeatMode.Monthly) {
          if (date === options.startDate) {
            return [...acc, date];
          } else if (getDate(date) === startDateDate) {
            return [...acc, date];
          } else {
            return acc;
          }
        } else if (options.repeatMode === RepeatMode.Annual) {
          if (date === options.startDate) {
            return [...acc, date];
          } else if (getMonth(date) === startDateMonth && getDate(date) === startDateDate) {
            return [...acc, date];
          } else {
            return acc;
          }
        } else {
          return acc;
        }
      },
      [] as string[]
    )
  ];
};
