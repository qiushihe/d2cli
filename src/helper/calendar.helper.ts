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

const validateOptions = (options: OccurrenceOptions): Error | null => {
  if (!options.startDate) {
    return new Error("Must provide start date");
  }

  if (!options.endDate) {
    return new Error("Must provide end date");
  }

  if (options.repeatMode === RepeatMode.Weekdays && (options.repeatWeekdays || []).length <= 0) {
    return new Error("Must provide weekdays");
  }

  return null;
};

export const getOccurrences = (options: OccurrenceOptions): [Error, null] | [null, string[]] => {
  const optionsErr = validateOptions(options);
  if (optionsErr) {
    return [optionsErr, null];
  }

  if (options.repeatMode === RepeatMode.None) {
    return [null, [options.startDate]];
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

export const getAllOccurrences = async (
  allOptions: Record<string, OccurrenceOptions>
): Promise<[Error, null] | [null, Record<string, string[]>]> => {
  const allEntries = Object.entries(allOptions);
  const allPromises: Promise<[string, Error | null, string[]]>[] = [];

  for (let optionIndex = 0; optionIndex < allEntries.length; optionIndex++) {
    const entry = allEntries[optionIndex];
    const entryKey = entry[0];
    const entryOptions = entry[1];

    const optionsErr = validateOptions(entryOptions);
    if (optionsErr) {
      // Short-circuit the for-loop and the overall function on the first validation error.
      return [optionsErr, null];
    }

    // Not using `await` but instead pushing the promise from `getOccurrences` into an array that
    // we can `await` later. This way we get to process all the options in parallel.
    allPromises.push(
      new Promise((resolve) => {
        const [occurrencesErr, occurrences] = getOccurrences(entryOptions);
        // This `occurrencesErr` should not almost always be `null` since we already validated
        // all the options at the beginning of the function.
        if (occurrencesErr) {
          resolve([entryKey, occurrencesErr, []]);
        } else {
          resolve([entryKey, null, occurrences]);
        }
      })
    );
  }

  // Wait for all parallel processing to complete ...
  const results = await Promise.all(allPromises);
  const allOccurrences: Record<string, string[]> = {};

  // ... then consolidate the results.
  for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
    const result = results[resultIndex];
    const [optionsKey, optionsErr, optionsOccurrences] = result;

    if (optionsErr) {
      // Short-circuit the for-loop and the overall function on the first processing error.
      return [optionsErr, null];
    }

    allOccurrences[optionsKey] = optionsOccurrences;
  }

  return [null, allOccurrences];
};
