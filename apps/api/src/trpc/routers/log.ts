import {
  getPeriodContaining,
  prismaDateToYmd,
  toDateYmd,
  type PeriodType,
} from "@personal-record/shared";
import { z } from "zod";
import { closePastPeriods } from "../../domain/closePastPeriods.ts";
import { getSubjectView } from "../../domain/subjectView.ts";
import { badRequest, notFound, publicProcedure, router } from "../trpc.ts";

async function ownedSubject(
  ctx: { prisma: typeof import("../../db.ts").prisma; user: { id: string; timezone: string } },
  id: string,
) {
  const subject = await ctx.prisma.subject.findFirst({
    where: { id, project: { userId: ctx.user.id } },
  });
  if (!subject) {
    notFound("Subject not found");
  }
  return subject;
}

function assertLogInOpenPeriod(
  subject: { startDate: Date; periodType: PeriodType },
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
      await closePastPeriods(ctx.prisma, subject, ctx.user.timezone);
      const loggedAt = input.loggedAt ?? new Date();
      assertLogInOpenPeriod(
        { startDate: subject.startDate, periodType: subject.periodType },
        loggedAt,
        ctx.user.timezone,
      );

      await ctx.prisma.progressLog.create({
        data: {
          subjectId: subject.id,
          amount: input.amount,
          loggedAt,
          note: input.note || null,
        },
      });

      return getSubjectView(ctx.prisma, subject, ctx.user.timezone);
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
      const log = await ctx.prisma.progressLog.findFirst({
        where: { id: input.id, subject: { project: { userId: ctx.user.id } } },
        include: { subject: true },
      });
      if (!log) {
        notFound("Log not found");
      }
      await closePastPeriods(ctx.prisma, log.subject, ctx.user.timezone);
      assertLogInOpenPeriod(log.subject, log.loggedAt, ctx.user.timezone);

      await ctx.prisma.progressLog.update({
        where: { id: log.id },
        data: {
          amount: input.amount,
          note: input.note === undefined ? undefined : input.note,
        },
      });

      return getSubjectView(ctx.prisma, log.subject, ctx.user.timezone);
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const log = await ctx.prisma.progressLog.findFirst({
      where: { id: input.id, subject: { project: { userId: ctx.user.id } } },
      include: { subject: true },
    });
    if (!log) {
      notFound("Log not found");
    }
    await closePastPeriods(ctx.prisma, log.subject, ctx.user.timezone);
    assertLogInOpenPeriod(log.subject, log.loggedAt, ctx.user.timezone);
    await ctx.prisma.progressLog.delete({ where: { id: log.id } });
    return getSubjectView(ctx.prisma, log.subject, ctx.user.timezone);
  }),
});
