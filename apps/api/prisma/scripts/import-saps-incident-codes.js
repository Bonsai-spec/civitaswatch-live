import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, "../seed-data/saps-incident-codes.json");

function normalizeCode(value) {
  if (typeof value !== "string") {
    throw new Error(`Incident code must be a string. Received: ${value}`);
  }

  const code = value.trim();

  if (!code) {
    throw new Error("Incident code cannot be empty.");
  }

  return code;
}

function normalizeName(value, code) {
  const name = String(value || "").trim();

  if (!name) {
    throw new Error(`Incident code ${code} is missing a name.`);
  }

  return name;
}

async function loadSeedData() {
  const raw = await fs.readFile(SEED_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const incidentCodes = Array.isArray(parsed) ? parsed : parsed.incidentCodes;
  const abcModifiers = Array.isArray(parsed?.abcModifiers) ? parsed.abcModifiers : [];

  if (!Array.isArray(incidentCodes)) {
    throw new Error("Seed file must contain an incidentCodes array.");
  }

  return { incidentCodes, abcModifiers };
}

async function importIncidentCodes() {
  const { incidentCodes, abcModifiers } = await loadSeedData();
  const seenCodes = new Set();
  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    unchanged: 0,
    abcModifiersSkipped: abcModifiers.length,
  };

  for (const row of incidentCodes) {
    const code = normalizeCode(row.code);
    const name = normalizeName(row.name, code);
    const active = row.active === undefined ? true : Boolean(row.active);

    if (seenCodes.has(code)) {
      console.warn(`Skipping duplicate SAPS incident code in seed data: ${code}`);
      stats.skipped += 1;
      continue;
    }

    seenCodes.add(code);

    const existing = await prisma.incidentCode.findFirst({
      where: {
        sectorId: null,
        code,
      },
    });

    if (!existing) {
      await prisma.incidentCode.create({
        data: {
          sectorId: null,
          code,
          name,
          active,
          priority: "Medium",
          templateSourceId: null,
        },
      });
      stats.created += 1;
      continue;
    }

    const updates = {};

    if (existing.name !== name) updates.name = name;
    if (existing.active !== active) updates.active = active;

    if (Object.keys(updates).length === 0) {
      stats.unchanged += 1;
      continue;
    }

    await prisma.incidentCode.update({
      where: { id: existing.id },
      data: updates,
    });
    stats.updated += 1;
  }

  console.log("SAPS incident code import complete");
  console.log(`Seed file: ${SEED_FILE}`);
  console.log(`Incident code rows read: ${incidentCodes.length}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Unchanged: ${stats.unchanged}`);
  console.log(`Skipped duplicates: ${stats.skipped}`);
  console.log(`ABC modifiers skipped: ${stats.abcModifiersSkipped}`);
  console.log("Description/source fields remain in JSON only; IncidentCode has no database columns for them.");
}

importIncidentCodes()
  .catch((error) => {
    console.error("SAPS incident code import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
