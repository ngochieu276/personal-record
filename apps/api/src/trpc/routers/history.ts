import { z } from "zod";
import { getSubjectView } from "../../domain/subjectView.ts";
import { notFound, publicProcedure, router } from "../trpc.ts";

export const historyRouter = router({
  bySubject: publicProcedure.input(z.object({ subjectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const subject = await ctx.prisma.subject.findFirst({
      where: { id: input.subjectId, project: { userId: ctx.user.id } },
    });
    if (!subject) {
      notFound("Subject not found");
    }
    const view = await getSubjectView(ctx.prisma, subject, ctx.user.timezone);
    return {
      streak: view.streak,
      history: view.history,
    };
  }),
});
