import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, "../seed-data/pilot-incident-subcodes.json");
const APPLY_FLAG = "--apply";
const CONFIRM_ENV = "CONFIRM_PILOT_SUBCODE_IMPORT";
const CONFIRM_VALUE = "YES";
const NUMERIC_CODE_PATTERN = /^[0-9]{3}$/;

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function hasApplyFlag(args = process.argv.slice(2)) {
  return args.includes(APPLY_FLAG);
}

function isApplyConfirmed(args = process.argv.slice(2), env = process.env) {
  return hasApplyFlag(args) && env[CONFIRM_ENV] === CONFIRM_VALUE;
}

async function loadSeedData() {
  const raw = await fs.readFile(SEED_FILE, "utf8");
  const parsed = JSON.parse(raw);

  if (parsed.seedType !== "PILOT_OPERATIONAL_SUBCODES") {
    throw new Error("Seed file must be marked as PILOT_OPERATIONAL_SUBCODES.");
  }

  if (!Array.isArray(parsed.subcodes)) {
    throw new Error("Seed file must contain a subcodes array.");
  }

  return parsed.subcodes;
}

function validateSeedRow(row, index) {
  const parentIncidentCode = cleanText(row.parentIncidentCode);
  const subcode = cleanText(row.subcode);
  const name = cleanText(row.name);

  if (!parentIncidentCode || !NUMERIC_CODE_PATTERN.test(parentIncidentCode)) {
    return `Row ${index + 1} skipped: parentIncidentCode must be an active numeric SAPS code.`;
  }

  if (!subcode || !name) {
    return `Row ${index + 1} skipped: subcode and name are required.`;
  }

  return null;
}

async function importPilotIncidentSubcodes({ apply }) {
  const rows = await loadSeedData();
  const stats = {
    read: rows.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
  };

  for (const [index, row] of rows.entries()) {
    const validationError = validateSeedRow(row, index);

    if (validationError) {
      console.warn(validationError);
      stats.skipped += 1;
      continue;
    }

    const parentIncidentCode = cleanText(row.parentIncidentCode);
    const subcode = cleanText(row.subcode);
    const name = cleanText(row.name);
    const active = row.active === undefined ? true : Boolean(row.active);

    const parent = await prisma.incidentCode.findFirst({
      where: {
        code: parentIncidentCode,
        active: true,
      },
    });

    if (!parent || !NUMERIC_CODE_PATTERN.test(parent.code)) {
      console.warn(
        `Skipping ${parentIncidentCode}/${subcode}: parent Incident Code is not active and numeric.`
      );
      stats.skipped += 1;
      continue;
    }

    const existing = await prisma.incidentSubcode.findUnique({
      where: {
        incidentCodeId_subcode: {
          incidentCodeId: parent.id,
          subcode,
        },
      },
    });

    if (!existing) {
      if (apply) {
        await prisma.incidentSubcode.create({
          data: {
            sectorId: parent.sectorId,
            incidentCodeId: parent.id,
            subcode,
            name,
            active,
          },
        });
      }

      stats.created += 1;
      console.log(`${apply ? "Created" : "Would create"} ${parent.code}/${subcode} - ${name}`);
      continue;
    }

    const updates = {};

    if (existing.name !== name) updates.name = name;
    if (existing.active !== active) updates.active = active;
    if (existing.sectorId !== parent.sectorId) updates.sectorId = parent.sectorId;

    if (Object.keys(updates).length === 0) {
      stats.unchanged += 1;
      console.log(`Unchanged ${parent.code}/${subcode} - ${name}`);
      continue;
    }

    if (apply) {
      await prisma.incidentSubcode.update({
        where: { id: existing.id },
        data: updates,
      });
    }

    stats.updated += 1;
    console.log(`${apply ? "Updated" : "Would update"} ${parent.code}/${subcode} - ${name}`);
  }

  return stats;
}

async function main({ args = process.argv.slice(2), env = process.env } = {}) {
  const apply = hasApplyFlag(args);
  const confirmed = isApplyConfirmed(args, env);

  console.log("Pilot Incident Subcode import");
  console.log(`Seed file: ${SEED_FILE}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);

  if (apply && !confirmed) {
    console.error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE} and pass ${APPLY_FLAG}.`);
    return { applied: false, refused: true };
  }

  const stats = await importPilotIncidentSubcodes({ apply });

  console.log(`Rows read: ${stats.read}`);
  console.log(`${apply ? "Created" : "Would create"}: ${stats.created}`);
  console.log(`${apply ? "Updated" : "Would update"}: ${stats.updated}`);
  console.log(`Unchanged: ${stats.unchanged}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log("Old/demo subcodes linked to inactive parent codes were not touched.");

  return { applied: apply, stats };
}

main()
  .catch((error) => {
    console.error("Pilot Incident Subcode import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
