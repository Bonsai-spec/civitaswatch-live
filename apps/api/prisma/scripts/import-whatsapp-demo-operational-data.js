import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(
  __dirname,
  "../seed-data/whatsapp-demo-operational-data-review.json"
);

const APPLY_FLAG = "--apply";
const CONFIRM_ENV = "CONFIRM_WHATSAPP_DEMO_IMPORT";
const CONFIRM_VALUE = "YES";
const SOURCE_MARKER = "WHATSAPP_DEMO_TEST_DATA_IMPORT";

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function toNullableString(value) {
  if (!hasText(value)) return null;
  return String(value).trim();
}

function normalizeLookup(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function hasApplyFlag(args = process.argv.slice(2)) {
  return args.includes(APPLY_FLAG);
}

function isApplyConfirmed(args = process.argv.slice(2), env = process.env) {
  return hasApplyFlag(args) && env[CONFIRM_ENV] === CONFIRM_VALUE;
}

function parseEventDate(row) {
  const date = String(row.messageDate || "").trim();
  const time = String(row.messageTime || "").trim();
  const parsed = new Date(`${date}T${time}:00.000+02:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid message date/time for ${row.patrolCallSign || "unknown"}: ${date} ${time}`);
  }

  return parsed;
}

function getSessionStart(eventDate) {
  const start = new Date(eventDate);
  start.setHours(18, 0, 0, 0);
  return start;
}

function getSessionEnd(eventDate) {
  const end = new Date(eventDate);
  end.setHours(23, 59, 0, 0);

  if (eventDate.getHours() < 6) {
    end.setHours(6, 0, 0, 0);
  }

  if (end <= eventDate) {
    end.setTime(eventDate.getTime() + 60 * 60 * 1000);
  }

  return end;
}

function getSessionKey(row) {
  return `${row.messageDate}__${row.patrolCallSign}__${row.sector}`;
}

function getPatrolStartKm(row) {
  const datePart = Number(String(row.messageDate || "").replaceAll("-", "").slice(-4));
  const callSignPart = Array.from(String(row.patrolCallSign || "")).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  return 12000 + ((datePart + callSignPart) % 700);
}

function getPatrolTotalKm(row) {
  return 18 + (String(row.patrolCallSign || "").length % 4) * 7;
}

function labelLine(label, value) {
  const text = toNullableString(value);
  return text ? `${label}: ${text}` : null;
}

function formatLocation(row) {
  return [row.streetName, row.suburb, row.locationNotes].filter(hasText).join(", ");
}

function buildObservationDescription(row) {
  const lines = [
    labelLine("Observation Type", row.observationType || "General"),
    labelLine("Vehicle Colour", row.vehicleColour),
    labelLine("Vehicle Make", row.vehicleMake),
    labelLine("Vehicle Model", row.vehicleModel),
    labelLine("Partial Registration", row.partialRegistration),
    labelLine("Person Description", row.personDescription),
    labelLine("Location", formatLocation(row)),
    labelLine("Description", row.description),
    labelLine("Source Type", row.sourceType),
    labelLine("Verification", row.verificationStatus),
    labelLine("Message Date", row.messageDate),
    labelLine("Message Time", row.messageTime),
    labelLine("Patrol Call Sign", row.patrolCallSign),
    `Source Marker: ${SOURCE_MARKER}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function buildAssistanceDescription(row) {
  const lines = [
    labelLine("Assistance Type", row.reportingCluster || row.serviceType || "Assistance Request"),
    labelLine("Service Type", row.serviceType),
    labelLine("Location", formatLocation(row)),
    labelLine("Details", row.description),
    labelLine("Source Type", row.sourceType),
    labelLine("Verification", row.verificationStatus),
    labelLine("Message Date", row.messageDate),
    labelLine("Message Time", row.messageTime),
    labelLine("Patrol Call Sign", row.patrolCallSign),
    `Source Marker: ${SOURCE_MARKER}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function buildInfrastructureDescription(row) {
  const lines = [
    labelLine("Infrastructure Type", row.infrastructureType),
    labelLine("Reference Number", row.referenceNumber),
    labelLine("Location", formatLocation(row)),
    labelLine("Details", row.description),
    labelLine("Source Type", row.sourceType),
    labelLine("Verification", row.verificationStatus),
    labelLine("Message Date", row.messageDate),
    labelLine("Message Time", row.messageTime),
    labelLine("Patrol Call Sign", row.patrolCallSign),
    `Source Marker: ${SOURCE_MARKER}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function buildIncidentDescription(row) {
  const lines = [
    labelLine(
      "Incident Code",
      [row.proposedIncidentCode, row.proposedIncidentName].filter(hasText).join(" - ")
    ),
    labelLine(
      "Incident Subcode",
      [row.proposedIncidentSubcode, row.proposedIncidentSubcodeName].filter(hasText).join(" - ")
    ),
    labelLine("Reference Number", row.referenceNumber),
    labelLine("Location", formatLocation(row)),
    labelLine("Details", row.description),
    labelLine("Source Type", row.sourceType),
    labelLine("Verification", row.verificationStatus),
    labelLine("Message Date", row.messageDate),
    labelLine("Message Time", row.messageTime),
    labelLine("Patrol Call Sign", row.patrolCallSign),
    `Source Marker: ${SOURCE_MARKER}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function buildEventData(row, lookups, patrolId, createdByUserId) {
  const base = {
    patrolId,
    areaId: lookups.areaIds.get(normalizeLookup(row.suburb)) || null,
    referenceNumber: toNullableString(row.referenceNumber),
    streetName: toNullableString(row.streetName),
    suburb: toNullableString(row.suburb),
    locationNotes: toNullableString(row.locationNotes),
    createdByUserId,
    createdAt: parseEventDate(row),
  };

  if (row.proposedRecordType === "Observation") {
    return {
      ...base,
      type: "OBSERVATION",
      description: buildObservationDescription(row),
    };
  }

  if (row.proposedRecordType === "Assistance Request") {
    return {
      ...base,
      type: "MOBILE",
      assistance: toNullableString(row.serviceType || row.reportingCluster || "Assistance Request"),
      serviceTypeId: lookups.serviceTypeIds.get(normalizeLookup(row.serviceType)) || null,
      description: buildAssistanceDescription(row),
    };
  }

  if (row.proposedRecordType === "Infrastructure") {
    return {
      ...base,
      type: "INFRASTRUCTURE",
      infrastructureTypeId: lookups.infrastructureTypeIds.get(normalizeLookup(row.infrastructureType)) || null,
      description: buildInfrastructureDescription(row),
    };
  }

  if (row.proposedRecordType === "Incident") {
    const incidentCode = lookups.incidentCodeByCode.get(String(row.proposedIncidentCode || "").trim());
    const incidentSubcode = row.proposedIncidentSubcode
      ? lookups.incidentSubcodeByKey.get(`${incidentCode?.id || ""}__${row.proposedIncidentSubcode}`)
      : null;

    return {
      ...base,
      type: "MOBILE",
      incidentCode: toNullableString(row.proposedIncidentCode),
      incidentCodeId: incidentCode?.id || null,
      incidentSubcodeId: incidentSubcode?.id || null,
      description: buildIncidentDescription(row),
    };
  }

  throw new Error(`Unsupported proposedRecordType: ${row.proposedRecordType}`);
}

function getSkipReason(row, lookups) {
  if (row.verificationStatus !== "TEST_DATA") return "verificationStatus is not TEST_DATA";
  if (!row.includeInImport) return "includeInImport is false";
  if (row.needsManualReview) return "needsManualReview is true";

  if (
    row.proposedRecordType === "Incident" &&
    (!hasText(row.proposedIncidentCode) ||
      !lookups.incidentCodeByCode.has(String(row.proposedIncidentCode).trim()))
  ) {
    return `incident code ${row.proposedIncidentCode || "(blank)"} was not found`;
  }

  return null;
}

async function loadRows() {
  const raw = await fs.readFile(SEED_FILE, "utf8");
  const rows = JSON.parse(raw);

  if (!Array.isArray(rows)) {
    throw new Error("WhatsApp demo operational data review file must contain an array.");
  }

  return rows;
}

async function loadLookups() {
  const [incidentCodes, incidentSubcodes, serviceTypes, infrastructureTypes, areas] = await Promise.all([
    prisma.incidentCode.findMany({ where: { active: true } }),
    prisma.incidentSubcode.findMany({ where: { active: true } }),
    prisma.serviceType.findMany({ where: { active: true } }),
    prisma.infrastructureType.findMany({ where: { active: true } }),
    prisma.area.findMany({
      where: { active: true },
      include: {
        aliases: {
          where: { active: true },
        },
      },
    }),
  ]);

  const incidentCodeByCode = new Map();
  for (const code of incidentCodes) {
    if (!incidentCodeByCode.has(code.code)) {
      incidentCodeByCode.set(code.code, code);
    }
  }

  const incidentSubcodeByKey = new Map();
  for (const subcode of incidentSubcodes) {
    incidentSubcodeByKey.set(`${subcode.incidentCodeId}__${subcode.subcode}`, subcode);
  }

  const serviceTypeIds = new Map();
  for (const serviceType of serviceTypes) {
    serviceTypeIds.set(normalizeLookup(serviceType.type), serviceType.id);
  }

  const infrastructureTypeIds = new Map();
  for (const infrastructureType of infrastructureTypes) {
    infrastructureTypeIds.set(normalizeLookup(infrastructureType.type), infrastructureType.id);
  }

  const areaIds = new Map();
  for (const area of areas) {
    areaIds.set(normalizeLookup(area.officialName), area.id);
    for (const alias of area.aliases || []) {
      areaIds.set(alias.normalizedAlias || normalizeLookup(alias.alias), area.id);
    }
  }

  return {
    incidentCodeByCode,
    incidentSubcodeByKey,
    serviceTypeIds,
    infrastructureTypeIds,
    areaIds,
  };
}

async function findImportUser() {
  return prisma.user.findFirst({
    where: {
      isActive: true,
      role: {
        in: ["PATROL", "PATROLLER", "ADMIN", "MASTER_ADMIN"],
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

async function findImportVehicle() {
  return prisma.vehicle.findFirst({
    where: {
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });
}

async function findDuplicateEvent(row) {
  const eventDate = parseEventDate(row);

  return prisma.patrolEvent.findFirst({
    where: {
      createdAt: eventDate,
      description: {
        contains: SOURCE_MARKER,
      },
      patrol: {
        callSign: row.patrolCallSign,
      },
    },
    select: {
      id: true,
    },
  });
}

async function findExistingSession(row) {
  const sessionStart = getSessionStart(parseEventDate(row));
  const sessionEnd = getSessionEnd(parseEventDate(row));

  return prisma.patrolSession.findFirst({
    where: {
      callSign: row.patrolCallSign,
      sector: row.sector,
      startTime: sessionStart,
      endTime: sessionEnd,
      summary: {
        contains: `${SOURCE_MARKER} ${row.messageDate}`,
      },
    },
  });
}

async function createSession(row, user, vehicle) {
  const startTime = getSessionStart(parseEventDate(row));
  const endTime = getSessionEnd(parseEventDate(row));
  const startKm = getPatrolStartKm(row);
  const totalKm = getPatrolTotalKm(row);

  return prisma.patrolSession.create({
    data: {
      userId: user.id,
      vehicleId: vehicle?.id || null,
      callSign: row.patrolCallSign,
      sector: row.sector,
      startTime,
      endTime,
      startKm,
      endKm: startKm + totalKm,
      totalKm,
      status: "COMPLETED",
      vehicleMode: vehicle ? "REGISTERED" : "TEMPORARY",
      tempVehicleRegistration: vehicle ? null : `${row.patrolCallSign}-DEMO`,
      tempVehicleMake: vehicle ? null : "Demo",
      tempVehicleModel: vehicle ? null : "Patrol Vehicle",
      tempVehicleColour: vehicle ? null : "White",
      tempVehicleType: vehicle ? null : "Operational Test Vehicle",
      summary: `${SOURCE_MARKER} ${row.messageDate} ${row.patrolCallSign} ${row.sector}`,
    },
  });
}

async function runImport({ args = process.argv.slice(2), env = process.env } = {}) {
  const apply = hasApplyFlag(args);
  const confirmed = isApplyConfirmed(args, env);
  const rows = await loadRows();
  const lookups = await loadLookups();
  const skipped = [];
  const approvedRows = [];

  for (const [index, row] of rows.entries()) {
    const reason = getSkipReason(row, lookups);
    const rowNumber = index + 1;

    if (reason) {
      skipped.push({ rowNumber, row, reason });
      continue;
    }

    approvedRows.push({ rowNumber, row });
  }

  console.log("WhatsApp demo operational TEST_DATA import");
  console.log(`Seed file: ${SEED_FILE}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`Approved rows to import: ${approvedRows.length}`);
  console.log(`Skipped rows: ${skipped.length}`);
  console.log("");

  console.log("Approved rows:");
  for (const item of approvedRows) {
    console.log(
      `- #${item.rowNumber} ${item.row.messageDate} ${item.row.messageTime} ${item.row.patrolCallSign} ${item.row.proposedRecordType}`
    );
  }

  console.log("");
  console.log("Skipped rows and reasons:");
  for (const item of skipped) {
    console.log(
      `- #${item.rowNumber} ${item.row.messageDate} ${item.row.messageTime} ${item.row.patrolCallSign} ${item.row.proposedRecordType}: ${item.reason}`
    );
  }

  const existingEvents = [];
  for (const item of approvedRows) {
    const duplicate = await findDuplicateEvent(item.row);
    if (duplicate) existingEvents.push({ ...item, eventId: duplicate.id });
  }

  console.log("");
  console.log(`Existing duplicate PatrolEvent rows that will be skipped: ${existingEvents.length}`);

  if (!apply) {
    console.log("Dry run complete. No data was imported.");
    console.log(`To apply, rerun with ${CONFIRM_ENV}=${CONFIRM_VALUE} node ${path.relative(process.cwd(), __filename)} ${APPLY_FLAG}`);
    return {
      applied: false,
      rowsRead: rows.length,
      approved: approvedRows.length,
      skipped: skipped.length,
      createdPatrolSessions: 0,
      createdPatrolEvents: 0,
      duplicatePatrolEvents: existingEvents.length,
    };
  }

  if (!confirmed) {
    console.error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE} and pass ${APPLY_FLAG}.`);
    return {
      applied: false,
      refused: true,
      rowsRead: rows.length,
      approved: approvedRows.length,
      skipped: skipped.length,
    };
  }

  const importUser = await findImportUser();
  if (!importUser) {
    throw new Error("No active PATROL/PATROLLER/ADMIN/MASTER_ADMIN user found for test import. No users were created.");
  }

  const importVehicle = await findImportVehicle();
  const sessionByKey = new Map();
  let createdPatrolSessions = 0;
  let createdPatrolEvents = 0;
  let duplicatePatrolEvents = 0;

  for (const item of approvedRows) {
    const duplicate = await findDuplicateEvent(item.row);
    if (duplicate) {
      duplicatePatrolEvents += 1;
      continue;
    }

    const sessionKey = getSessionKey(item.row);
    let session = sessionByKey.get(sessionKey);

    if (!session) {
      session = await findExistingSession(item.row);

      if (!session) {
        session = await createSession(item.row, importUser, importVehicle);
        createdPatrolSessions += 1;
      }

      sessionByKey.set(sessionKey, session);
    }

    const eventData = buildEventData(item.row, lookups, session.id, importUser.id);
    await prisma.patrolEvent.create({ data: eventData });
    createdPatrolEvents += 1;
  }

  console.log("");
  console.log("Import complete.");
  console.log(`Created PatrolSession rows: ${createdPatrolSessions}`);
  console.log(`Created PatrolEvent rows: ${createdPatrolEvents}`);
  console.log(`Skipped duplicate PatrolEvent rows: ${duplicatePatrolEvents}`);
  console.log("Manual-review rows imported: 0");
  console.log("POI/VOI records created: 0");
  console.log("Intelligence records created: 0");
  console.log("Deletes performed: 0");

  return {
    applied: true,
    rowsRead: rows.length,
    approved: approvedRows.length,
    skipped: skipped.length,
    createdPatrolSessions,
    createdPatrolEvents,
    duplicatePatrolEvents,
  };
}

runImport()
  .catch((error) => {
    console.error("WhatsApp demo operational TEST_DATA import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
