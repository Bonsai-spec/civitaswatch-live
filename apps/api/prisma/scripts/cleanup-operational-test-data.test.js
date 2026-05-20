import test from "node:test";
import assert from "node:assert/strict";
import {
  MASTER_DATA_MODELS,
  OPERATIONAL_MODELS,
  buildDeletePlan,
  formatCounts,
  getCleanupTargets,
  isApplyConfirmed,
  runCleanup,
} from "./cleanup-operational-test-data.js";

const MASTER_MODELS_THAT_MUST_NOT_BE_CLEANED = [
  "User",
  "Member",
  "Vehicle",
  "Organisation",
  "Sector",
  "IncidentCode",
  "IncidentSubcode",
  "ServiceType",
  "InfrastructureType",
  "EmergencyContactType",
  "Service",
  "_prisma_migrations",
];

const EXPECTED_OPERATIONAL_MODELS = [
  "PatrolSession",
  "PatrolSessionCrew",
  "PatrolEvent",
  "Incident",
  "IncidentServiceLog",
  "IntelligenceEntity",
  "IntelligenceLink",
  "IncidentVOILink",
  "PatrolEventVOILink",
  "PrePatrolChecklist",
  "PatrolReportAuditLog",
];

function schemaForCleanupTargets() {
  return OPERATIONAL_MODELS.map((model) => `model ${model.modelName} {\n  id String @id\n}`).join("\n\n");
}

function createFakeClient() {
  const queries = [];

  return {
    queries,
    async query(sql) {
      queries.push(sql);

      if (/^SELECT COUNT/i.test(sql)) {
        return { rows: [{ count: 3 }] };
      }

      if (/^DELETE/i.test(sql)) {
        return { rowCount: 2 };
      }

      return { rows: [], rowCount: 0 };
    },
  };
}

function getDeleteModels(queries) {
  return queries
    .filter((sql) => /^DELETE FROM /i.test(sql))
    .map((sql) => sql.match(/^DELETE FROM "([^"]+)"/i)?.[1])
    .filter(Boolean);
}

function noop() {}

test("dry-run is the default and does not delete data", async () => {
  const client = createFakeClient();
  const result = await runCleanup({
    client,
    schema: schemaForCleanupTargets(),
    args: [],
    env: {},
    log: noop,
    error: noop,
  });

  assert.equal(result.mode, "dry-run");
  assert.equal(result.applied, false);
  assert.equal(result.refused, false);
  assert.equal(client.queries.some((sql) => /^SELECT COUNT/i.test(sql)), true);
  assert.equal(client.queries.some((sql) => /^DELETE FROM /i.test(sql)), false);
});

test("apply requires both --apply and explicit confirmation", async () => {
  assert.equal(isApplyConfirmed(["--apply"], {}), false);
  assert.equal(
    isApplyConfirmed([], { CONFIRM_OPERATIONAL_TEST_DATA_CLEANUP: "YES" }),
    false
  );
  assert.equal(
    isApplyConfirmed(["--apply"], { CONFIRM_OPERATIONAL_TEST_DATA_CLEANUP: "YES" }),
    true
  );

  const missingConfirmationClient = createFakeClient();
  const refused = await runCleanup({
    client: missingConfirmationClient,
    schema: schemaForCleanupTargets(),
    args: ["--apply"],
    env: {},
    log: noop,
    error: noop,
  });

  assert.equal(refused.refused, true);
  assert.equal(missingConfirmationClient.queries.some((sql) => /^DELETE FROM /i.test(sql)), false);

  const envOnlyClient = createFakeClient();
  const dryRun = await runCleanup({
    client: envOnlyClient,
    schema: schemaForCleanupTargets(),
    args: [],
    env: { CONFIRM_OPERATIONAL_TEST_DATA_CLEANUP: "YES" },
    log: noop,
    error: noop,
  });

  assert.equal(dryRun.mode, "dry-run");
  assert.equal(envOnlyClient.queries.some((sql) => /^DELETE FROM /i.test(sql)), false);

  const confirmedClient = createFakeClient();
  const applied = await runCleanup({
    client: confirmedClient,
    schema: schemaForCleanupTargets(),
    args: ["--apply"],
    env: { CONFIRM_OPERATIONAL_TEST_DATA_CLEANUP: "YES" },
    log: noop,
    error: noop,
  });

  assert.equal(applied.applied, true);
  assert.deepEqual(getDeleteModels(confirmedClient.queries), buildDeletePlan().map((model) => model.tableName));
});

test("register and master data models are not cleanup targets", () => {
  const cleanupTargetNames = new Set(getCleanupTargets().map((model) => model.modelName));

  MASTER_MODELS_THAT_MUST_NOT_BE_CLEANED.forEach((modelName) => {
    assert.equal(MASTER_DATA_MODELS.includes(modelName), true);
    assert.equal(cleanupTargetNames.has(modelName), false);
  });
});

test("expected operational models are cleanup targets", () => {
  const cleanupTargetNames = new Set(getCleanupTargets().map((model) => model.modelName));

  EXPECTED_OPERATIONAL_MODELS.forEach((modelName) => {
    assert.equal(cleanupTargetNames.has(modelName), true);
  });
});

test("delete order is dependency-safe", () => {
  const order = buildDeletePlan().map((model) => model.modelName);
  const indexOf = (modelName) => order.indexOf(modelName);

  assert.ok(indexOf("IncidentServiceLog") < indexOf("Incident"));
  assert.ok(indexOf("IncidentVOILink") < indexOf("IntelligenceEntity"));
  assert.ok(indexOf("PatrolEventVOILink") < indexOf("IntelligenceEntity"));
  assert.ok(indexOf("PatrolEvent") < indexOf("PatrolSession"));
  assert.ok(indexOf("PatrolSessionCrew") < indexOf("PatrolSession"));
});

test("formatCounts reports counts without changing cleanup state", () => {
  assert.equal(
    formatCounts("Counts before cleanup:", {
      PatrolSession: 4,
      PatrolEvent: 9,
    }).includes("- PatrolSession: 4"),
    true
  );
});
