import { prisma } from "../db.ts";

/**
 * v1 local-first user. Swap this function for session/JWT lookup when adding auth.
 * There is exactly one user until Phase 10; email may be edited in Settings.
 */
export async function getLocalUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    throw new Error("Local user not seeded. Run `pnpm db:seed`.");
  }

  return user;
}
