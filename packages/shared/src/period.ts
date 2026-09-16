import type { DateYmd, EventStatus, PeriodRange, PeriodType, ProgressLogLike } from "./types.ts";

const MS_PER_DAY = 86_400_000;

export function parseYmd(ymd: DateYmd): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${ymd}`);
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatYmd(date: Date): DateYmd {
  return date.toISOString().slice(0, 10);
}

export function addDays(ymd: DateYmd, days: number): DateYmd {
  const date = parseYmd(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

export function diffDays(later: DateYmd, earlier: DateYmd): number {
  return Math.round((parseYmd(later).getTime() - parseYmd(earlier).getTime()) / MS_PER_DAY);
}

export function toDateYmd(date: Date, timeZone: string): DateYmd {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function prismaDateToYmd(date: Date): DateYmd {
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(ymd: DateYmd): DateYmd {
  const date = parseYmd(ymd);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(ymd, offset);
}

function endOfIsoWeek(ymd: DateYmd): DateYmd {
  return addDays(startOfIsoWeek(ymd), 6);
}

function startOfMonth(ymd: DateYmd): DateYmd {
  const [year, month] = ymd.split("-");
  return `${year}-${month}-01`;
}

function endOfMonth(ymd: DateYmd): DateYmd {
  const date = parseYmd(ymd);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
  return formatYmd(last);
}

function clipStart(start: DateYmd, subjectStart: DateYmd): DateYmd {
  return start < subjectStart ? subjectStart : start;
}

/** First calendar day of the period that contains `date` (not clipped to a subject startDate). */
export function alignToPeriodStart(date: DateYmd, periodType: PeriodType): DateYmd {
  switch (periodType) {
    case "day":
    case "twoWeek":
      return date;
    case "week":
      return startOfIsoWeek(date);
    case "month":
      return startOfMonth(date);
    default: {
      const _exhaustive: never = periodType;
      throw new Error(`Unknown period type: ${_exhaustive}`);
    }
  }
}

export function getPeriodContaining(
  date: DateYmd,
  periodType: PeriodType,
  startDate: DateYmd,
): PeriodRange {
  if (date < startDate) {
    throw new Error("Date is before subject startDate");
  }

  switch (periodType) {
    case "day":
      return { start: date, end: date };
    case "week": {
      const start = clipStart(startOfIsoWeek(date), startDate);
      return { start, end: endOfIsoWeek(date) };
    }
    case "month": {
      const start = clipStart(startOfMonth(date), startDate);
      return { start, end: endOfMonth(date) };
    }
    case "twoWeek": {
      const days = diffDays(date, startDate);
      const windowIndex = Math.floor(days / 14);
      const start = addDays(startDate, windowIndex * 14);
      const end = addDays(start, 13);
      return { start, end };
    }
    default: {
      const _exhaustive: never = periodType;
      throw new Error(`Unknown period type: ${_exhaustive}`);
    }
  }
}

export function getNextPeriod(
  current: PeriodRange,
  periodType: PeriodType,
  startDate: DateYmd,
): PeriodRange {
  return getPeriodContaining(addDays(current.end, 1), periodType, startDate);
}

export function isDateInPeriod(ymd: DateYmd, period: PeriodRange): boolean {
  return ymd >= period.start && ymd <= period.end;
}

export function listCloseablePeriods(args: {
  startDate: DateYmd;
  periodType: PeriodType;
  today: DateYmd;
}): PeriodRange[] {
  const { startDate, periodType, today } = args;
  if (today < startDate) {
    return [];
  }

  const open = getPeriodContaining(today, periodType, startDate);
  const closable: PeriodRange[] = [];
  let cursor = getPeriodContaining(startDate, periodType, startDate);

  while (cursor.start < open.start) {
    closable.push(cursor);
    cursor = getNextPeriod(cursor, periodType, startDate);
  }

  return closable;
}

export function evaluateKpi(achieved: number, kpiTarget: number): EventStatus {
  return achieved >= kpiTarget ? "finish" : "miss";
}

export function logBelongsToPeriod(
  loggedAt: Date,
  period: PeriodRange,
  timeZone: string,
): boolean {
  return isDateInPeriod(toDateYmd(loggedAt, timeZone), period);
}

export function sumLogsInPeriod(
  logs: ProgressLogLike[],
  period: PeriodRange,
  timeZone: string,
): number {
  return logs.reduce((sum, log) => {
    if (!logBelongsToPeriod(log.loggedAt, period, timeZone)) {
      return sum;
    }
    return sum + log.amount;
  }, 0);
}

export function computeStreak(
  events: Array<{ status: EventStatus; periodStart: DateYmd }>,
): { current: number; longest: number } {
  const sorted = [...events].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  let longest = 0;
  let run = 0;

  for (const event of sorted) {
    if (event.status === "finish") {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i]?.status === "finish") {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

export function parseAmountInput(raw: string, kpiType: "totalTime" | "totalRepeat"): number | null {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (kpiType === "totalRepeat") {
    if (!/^\d+$/.test(value)) {
      return null;
    }
    return Number(value);
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const hours = value.match(/(\d+)\s*h/);
  const minutes = value.match(/(\d+)\s*m/);
  if (!hours && !minutes) {
    return null;
  }

  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

export function formatAmount(amount: number, kpiType: "totalTime" | "totalRepeat"): string {
  if (kpiType === "totalRepeat") {
    return `${amount} ${amount === 1 ? "rep" : "reps"}`;
  }

  const hours = Math.floor(amount / 60);
  const minutes = amount % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function periodLabel(periodType: PeriodType): string {
  switch (periodType) {
    case "day":
      return "per day";
    case "week":
      return "per week";
    case "twoWeek":
      return "per 2 weeks";
    case "month":
      return "per month";
    default: {
      const _exhaustive: never = periodType;
      return _exhaustive;
    }
  }
}
