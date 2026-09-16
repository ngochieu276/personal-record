import {
  computeStreak,
  getPeriodContaining,
  prismaDateToYmd,
  sumLogsInPeriod,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import type { Db } from "../prisma/db.ts";
import { asDate, hydrateSubject, type SubjectRow } from "../prisma/models.ts";
import { closePastPeriods } from "./closePastPeriods.ts";

export async function getSubjectView(
  db: Db,
  subject: SubjectRow,
  timeZone: string,
  now = new Date(),
) {
  await closePastPeriods(db, subject, timeZone, now);

  const today = toDateYmd(now, timeZone);
  const startDate = prismaDateToYmd(subject.startDate);
  const notStarted = today < startDate;
  const openPeriod = notStarted
    ? null
    : getPeriodContaining(today, subject.periodType as PeriodType, startDate);

  const [logs, events, kpiChanges, project] = await Promise.all([
    db.orm.public.ProgressLog.where({ subjectId: subject.id })
      .orderBy((log) => log.loggedAt.desc())
      .all(),
    db.orm.public.SubjectEvent.where({ subjectId: subject.id })
      .orderBy((event) => event.periodStart.desc())
      .all(),
    db.orm.public.KpiChange.where({ subjectId: subject.id })
      .orderBy((change) => change.createdAt.desc())
      .all(),
    db.orm.public.Project.where({ id: subject.projectId }).first(),
  ]);

  if (!project) {
    throw new Error("Project not found for subject");
  }

  const logLikes = logs.map((log) => ({
    amount: log.amount,
    loggedAt: asDate(log.loggedAt),
  }));
  const current = openPeriod ? sumLogsInPeriod(logLikes, openPeriod, timeZone) : 0;
  const periodLogs = openPeriod
    ? logs
        .filter((log) => {
          const ymd = toDateYmd(asDate(log.loggedAt), timeZone);
          return ymd >= openPeriod.start && ymd <= openPeriod.end;
        })
        .map((log) => ({
          ...log,
          loggedAt: asDate(log.loggedAt),
          createdAt: asDate(log.createdAt),
        }))
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
      at: asDate(event.createdAt),
      periodStart: prismaDateToYmd(event.periodStart),
      periodEnd: prismaDateToYmd(event.periodEnd),
      status: event.status,
      achieved: event.achieved,
      kpiSnapshot: event.kpiSnapshot,
    })),
    ...kpiChanges.map((change) => ({
      kind: "kpi-change" as const,
      id: change.id,
      at: asDate(change.createdAt),
      oldValue: change.oldValue,
      newValue: change.newValue,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    ...hydrateSubject(subject),
    startDate,
    project: {
      ...project,
      createdAt: asDate(project.createdAt),
    },
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
