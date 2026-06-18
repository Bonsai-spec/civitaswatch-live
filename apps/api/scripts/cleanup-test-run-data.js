import "dotenv/config";
import { prisma } from "../src/config/db.js";

const APPLY_FLAG = "--apply";
const CONFIRM_ENV = "CONFIRM_TEST_RUN_CLEANUP";
const CONFIRM_VALUE = "YES";
const TEST_RUN_ID = String(process.env.TEST_RUN_ID || `TEST-RUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`).trim();

function isApplyMode(args = process.argv.slice(2)) {
  return args.includes(APPLY_FLAG);
}

function hasConfirmation(env = process.env) {
  return env[CONFIRM_ENV] === CONFIRM_VALUE;
}

function markerWhere(marker) {
  return {
    OR: [
      { callSign: { contains: marker } },
      { summary: { contains: marker } },
      { tempVehicleRegistration: { contains: marker } },
      { tempVehicleNotes: { contains: marker } },
    ],
  };
}

function incidentWhere(marker, sessionIds = []) {
  const where = {
    OR: [
      { title: { contains: marker } },
      { description: { contains: marker } },
      { incidentCode: { contains: marker } },
    ],
  };

  if (sessionIds.length) {
    where.OR.push({ linkedPatrolId: { in: sessionIds } });
  }

  return where;
}

function checklistWhere(marker, checklistIds = []) {
  const where = {
    OR: [{ notes: { contains: marker } }],
  };

  if (checklistIds.length) {
    where.OR.push({ id: { in: checklistIds } });
  }

  return where;
}

async function collectTargetState(marker) {
  const sessions = await prisma.patrolSession.findMany({
    where: markerWhere(marker),
    select: {
      id: true,
      callSign: true,
      summary: true,
      tempVehicleRegistration: true,
      tempVehicleNotes: true,
      checklistId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const sessionIds = sessions.map((session) => session.id);
  const checklistIds = sessions.map((session) => session.checklistId).filter(Boolean);

  const incidents = await prisma.incident.findMany({
    where: incidentWhere(marker, sessionIds),
    select: {
      id: true,
      title: true,
      description: true,
      linkedPatrolId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const checklists = await prisma.prePatrolChecklist.findMany({
    where: checklistWhere(marker, checklistIds),
    select: {
      id: true,
      notes: true,
      userId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const events = await prisma.patrolEvent.findMany({
    where: {
      OR: [
        { patrolId: { in: sessionIds } },
        { description: { contains: marker } },
        { assistance: { contains: marker } },
        { referenceNumber: { contains: marker } },
      ],
    },
    select: {
      id: true,
      patrolId: true,
      type: true,
      description: true,
      assistance: true,
      referenceNumber: true,
      incidentId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    sessions,
    incidents,
    checklists,
    events,
  };
}

async function deleteTargets(state) {
  await prisma.$transaction(async (tx) => {
    if (state.sessions.length) {
      await tx.patrolSession.deleteMany({
        where: {
          id: { in: state.sessions.map((session) => session.id) },
        },
      });
    }

    if (state.incidents.length) {
      await tx.incident.deleteMany({
        where: {
          id: { in: state.incidents.map((incident) => incident.id) },
        },
      });
    }

    if (state.checklists.length) {
      await tx.prePatrolChecklist.deleteMany({
        where: {
          id: { in: state.checklists.map((checklist) => checklist.id) },
        },
      });
    }
  });
}

async function main() {
  const apply = isApplyMode();

  console.log("Patrol workflow test-run cleanup");
  console.log(`Marker: ${TEST_RUN_ID}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Confirmation env: ${CONFIRM_ENV}=${CONFIRM_VALUE}`);

  const state = await collectTargetState(TEST_RUN_ID);

  console.log("");
  console.log("Target rows:");
  console.log(JSON.stringify(state, null, 2));

  if (!apply) {
    console.log("");
    console.log("Dry run complete. No rows were deleted.");
    return;
  }

  if (!hasConfirmation()) {
    throw new Error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE}.`);
  }

  await deleteTargets(state);

  const after = await collectTargetState(TEST_RUN_ID);

  console.log("");
  console.log("Cleanup complete.");
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((error) => {
    console.error("Patrol workflow test-run cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
