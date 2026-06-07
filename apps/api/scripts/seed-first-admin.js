import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../src/config/db.js";

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const fullName = String(process.argv[3] || "First Master Admin").trim();

  if (!email) {
    console.error("Missing email.");
    process.exit(1);
  }

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.error("Refused. Users already exist.");
    process.exit(1);
  }

  const password = randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: "MASTER_ADMIN",
      isActive: true
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true
    }
  });

  console.log("Created first MASTER_ADMIN:");
  console.log(user);
  console.log("");
  console.log("SAVE THIS PASSWORD NOW:");
  console.log(password);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
