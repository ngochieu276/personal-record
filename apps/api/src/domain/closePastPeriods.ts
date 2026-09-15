import {
  evaluateKpi,
  listCloseablePeriods,
  prismaDateToYmd,
  sumLogsInPeriod,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import type { PrismaClient, Subject } from "@prisma/client";

function ymdToPrismaDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function closePastPeriods(
  prisma: PrismaClient,
  subject: Subject,
  timeZone: string,
  now = new Date(),
): Promise<void> {
  const today = toDateYmd(now, timeZone);
  const startDate = prismaDateToYmd(subject.startDate);
  const closable = listCloseablePeriods({
    startDate,
    periodType: subject.periodType as PeriodType,
    today,
  });

  if (closable.length === 0) {
    return;
  }

  const existing = await prisma.subjectEvent.findMany({
    where: {
      subjectId: subject.id,
      periodStart: { in: closable.map((period) => ymdToPrismaDate(period.start)) },
    },
    select: { periodStart: true },
  });

  const existingStarts = new Set(existing.map((event) => prismaDateToYmd(event.periodStart)));
  const pending = closable.filter((period) => !existingStarts.has(period.start));

  if (pending.length === 0) {
    return;
  }

  const logs = await prisma.progressLog.findMany({
    where: { subjectId: subject.id },
    select: { amount: true, loggedAt: true },
  });

  for (const period of pending) {
    const achieved = sumLogsInPeriod(logs, period, timeZone);
    await prisma.subjectEvent.create({
      data: {
        subjectId: subject.id,
        status: evaluateKpi(achieved, subject.kpiTarget),
        periodStart: ymdToPrismaDate(period.start),
        periodEnd: ymdToPrismaDate(period.end),
        achieved,
        kpiSnapshot: subject.kpiTarget,
      },
    });
  }
}

export async function closePastPeriodsForUser(
  prisma: PrismaClient,
  userId: string,
  timeZone: string,
  now = new Date(),
): Promise<void> {
  const subjects = await prisma.subject.findMany({
    where: { project: { userId }, archivedAt: null },
  });

  for (const subject of subjects) {
    await closePastPeriods(prisma, subject, timeZone, now);
  }
}
