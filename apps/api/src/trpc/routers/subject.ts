import { alignToPeriodStart, KPI_TYPES, PERIOD_TYPES, prismaDateToYmd, type PeriodType } from "@personal-record/shared";
import { z } from "zod";
import { closePastPeriods } from "../../domain/closePastPeriods.ts";
import { getSubjectView } from "../../domain/subjectView.ts";
import { nowIso, type SubjectRow } from "../../prisma/models.ts";
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
  ctx: { db: typeof import("../../prisma/db.ts").db; user: { id: string } },
  id: string,
): Promise<SubjectRow> {
  const subject = await ctx.db.orm.public.Subject.where({ id }).include("project").first();
  if (!subject || subject.project.userId !== ctx.user.id) {
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
      const project = await ctx.db.orm.public.Project.where({
        id: input.projectId,
        userId: ctx.user.id,
      }).first();
      if (!project) {
        notFound("Project not found");
      }

      const query = ctx.db.orm.public.Subject.where({ projectId: input.projectId });
      const subjects = await (input.includeArchived
        ? query
        : query.where((subject) => subject.archivedAt.eq(null)))
        .orderBy((subject) => subject.createdAt.asc())
        .all();

      return Promise.all(subjects.map((subject) => getSubjectView(ctx.db, subject, ctx.user.timezone)));
    }),
  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const subject = await ownedSubject(ctx, input.id);
    return getSubjectView(ctx.db, subject, ctx.user.timezone);
  }),
  create: publicProcedure
    .input(subjectInput.extend({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.orm.public.Project.where({
        id: input.projectId,
        userId: ctx.user.id,
      }).first();
      if (!project) {
        notFound("Project not found");
      }
      if (input.link && !/^https?:\/\//i.test(input.link)) {
        badRequest("Link must start with http:// or https://");
      }

      const subject = await ctx.db.orm.public.Subject.create({
        projectId: input.projectId,
        name: input.name,
        kpiTarget: input.kpiTarget,
        kpiType: input.kpiType,
        periodType: input.periodType,
        startDate: alignToPeriodStart(input.startDate, input.periodType),
        link: input.link,
      });

      return getSubjectView(ctx.db, subject, ctx.user.timezone);
    }),
  update: publicProcedure
    .input(subjectInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const subject = await ownedSubject(ctx, input.id);
      await closePastPeriods(ctx.db, subject, ctx.user.timezone);

      if (input.link && !/^https?:\/\//i.test(input.link)) {
        badRequest("Link must start with http:// or https://");
      }

      const kpiChanged =
        input.kpiTarget !== undefined && input.kpiTarget !== subject.kpiTarget;

      const periodType = (input.periodType ?? subject.periodType) as PeriodType;
      const startDateYmd =
        input.startDate !== undefined || input.periodType !== undefined
          ? alignToPeriodStart(input.startDate ?? prismaDateToYmd(subject.startDate), periodType)
          : undefined;

      const updated = await ctx.db.orm.public.Subject.where({ id: subject.id }).update({
        name: input.name,
        kpiTarget: input.kpiTarget,
        kpiType: input.kpiType,
        periodType: input.periodType,
        startDate: startDateYmd,
        link: input.link === undefined ? undefined : input.link,
      });
      if (!updated) {
        notFound("Subject not found");
      }

      if (kpiChanged && input.kpiTarget !== undefined) {
        await ctx.db.orm.public.KpiChange.create({
          subjectId: subject.id,
          oldValue: subject.kpiTarget,
          newValue: input.kpiTarget,
        });
      }

      return getSubjectView(ctx.db, updated, ctx.user.timezone);
    }),
  archive: publicProcedure
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const subject = await ownedSubject(ctx, input.id);
      const updated = await ctx.db.orm.public.Subject.where({ id: subject.id }).update({
        archivedAt: input.archived ? nowIso() : null,
      });
      if (!updated) {
        notFound("Subject not found");
      }
      return getSubjectView(ctx.db, updated, ctx.user.timezone);
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ownedSubject(ctx, input.id);
    await ctx.db.orm.public.Subject.where({ id: input.id }).delete();
    return { ok: true };
  }),
});
