import { KPI_TYPES, PERIOD_TYPES } from "@personal-record/shared";
import { z } from "zod";
import { closePastPeriods } from "../../domain/closePastPeriods.ts";
import { getSubjectView } from "../../domain/subjectView.ts";
import { badRequest, notFound, publicProcedure, router } from "../trpc.ts";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalLink = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }
    return value;
  });

const subjectInput = z.object({
  name: z.string().trim().min(1).max(80),
  kpiTarget: z.number().int().positive(),
  kpiType: z.enum(KPI_TYPES),
  periodType: z.enum(PERIOD_TYPES),
  startDate: ymd,
  link: optionalLink,
});

async function ownedSubject(
  ctx: { prisma: typeof import("../../db.ts").prisma; user: { id: string } },
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

export const subjectRouter = router({
  listByProject: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        includeArchived: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        notFound("Project not found");
      }

      const subjects = await ctx.prisma.subject.findMany({
        where: {
          projectId: input.projectId,
          archivedAt: input.includeArchived ? undefined : null,
        },
        orderBy: { createdAt: "asc" },
      });

      return Promise.all(
        subjects.map((subject) => getSubjectView(ctx.prisma, subject, ctx.user.timezone)),
      );
    }),
  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const subject = await ownedSubject(ctx, input.id);
    return getSubjectView(ctx.prisma, subject, ctx.user.timezone);
  }),
  create: publicProcedure
    .input(subjectInput.extend({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        notFound("Project not found");
      }
      if (input.link && !/^https?:\/\//i.test(input.link)) {
        badRequest("Link must start with http:// or https://");
      }

      const subject = await ctx.prisma.subject.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          kpiTarget: input.kpiTarget,
          kpiType: input.kpiType,
          periodType: input.periodType,
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          link: input.link,
        },
      });

      return getSubjectView(ctx.prisma, subject, ctx.user.timezone);
    }),
  update: publicProcedure
    .input(subjectInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const subject = await ownedSubject(ctx, input.id);
      await closePastPeriods(ctx.prisma, subject, ctx.user.timezone);

      if (input.link && !/^https?:\/\//i.test(input.link)) {
        badRequest("Link must start with http:// or https://");
      }

      const kpiChanged =
        input.kpiTarget !== undefined && input.kpiTarget !== subject.kpiTarget;

      const updated = await ctx.prisma.subject.update({
        where: { id: subject.id },
        data: {
          name: input.name,
          kpiTarget: input.kpiTarget,
          kpiType: input.kpiType,
          periodType: input.periodType,
          startDate: input.startDate
            ? new Date(`${input.startDate}T00:00:00.000Z`)
            : undefined,
          link: input.link === undefined ? undefined : input.link,
        },
      });

      if (kpiChanged && input.kpiTarget !== undefined) {
        await ctx.prisma.kpiChange.create({
          data: {
            subjectId: subject.id,
            oldValue: subject.kpiTarget,
            newValue: input.kpiTarget,
          },
        });
      }

      return getSubjectView(ctx.prisma, updated, ctx.user.timezone);
    }),
  archive: publicProcedure
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const subject = await ownedSubject(ctx, input.id);
      const updated = await ctx.prisma.subject.update({
        where: { id: subject.id },
        data: { archivedAt: input.archived ? new Date() : null },
      });
      return getSubjectView(ctx.prisma, updated, ctx.user.timezone);
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ownedSubject(ctx, input.id);
    await ctx.prisma.subject.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});
