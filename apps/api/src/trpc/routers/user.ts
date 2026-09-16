import { z } from "zod";
import { hydrateUser } from "../../prisma/models.ts";
import { badRequest, publicProcedure, router } from "../trpc.ts";

const timeZoneSchema = z.string().min(1).max(64);

function assertTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    badRequest("Invalid timezone");
  }
}

export const userRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  update: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        email: z.string().trim().email().max(200),
        timezone: timeZoneSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertTimeZone(input.timezone);
      const user = await ctx.db.orm.public.User.where({ id: ctx.user.id }).update({
        name: input.name,
        email: input.email,
        timezone: input.timezone,
      });
      if (!user) {
        badRequest("Could not update profile");
      }
      return hydrateUser(user);
    }),
});
