export const KPI_TYPES = ["totalTime", "totalRepeat"] as const;
export type KpiType = (typeof KPI_TYPES)[number];

export const PERIOD_TYPES = ["day", "week", "twoWeek", "month"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const EVENT_STATUSES = ["finish", "miss"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Calendar date in YYYY-MM-DD form (civil date, no timezone). */
export type DateYmd = string;

export type PeriodRange = {
  start: DateYmd;
  end: DateYmd;
};

export type ProgressLogLike = {
  amount: number;
  loggedAt: Date;
};
