import { getLocalUser } from "../auth/getLocalUser.ts";
import { db } from "../prisma/db.ts";

export async function createContext() {
  const user = await getLocalUser();
  return { db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
