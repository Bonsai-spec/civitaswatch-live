import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../src/config/db.js";

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const fullName = String(process.argv[3] || "First Master Admin").trim();

  if (!email) {
    console.error("Usage: node apps/api/scripts/seed-first-admin.js admin@example.com \"Full Name\"");
    process.exit(1);
  }

  const existingUsers = await prisma.user.count();

  if (existingUsers > 0) {
    console.error("Refusing to run: database already has users.");
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
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  console.log("First MA  console.log("First MA  consol  console.log("First MA  conso;
  cons  cons  cons  cons  cons  cons  cons  cons :");  cons  cons  cons  cod);
  console.log("");
  console.log("This script will refuse to run a  console.log("This script will refuse to run a  console.log("This scrirror(  consoleo seed   console.log("This script will refuse to run a  console.log("This script will re  await prisma.$disconnect();
  });
