import { getLocalUser } from "../auth/getLocalUser.ts";
import { prisma } from "../db.ts";

export async function createContext() {
  const user = await getLocalUser();
  return { prisma, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
