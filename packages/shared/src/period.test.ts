import { describe, expect, it } from "vitest";
import {
  addDays,
  alignToPeriodStart,
  computeStreak,
  evaluateKpi,
  formatAmount,
  getNextPeriod,
  getPeriodContaining,
  listCloseablePeriods,
  parseAmountInput,
  sumLogsInPeriod,
} from "./period.ts";

describe("alignToPeriodStart", () => {
  it("keeps a day or two-week pick as the period start", () => {
    expect(alignToPeriodStart("2026-09-16", "day")).toBe("2026-09-16");
    expect(alignToPeriodStart("2026-09-16", "twoWeek")).toBe("2026-09-16");
  });

  it("snaps a week pick to Monday and a month pick to the 1st", () => {
    expect(alignToPeriodStart("2026-09-16", "week")).toBe("2026-09-14");
    expect(alignToPeriodStart("2026-09-16", "month")).toBe("2026-09-01");
  });
});

describe("getPeriodContaining", () => {
  it("uses a single calendar day", () => {
    expect(getPeriodContaining("2026-09-15", "day", "2026-09-01")).toEqual({
      start: "2026-09-15",
      end: "2026-09-15",
    });
  });

  it("uses ISO weeks Monday–Sunday", () => {
    expect(getPeriodContaining("2026-09-15", "week", "2026-01-01")).toEqual({
      start: "2026-09-14",
      end: "2026-09-20",
    });
  });

  it("clips the first week to startDate", () => {
    expect(getPeriodContaining("2026-01-07", "week", "2026-01-07")).toEqual({
      start: "2026-01-07",
      end: "2026-01-11",
    });
  });

  it("uses calendar months and clips the first month", () => {
    expect(getPeriodContaining("2026-01-20", "month", "2026-01-15")).toEqual({
      start: "2026-01-15",
      end: "2026-01-31",
    });
    expect(getPeriodContaining("2026-02-10", "month", "2026-01-15")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("anchors two-week windows on startDate", () => {
    expect(getPeriodContaining("2026-01-07", "twoWeek", "2026-01-07")).toEqual({
      start: "2026-01-07",
      end: "2026-01-20",
    });
    expect(getPeriodContaining("2026-01-21", "twoWeek", "2026-01-07")).toEqual({
      start: "2026-01-21",
      end: "2026-02-03",
    });
  });

  it("rejects dates before startDate", () => {
    expect(() => getPeriodContaining("2026-01-01", "day", "2026-01-07")).toThrow(
      /before subject startDate/,
    );
  });
});

describe("getNextPeriod", () => {
  it("advances to the next ISO week after a clipped first week", () => {
    const first = getPeriodContaining("2026-01-07", "week", "2026-01-07");
    expect(getNextPeriod(first, "week", "2026-01-07")).toEqual({
      start: "2026-01-12",
      end: "2026-01-18",
    });
  });
});

describe("listCloseablePeriods", () => {
  it("returns empty when today is in the first period", () => {
    expect(
      listCloseablePeriods({
        startDate: "2026-09-14",
        periodType: "week",
        today: "2026-09-15",
      }),
    ).toEqual([]);
  });

  it("closes three missed weeks while leaving the current week open", () => {
    const periods = listCloseablePeriods({
      startDate: "2026-08-24",
      periodType: "week",
      today: "2026-09-15",
    });

    expect(periods).toEqual([
      { start: "2026-08-24", end: "2026-08-30" },
      { start: "2026-08-31", end: "2026-09-06" },
      { start: "2026-09-07", end: "2026-09-13" },
    ]);
  });

  it("returns empty when today is before startDate", () => {
    expect(
      listCloseablePeriods({
        startDate: "2026-10-01",
        periodType: "day",
        today: "2026-09-15",
      }),
    ).toEqual([]);
  });
});

describe("evaluateKpi", () => {
  it("finishes when achieved meets or exceeds the target", () => {
    expect(evaluateKpi(150, 150)).toBe("finish");
    expect(evaluateKpi(151, 150)).toBe("finish");
  });

  it("misses when empty or below target", () => {
    expect(evaluateKpi(0, 150)).toBe("miss");
    expect(evaluateKpi(149, 150)).toBe("miss");
  });
});

describe("sumLogsInPeriod", () => {
  const period = { start: "2026-09-14", end: "2026-09-20" };
  const tz = "Asia/Bangkok";

  it("sums only logs whose local date falls in the period", () => {
    const logs = [
      { amount: 40, loggedAt: new Date("2026-09-14T03:00:00.000Z") },
      { amount: 50, loggedAt: new Date("2026-09-16T10:00:00.000Z") },
      { amount: 70, loggedAt: new Date("2026-09-20T16:59:00.000Z") },
      { amount: 999, loggedAt: new Date("2026-09-13T16:00:00.000Z") },
      { amount: 888, loggedAt: new Date("2026-09-21T00:00:00.000Z") },
    ];

    expect(sumLogsInPeriod(logs, period, tz)).toBe(160);
  });
});

describe("computeStreak", () => {
  it("counts consecutive finishes from the latest event and longest run", () => {
    expect(
      computeStreak([
        { status: "finish", periodStart: "2026-08-24" },
        { status: "finish", periodStart: "2026-08-31" },
        { status: "miss", periodStart: "2026-09-07" },
        { status: "finish", periodStart: "2026-09-14" },
      ]),
    ).toEqual({ current: 1, longest: 2 });
  });

  it("resets current streak on a miss", () => {
    expect(
      computeStreak([
        { status: "finish", periodStart: "2026-09-01" },
        { status: "miss", periodStart: "2026-09-08" },
      ]),
    ).toEqual({ current: 0, longest: 1 });
  });
});

describe("parseAmountInput / formatAmount", () => {
  it("parses minutes and 1h 20m style time", () => {
    expect(parseAmountInput("40", "totalTime")).toBe(40);
    expect(parseAmountInput("1h 20m", "totalTime")).toBe(80);
    expect(parseAmountInput("2h", "totalTime")).toBe(120);
    expect(parseAmountInput("15m", "totalTime")).toBe(15);
    expect(parseAmountInput("abc", "totalTime")).toBeNull();
  });

  it("parses integer reps only", () => {
    expect(parseAmountInput("12", "totalRepeat")).toBe(12);
    expect(parseAmountInput("1h", "totalRepeat")).toBeNull();
  });

  it("formats amounts", () => {
    expect(formatAmount(80, "totalTime")).toBe("1h 20m");
    expect(formatAmount(1, "totalRepeat")).toBe("1 rep");
    expect(formatAmount(3, "totalRepeat")).toBe("3 reps");
  });
});

describe("addDays", () => {
  it("crosses month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
});
