import {
  computeStreak,
  getPeriodContaining,
  prismaDateToYmd,
  sumLogsInPeriod,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import type { PrismaClient, Subject } from "@prisma/client";
import { closePastPeriods } from "./closePastPeriods.ts";

export async function getSubjectView(
  prisma: PrismaClient,
  subject: Subject,
  timeZone: string,
  now = new Date(),
) {
  await closePastPeriods(prisma, subject, timeZone, now);

  const today = toDateYmd(now, timeZone);
  const startDate = prismaDateToYmd(subject.startDate);
  const notStarted = today < startDate;
  const openPeriod = notStarted
    ? null
    : getPeriodContaining(today, subject.periodType as PeriodType, startDate);

  const [logs, events, kpiChanges, project] = await Promise.all([
    prisma.progressLog.findMany({
      where: { subjectId: subject.id },
      orderBy: { loggedAt: "desc" },
    }),
    prisma.subjectEvent.findMany({
      where: { subjectId: subject.id },
      orderBy: { periodStart: "desc" },
    }),
    prisma.kpiChange.findMany({
      where: { subjectId: subject.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findUniqueOrThrow({ where: { id: subject.projectId } }),
  ]);

  const current = openPeriod ? sumLogsInPeriod(logs, openPeriod, timeZone) : 0;
  const periodLogs = openPeriod
    ? logs.filter((log) => {
        const ymd = toDateYmd(log.loggedAt, timeZone);
        return ymd >= openPeriod.start && ymd <= openPeriod.end;
      })
    : [];

  const streak = computeStreak(
    events.map((event) => ({
      status: event.status,
      periodStart: prismaDateToYmd(event.periodStart),
    })),
  );

  const history = [
    ...events.map((event) => ({
      kind: "event" as const,
      id: event.id,
      at: event.createdAt,
      periodStart: prismaDateToYmd(event.periodStart),
      periodEnd: prismaDateToYmd(event.periodEnd),
      status: event.status,
      achieved: event.achieved,
      kpiSnapshot: event.kpiSnapshot,
    })),
    ...kpiChanges.map((change) => ({
      kind: "kpi-change" as const,
      id: change.id,
      at: change.createdAt,
      oldValue: change.oldValue,
      newValue: change.newValue,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    ...subject,
    startDate: startDate,
    project,
    notStarted,
    openPeriod,
    current,
    remaining: Math.max(0, subject.kpiTarget - current),
    metKpi: current >= subject.kpiTarget,
    periodLogs,
    streak,
    history,
  };
}
