import { z } from "zod";
import { badRequest, notFound } from "../trpc.ts";
import { publicProcedure, router } from "../trpc.ts";

async function ownedProject(ctx: { prisma: typeof import("../../db.ts").prisma; user: { id: string } }, id: string) {
  const project = await ctx.prisma.project.findFirst({
    where: { id, userId: ctx.user.id },
  });
  if (!project) {
    notFound("Project not found");
  }
  return project;
}

export const projectRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { subjects: true } },
      },
    });
  }),
  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
      where: { id: input.id, userId: ctx.user.id },
      include: { _count: { select: { subjects: true } } },
    });
    if (!project) {
      notFound("Project not found");
    }
    return project;
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: { name: input.name, userId: ctx.user.id },
      });
    }),
  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ownedProject(ctx, input.id);
      return ctx.prisma.project.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
      where: { id: input.id, userId: ctx.user.id },
      include: { _count: { select: { subjects: true } } },
    });
    if (!project) {
      notFound("Project not found");
    }
    if (project._count.subjects > 0) {
      badRequest("Delete or move this project's subjects first.");
    }
    await ctx.prisma.project.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});
