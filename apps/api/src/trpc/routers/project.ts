import { z } from "zod";
import { hydrateProject, projectWithSubjectCount } from "../../prisma/models.ts";
import { badRequest, notFound } from "../trpc.ts";
import { publicProcedure, router } from "../trpc.ts";

async function ownedProject(ctx: { db: typeof import("../../prisma/db.ts").db; user: { id: string } }, id: string) {
  const project = await ctx.db.orm.public.Project.where({ id, userId: ctx.user.id }).first();
  if (!project) {
    notFound("Project not found");
  }
  return project;
}

export const projectRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.orm.public.Project.where({ userId: ctx.user.id })
      .include("subjects", (subjects) => subjects.count())
      .orderBy((project) => project.createdAt.asc())
      .all();

    return rows.map(({ subjects, ...project }) => ({
      ...hydrateProject(project),
      _count: { subjects },
    }));
  }),
  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await projectWithSubjectCount(input.id, ctx.user.id);
    if (!project) {
      notFound("Project not found");
    }
    return project;
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.orm.public.Project.create({
        name: input.name,
        userId: ctx.user.id,
      });
      return hydrateProject(project);
    }),
  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ownedProject(ctx, input.id);
      const project = await ctx.db.orm.public.Project.where({ id: input.id }).update({
        name: input.name,
      });
      if (!project) {
        notFound("Project not found");
      }
      return hydrateProject(project);
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const project = await projectWithSubjectCount(input.id, ctx.user.id);
    if (!project) {
      notFound("Project not found");
    }
    if (project._count.subjects > 0) {
      badRequest("Delete or move this project's subjects first.");
    }
    await ctx.db.orm.public.Project.where({ id: input.id }).delete();
    return { ok: true };
  }),
});
