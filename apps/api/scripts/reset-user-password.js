import bcrypt from "bcryptjs";
import { prisma } from "../src/config/db.js";

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  const email = String(emailArg || "").trim().toLowerCase();
  const newPassword = String(passwordArg || "");

  if (!email || !newPassword) {
    console.error("Failure");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    console.error("Failure");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
    },
  });

  console.log("Success");
}

main()
  .catch(() => {
    console.error("Failure");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
