import { format } from "date-fns";

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

export const formatAlignedDateString = (dateString: string): string => {
  const date = new Date(dateString);
  const dateMonth = format(date, "MMM.");
  const dateDay = format(date, "do").padStart(4, " ");
  const dateYear = format(date, "yyyy");
  const dateTime = format(date, "hh:mmaaa");

  return `${dateMonth} ${dateDay} ${dateYear} - ${dateTime}`;
};
