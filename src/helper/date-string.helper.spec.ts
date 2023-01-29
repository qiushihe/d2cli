import { describe, expect, it } from "@jest/globals";

import { add, diffInDays, getWeekday, isAfter, reduceDateRange } from "./date-string.helper";

describe("helper / date-string.helper", () => {
  describe("diffInDays", () => {
    it("should calculate the number of days between 2 date strings", () => {
      expect(diffInDays("1984-09-23", "1984-09-23")).toEqual(0);
      expect(diffInDays("1984-09-24", "1984-09-23")).toEqual(1);
      expect(diffInDays("1984-09-23", "1984-09-24")).toEqual(-1);
    });
  });

  describe("isAfter", () => {
    it("should determine if one date string is after another", () => {
      expect(isAfter("1983-09-23", "1984-09-23")).toEqual(false);
      expect(isAfter("1984-08-23", "1984-09-23")).toEqual(false);
      expect(isAfter("1984-09-22", "1984-09-23")).toEqual(false);

      expect(isAfter("1984-09-23", "1984-09-23")).toEqual(false);

      expect(isAfter("1984-09-24", "1984-09-23")).toEqual(true);
      expect(isAfter("1984-10-23", "1984-09-23")).toEqual(true);
      expect(isAfter("1985-09-23", "1984-09-23")).toEqual(true);
    });
  });

  describe("add", () => {
    it("should add date string value", () => {
      expect(add("1983-09-23", { days: -1 })).toEqual("1983-09-22");
      expect(add("1983-09-23", { days: 0 })).toEqual("1983-09-23");
      expect(add("1983-09-23", { days: 1 })).toEqual("1983-09-24");
    });
  });

  describe("getWeekday", () => {
    it("should return indexed weekday where `0` is Sunday", () => {
      expect(getWeekday("2023-01-22")).toEqual(0);
      expect(getWeekday("2023-01-23")).toEqual(1);
      expect(getWeekday("2023-01-24")).toEqual(2);
      expect(getWeekday("2023-01-25")).toEqual(3);
      expect(getWeekday("2023-01-26")).toEqual(4);
      expect(getWeekday("2023-01-27")).toEqual(5);
      expect(getWeekday("2023-01-28")).toEqual(6);
    });
  });

  describe("reduceRange", () => {
    it("should map dates in given range", () => {
      const result = reduceDateRange(
        "2023-02-27",
        "2023-03-02",
        (acc, date) => [...acc, date],
        [] as string[]
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual("2023-02-27");
      expect(result[1]).toEqual("2023-02-28");
      expect(result[2]).toEqual("2023-03-01");
      expect(result[3]).toEqual("2023-03-02");
    });

    it("should map dates in given range during leap years", () => {
      const result = reduceDateRange(
        "2024-02-27",
        "2024-03-02",
        (acc, date) => [...acc, date],
        [] as string[]
      );

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual("2024-02-27");
      expect(result[1]).toEqual("2024-02-28");
      expect(result[2]).toEqual("2024-02-29");
      expect(result[3]).toEqual("2024-03-01");
      expect(result[4]).toEqual("2024-03-02");
    });
  });
});
