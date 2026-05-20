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

const OPERATIONAL_MODELS = [
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

const PRESERVED_REGISTER_MODELS = [
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
];

function hasApplyFlag() {
  return process.argv.slice(2).includes(APPLY_FLAG);
}

function getModelNames(schema) {
  return Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm), (match) => match[1]);
}

function quoteIdentifier(identifier) {
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

function printCounts(title, counts) {
  console.log(title);

  for (const model of OPERATIONAL_MODELS) {
    console.log(`- ${model.modelName}: ${counts[model.modelName] ?? 0}`);
  }
}

function printBackupReminder() {
  console.log("Backup required before apply:");
  console.log("mkdir -p ~/Desktop/civitaswatch-backups");
  console.log("pg_dump --format=custom --verbose --no-owner --no-acl \\");
  console.log("  --file=\"$HOME/Desktop/civitaswatch-backups/civitaswatch_live_before_operational_cleanup_$(date +%Y%m%d_%H%M%S).dump\" \\");
  console.log("  civitaswatch_live");
}

async function deleteOperationalData(client) {
  const deleted = {};

  await client.query("BEGIN");

  try {
    for (const model of OPERATIONAL_MODELS) {
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

async function main() {
  const apply = hasApplyFlag();
  const schema = await fs.readFile(SCHEMA_FILE, "utf8");
  const schemaModels = new Set(getModelNames(schema));
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  try {
    console.log("Operational test data cleanup");
    console.log(`Schema inspected: ${SCHEMA_FILE}`);
    console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
    console.log("");
    printBackupReminder();
    console.log("");
    console.log("Preserved register/master models:");
    console.log(PRESERVED_REGISTER_MODELS.map((modelName) => `- ${modelName}`).join("\n"));
    console.log("");
    console.log("Operational models selected for cleanup:");

    for (const model of OPERATIONAL_MODELS) {
      if (!schemaModels.has(model.modelName)) {
        throw new Error(`Expected operational model ${model.modelName} was not found in schema.prisma.`);
      }

      console.log(`- ${model.modelName}: ${model.description}`);
    }

    console.log("");
    const beforeCounts = await countRows(client, OPERATIONAL_MODELS);
    printCounts("Counts before cleanup:", beforeCounts);

    if (!apply) {
      console.log("");
      console.log("Dry run complete. No data was deleted.");
      console.log(`To apply, rerun with ${APPLY_FLAG} and ${CONFIRM_ENV}=${CONFIRM_VALUE}.`);
      return;
    }

    if (process.env[CONFIRM_ENV] !== CONFIRM_VALUE) {
      console.log("");
      console.error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE} to confirm cleanup.`);
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log("Confirmation received. Deleting operational test data in dependency-safe order.");
    const deletedCounts = await deleteOperationalData(client);
    printCounts("Deleted rows:", deletedCounts);

    console.log("");
    const afterCounts = await countRows(client, OPERATIONAL_MODELS);
    printCounts("Counts after cleanup:", afterCounts);
    console.log("");
    console.log("Operational test data cleanup complete. Register/master data was not targeted.");
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error("Operational test data cleanup failed:", error);
    process.exitCode = 1;
  })
