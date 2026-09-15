import { z } from "zod";
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
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
          email: input.email,
          timezone: input.timezone,
        },
      });
    }),
});
