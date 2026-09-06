// Shared time-loss math for the Issues workload calculator. No DB or
// server-only imports here — this runs on both the client (live preview
// while filling the form) and the server (persisted totals).

export const WORK_DAYS_PER_YEAR = 250;
export const WORK_HOURS_PER_DAY = 8;
export const WORK_HOURS_PER_YEAR = WORK_DAYS_PER_YEAR * WORK_HOURS_PER_DAY; // 2000
export const WORK_WEEKS_PER_YEAR = WORK_DAYS_PER_YEAR / 5; // 50

export const FREQUENCY_UNITS = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"] as const;
export type FrequencyUnit = (typeof FREQUENCY_UNITS)[number];

export const FREQUENCY_LABELS_TH: Record<FrequencyUnit, string> = {
  PER_DAY: "ครั้ง/วัน",
  PER_WEEK: "ครั้ง/สัปดาห์",
  PER_MONTH: "ครั้ง/เดือน",
  PER_YEAR: "ครั้ง/ปี",
};

/** How many times a year one occurrence-per-<unit> repeats, on a 250-working-day calendar. */
const OCCURRENCES_PER_YEAR: Record<FrequencyUnit, number> = {
  PER_DAY: WORK_DAYS_PER_YEAR,
  PER_WEEK: WORK_WEEKS_PER_YEAR,
  PER_MONTH: 12,
  PER_YEAR: 1,
};

export function isFrequencyUnit(value: string): value is FrequencyUnit {
  return (FREQUENCY_UNITS as readonly string[]).includes(value);
}

/** hours/year lost by one person = (times per year) x (minutes per time) / 60. */
export function computeHoursPerYear(input: {
  frequencyUnit: FrequencyUnit;
  frequencyCount: number;
  minutesPerOccurrence: number;
}): number {
  const occurrencesPerYear = input.frequencyCount * OCCURRENCES_PER_YEAR[input.frequencyUnit];
  const hours = (occurrencesPerYear * input.minutesPerOccurrence) / 60;
  return Math.round(hours * 10) / 10;
}
