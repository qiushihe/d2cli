enum FrequencyUnit {
  Weekly = "weekly",
  Monthly = "monthly"
}

type Frequency<T extends FrequencyUnit> = {
  type: FrequencyUnit;
};

enum Weekday {
  Sunday = "sunday",
  Monday = "monday",
  Tuesday = "tuesday",
  Wednesday = "wednesday",
  Thursday = "thursday",
  Friday = "friday",
  Saturday = "saturday"
}

type Weekly = Frequency<FrequencyUnit.Weekly> & {
  weekday: Weekday;
};

type Monthly = Frequency<FrequencyUnit.Monthly> & {
  day: number;
};

export type FarmingReminder = {
  id: string;
  frequency: Weekly | Monthly;
  note: string;

  /**
   * Must be in the format of YYYY-MM-DD
   */
  referenceDate: `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
};

export type FarmingReminderSessionData = {
  reminders?: FarmingReminder[];
};
