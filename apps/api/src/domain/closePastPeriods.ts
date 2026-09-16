import {
  evaluateKpi,
  listCloseablePeriods,
  prismaDateToYmd,
  sumLogsInPeriod,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import type { Db } from "../prisma/db.ts";
import { asDate, type SubjectRow } from "../prisma/models.ts";

export async function closePastPeriods(
  db: Db,
  subject: SubjectRow,
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

  const existing = await db.orm.public.SubjectEvent.where({ subjectId: subject.id })
    .select("periodStart")
    .all();

  const existingStarts = new Set(existing.map((event) => prismaDateToYmd(event.periodStart)));
  const pending = closable.filter((period) => !existingStarts.has(period.start));

  if (pending.length === 0) {
    return;
  }

  const logs = await db.orm.public.ProgressLog.where({ subjectId: subject.id })
    .select("amount", "loggedAt")
    .all();

  const logLikes = logs.map((log) => ({
    amount: log.amount,
    loggedAt: asDate(log.loggedAt),
  }));

  for (const period of pending) {
    const achieved = sumLogsInPeriod(logLikes, period, timeZone);
    await db.orm.public.SubjectEvent.create({
      subjectId: subject.id,
      status: evaluateKpi(achieved, subject.kpiTarget),
      periodStart: period.start,
      periodEnd: period.end,
      achieved,
      kpiSnapshot: subject.kpiTarget,
    });
  }
}

export async function closePastPeriodsForUser(
  db: Db,
  userId: string,
  timeZone: string,
  now = new Date(),
): Promise<void> {
  const projects = await db.orm.public.Project.where({ userId }).select("id").all();
  const projectIds = new Set(projects.map((project) => project.id));
  const subjects = await db.orm.public.Subject.where((subject) => subject.archivedAt.eq(null)).all();

  for (const subject of subjects) {
    if (!projectIds.has(subject.projectId)) {
      continue;
    }
    await closePastPeriods(db, subject, timeZone, now);
  }
}
