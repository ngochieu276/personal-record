import { db } from "../prisma/db.ts";
import { hydrateUser } from "../prisma/models.ts";

/**
 * v1 local-first user. Swap this function for session/JWT lookup when adding auth.
 * There is exactly one user until Phase 10; email may be edited in Settings.
 */
export async function getLocalUser() {
  const user = await db.orm.public.User.orderBy((row) => row.createdAt.asc()).first();

  if (!user) {
    throw new Error("Local user not seeded. Run `pnpm db:seed`.");
  }

  return hydrateUser(user);
}
