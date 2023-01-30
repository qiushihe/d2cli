import { describe, expect, it } from "@jest/globals";

import { getOccurrences, RepeatMode, Weekday } from "./calendar.helper";

describe("helper / calendar.helper", () => {
  describe("getOccurrences", () => {
    it("should generate occurrences with non-repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-02-27",
        endDate: "2023-04-03",
        repeatMode: RepeatMode.None
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(1);
      expect(occurrences?.[0]).toEqual("2023-02-27");
    });

    it("should generate occurrences with daily repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-02-27",
        endDate: "2023-03-02",
        repeatMode: RepeatMode.Daily
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(4);
      expect(occurrences?.[0]).toEqual("2023-02-27");
      expect(occurrences?.[1]).toEqual("2023-02-28");
      expect(occurrences?.[2]).toEqual("2023-03-01");
      expect(occurrences?.[3]).toEqual("2023-03-02");
    });

    it("should generate occurrences with daily repeating options during leap years", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2024-02-27",
        endDate: "2024-03-02",
        repeatMode: RepeatMode.Daily
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(5);
      expect(occurrences?.[0]).toEqual("2024-02-27");
      expect(occurrences?.[1]).toEqual("2024-02-28");
      expect(occurrences?.[2]).toEqual("2024-02-29");
      expect(occurrences?.[3]).toEqual("2024-03-01");
      expect(occurrences?.[4]).toEqual("2024-03-02");
    });

    it("should generate occurrences with weekdays repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-01-22",
        endDate: "2023-01-31",
        repeatMode: RepeatMode.Weekdays,
        repeatWeekdays: [Weekday.Monday, Weekday.Wednesday, Weekday.Friday]
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(5);
      expect(occurrences?.[0]).toEqual("2023-01-22");
      expect(occurrences?.[1]).toEqual("2023-01-23");
      expect(occurrences?.[2]).toEqual("2023-01-25");
      expect(occurrences?.[3]).toEqual("2023-01-27");
      expect(occurrences?.[4]).toEqual("2023-01-30");
    });

    it("should generate occurrences with weekly repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-01-03",
        endDate: "2023-01-30",
        repeatMode: RepeatMode.Weekly
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(4);
      expect(occurrences?.[0]).toEqual("2023-01-03");
      expect(occurrences?.[1]).toEqual("2023-01-10");
      expect(occurrences?.[2]).toEqual("2023-01-17");
      expect(occurrences?.[3]).toEqual("2023-01-24");
    });

    it("should generate occurrences with monthly repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-01-03",
        endDate: "2023-03-31",
        repeatMode: RepeatMode.Monthly
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(3);
      expect(occurrences?.[0]).toEqual("2023-01-03");
      expect(occurrences?.[1]).toEqual("2023-02-03");
      expect(occurrences?.[2]).toEqual("2023-03-03");
    });

    it("should generate occurrences with annual repeating options", () => {
      const [, occurrences] = getOccurrences({
        startDate: "2023-01-03",
        endDate: "2025-01-03",
        repeatMode: RepeatMode.Annual
      });

      expect(occurrences).not.toBeNull();
      expect(occurrences).toHaveLength(3);
      expect(occurrences?.[0]).toEqual("2023-01-03");
      expect(occurrences?.[1]).toEqual("2024-01-03");
      expect(occurrences?.[2]).toEqual("2025-01-03");
    });
  });
});
