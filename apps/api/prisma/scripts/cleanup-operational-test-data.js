import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_FILE = path.resolve(__dirname, "../schema.prisma");
const APPLY_FLAG = "--apply";
const CONFIRM_ENV = "CONFIRM_OPERATIONAL_TEST_DATA_CLEANUP";
const CONFIRM_VALUE = "YES";
const { Pool } = pg;

export const OPERATIONAL_MODELS = [
  {
    modelName: "IncidentServiceLog",
    tableName: "IncidentServiceLog",
    description: "incident service coordination logs",
  },
  {
    modelName: "IncidentVOILink",
    tableName: "IncidentVOILink",
    description: "incident to intelligence entity links",
  },
  {
    modelName: "PatrolEventVOILink",
    tableName: "PatrolEventVOILink",
    description: "patrol event to intelligence entity links",
  },
  {
    modelName: "IntelligenceLink",
    tableName: "IntelligenceLink",
    description: "intelligence entity relationship links",
  },
  {
    modelName: "VOIVehicleDetails",
    tableName: "VOIVehicleDetails",
    description: "vehicle details for intelligence entities",
  },
  {
    modelName: "PatrolReportAuditLog",
    tableName: "PatrolReportAuditLog",
    description: "patrol report edit audit logs",
  },
  {
    modelName: "PatrolEvent",
    tableName: "PatrolEvent",
    description: "patrol timeline, incident, assistance, infrastructure, and observation events",
  },
  {
    modelName: "Incident",
    tableName: "Incident",
    description: "formal operational incident reports",
  },
  {
    modelName: "PatrolSessionCrew",
    tableName: "PatrolSessionCrew",
    description: "patrol session crew attendance",
  },
  {
    modelName: "PatrolSession",
    tableName: "PatrolSession",
    description: "patrol sessions",
  },
  {
    modelName: "PrePatrolChecklist",
    tableName: "PrePatrolChecklist",
    description: "pre-patrol operational checklists",
  },
  {
    modelName: "IntelligenceEntity",
    tableName: "IntelligenceEntity",
    description: "fake/test intelligence entities promoted from operational workflows",
  },
];

export const MASTER_DATA_MODELS = [
  "User",
  "Member",
  "Vehicle",
  "Organisation",
  "Sector",
  "UserSectorAccess",
  "IncidentCode",
  "IncidentSubcode",
  "ServiceType",
  "InfrastructureType",
  "EmergencyContactType",
  "Service",
  "_prisma_migrations",
];

export function hasApplyFlag(args = process.argv.slice(2)) {
  return args.includes(APPLY_FLAG);
}

export function isApplyConfirmed(args = process.argv.slice(2), env = process.env) {
  return hasApplyFlag(args) && env[CONFIRM_ENV] === CONFIRM_VALUE;
}

export function getCleanupTargets() {
  return OPERATIONAL_MODELS.map((model) => ({ ...model }));
}

export function buildDeletePlan() {
  return getCleanupTargets();
}

export function getModelNames(schema) {
  return Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm), (match) => match[1]);
}

export function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function countRows(client, models) {
  const entries = [];

  for (const model of models) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(model.tableName)}`);
    entries.push([model.modelName, result.rows[0].count]);
  }

  return Object.fromEntries(entries);
}

export function formatCounts(title, counts, models = OPERATIONAL_MODELS) {
  return [
    title,
    ...models.map((model) => `- ${model.modelName}: ${counts[model.modelName] ?? 0}`),
  ].join("\n");
}

function printCounts(title, counts) {
  console.log(formatCounts(title, counts));
}

function printBackupReminder(log = console.log) {
  log("Backup required before apply:");
  log("mkdir -p ~/Desktop/civitaswatch-backups");
  log("pg_dump --format=custom --verbose --no-owner --no-acl \\");
  log("  --file=\"$HOME/Desktop/civitaswatch-backups/civitaswatch_live_before_operational_cleanup_$(date +%Y%m%d_%H%M%S).dump\" \\");
  log("  civitaswatch_live");
}

async function deleteOperationalData(client) {
  const deleted = {};

  await client.query("BEGIN");

  try {
    for (const model of buildDeletePlan()) {
      const result = await client.query(`DELETE FROM ${quoteIdentifier(model.tableName)}`);
      deleted[model.modelName] = result.rowCount;
    }

    await client.query("COMMIT");
    return deleted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runCleanup({
  client,
  schema,
  args = process.argv.slice(2),
  env = process.env,
  log = console.log,
  error = console.error,
} = {}) {
  if (!client) {
    throw new Error("A database client is required.");
  }

  if (!schema) {
    throw new Error("A Prisma schema string is required.");
  }

  const apply = hasApplyFlag(args);
  const schemaModels = new Set(getModelNames(schema));

  log("Operational test data cleanup");
  log(`Schema inspected: ${SCHEMA_FILE}`);
  log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  log("");
  printBackupReminder(log);
  log("");
  log("Preserved register/master models:");
  log(MASTER_DATA_MODELS.map((modelName) => `- ${modelName}`).join("\n"));
  log("");
  log("Operational models selected for cleanup:");

  for (const model of OPERATIONAL_MODELS) {
    if (!schemaModels.has(model.modelName)) {
      throw new Error(`Expected operational model ${model.modelName} was not found in schema.prisma.`);
    }

    log(`- ${model.modelName}: ${model.description}`);
  }

  log("");
  const beforeCounts = await countRows(client, OPERATIONAL_MODELS);
  log(formatCounts("Counts before cleanup:", beforeCounts));

  if (!apply) {
    log("");
    log("Dry run complete. No data was deleted.");
    log(`To apply, rerun with ${APPLY_FLAG} and ${CONFIRM_ENV}=${CONFIRM_VALUE}.`);
    return { mode: "dry-run", applied: false, refused: false, beforeCounts };
  }

  if (!isApplyConfirmed(args, env)) {
    log("");
    error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE} to confirm cleanup.`);
    return { mode: "apply", applied: false, refused: true, beforeCounts };
  }

  log("");
  log("Confirmation received. Deleting operational test data in dependency-safe order.");
  const deletedCounts = await deleteOperationalData(client);
  log(formatCounts("Deleted rows:", deletedCounts));

  log("");
  const afterCounts = await countRows(client, OPERATIONAL_MODELS);
  log(formatCounts("Counts after cleanup:", afterCounts));
  log("");
  log("Operational test data cleanup complete. Register/master data was not targeted.");

  return {
    mode: "apply",
    applied: true,
    refused: false,
    beforeCounts,
    deletedCounts,
    afterCounts,
  };
}

async function main() {
  const schema = await fs.readFile(SCHEMA_FILE, "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  try {
    const result = await runCleanup({
      client,
      schema,
      args: process.argv.slice(2),
      env: process.env,
    });

    if (result?.refused) {
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Operational test data cleanup failed:", error);
    process.exitCode = 1;
  });
}
