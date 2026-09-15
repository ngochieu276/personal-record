import { PrismaClient } from "@prisma/client";
import { LOCAL_USER_EMAIL } from "../src/auth/constants.ts";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    create: {
      name: "Local User",
      email: LOCAL_USER_EMAIL,
      timezone: "Asia/Bangkok",
    },
    update: {},
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
