import { z } from "zod";
import { getSubjectView } from "../../domain/subjectView.ts";
import { notFound, publicProcedure, router } from "../trpc.ts";

export const historyRouter = router({
  bySubject: publicProcedure.input(z.object({ subjectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const subject = await ctx.db.orm.public.Subject.where({ id: input.subjectId }).include("project").first();
    if (!subject || subject.project.userId !== ctx.user.id) {
      notFound("Subject not found");
    }
    const view = await getSubjectView(ctx.db, subject, ctx.user.timezone);
    return {
      streak: view.streak,
      history: view.history,
    };
  }),
});
