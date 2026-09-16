import { LOCAL_USER_EMAIL } from "../auth/constants.ts";
import { db } from "./db.ts";

async function main() {
  const existing = await db.orm.public.User.where({ email: LOCAL_USER_EMAIL }).first();
  if (existing) {
    return;
  }

  await db.orm.public.User.create({
    name: "Local User",
    email: LOCAL_USER_EMAIL,
    timezone: "Asia/Bangkok",
  });
}

main()
  .then(async () => {
    await db.close();
  })
  .catch(async (error) => {
    console.error(error);
    await db.close();
    process.exit(1);
  });
