import { z } from "zod";
import { getSubjectView } from "../../domain/subjectView.ts";
import { getOwnedSubject } from "../../prisma/models.ts";
import { notFound, publicProcedure, router } from "../trpc.ts";

export const historyRouter = router({
  bySubject: publicProcedure.input(z.object({ subjectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const subject = await getOwnedSubject(ctx.db, ctx.user.id, input.subjectId);
    if (!subject) {
      notFound("Subject not found");
    }
    const view = await getSubjectView(ctx.db, subject, ctx.user.timezone);
    return {
      streak: view.streak,
      history: view.history,
    };
  }),
});
