import {
  getPeriodContaining,
  prismaDateToYmd,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import { z } from "zod";
import { closePastPeriods } from "../../domain/closePastPeriods.ts";
import { getSubjectView } from "../../domain/subjectView.ts";
import { asDate, asTimestamp, type SubjectRow } from "../../prisma/models.ts";
import { badRequest, notFound, publicProcedure, router } from "../trpc.ts";

async function ownedSubject(
  ctx: { db: typeof import("../../prisma/db.ts").db; user: { id: string; timezone: string } },
  id: string,
): Promise<SubjectRow> {
  const subject = await ctx.db.orm.public.Subject.where({ id }).include("project").first();
  if (!subject || subject.project.userId !== ctx.user.id) {
    notFound("Subject not found");
  }
  return subject;
}

function assertLogInOpenPeriod(
  subject: { startDate: string; periodType: PeriodType },
  loggedAt: Date,
  timeZone: string,
) {
  const today = toDateYmd(new Date(), timeZone);
  const startDate = prismaDateToYmd(subject.startDate);
  if (today < startDate) {
    badRequest("This subject has not started yet.");
  }
  const open = getPeriodContaining(today, subject.periodType, startDate);
  const logDate = toDateYmd(loggedAt, timeZone);
  if (logDate < startDate) {
    badRequest("Cannot log before the subject start date.");
  }
  if (logDate < open.start || logDate > open.end) {
    badRequest("Logs can only be added to the current open period.");
  }
}

export const logRouter = router({
  create: publicProcedure
    .input(
      z.object({
        subjectId: z.string().uuid(),
        amount: z.number().int().positive(),
        loggedAt: z.date().optional(),
        note: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subject = await ownedSubject(ctx, input.subjectId);
      await closePastPeriods(ctx.db, subject, ctx.user.timezone);
      const loggedAt = input.loggedAt ?? new Date();
      assertLogInOpenPeriod(
        { startDate: subject.startDate, periodType: subject.periodType },
        loggedAt,
        ctx.user.timezone,
      );

      await ctx.db.orm.public.ProgressLog.create({
        subjectId: subject.id,
        amount: input.amount,
        loggedAt: asTimestamp(loggedAt),
        note: input.note || null,
      });

      return getSubjectView(ctx.db, subject, ctx.user.timezone);
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        amount: z.number().int().positive().optional(),
        note: z.string().trim().max(280).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.orm.public.ProgressLog.where({ id: input.id }).include("subject").first();
      if (!log) {
        notFound("Log not found");
      }
      const subject = await ownedSubject(ctx, log.subjectId);
      await closePastPeriods(ctx.db, subject, ctx.user.timezone);
      assertLogInOpenPeriod(subject, asDate(log.loggedAt), ctx.user.timezone);

      await ctx.db.orm.public.ProgressLog.where({ id: log.id }).update({
        amount: input.amount,
        note: input.note === undefined ? undefined : input.note,
      });

      return getSubjectView(ctx.db, subject, ctx.user.timezone);
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const log = await ctx.db.orm.public.ProgressLog.where({ id: input.id }).first();
    if (!log) {
      notFound("Log not found");
    }
    const subject = await ownedSubject(ctx, log.subjectId);
    await closePastPeriods(ctx.db, subject, ctx.user.timezone);
    assertLogInOpenPeriod(subject, asDate(log.loggedAt), ctx.user.timezone);
    await ctx.db.orm.public.ProgressLog.where({ id: log.id }).delete();
    return getSubjectView(ctx.db, subject, ctx.user.timezone);
  }),
});
