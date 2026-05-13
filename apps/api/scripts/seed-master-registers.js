import { prisma } from "../src/config/db.js";

const TEMPLATE_SECTOR_ID = null;

const incidentCodes = [
  { code: "ASSAULT", name: "Assault", priority: "High" },
  { code: "THEFT", name: "Theft", priority: "Medium" },
  { code: "BURGLARY", name: "Burglary", priority: "High" },
  { code: "MEDICAL", name: "Medical Emergency", priority: "High" },
  { code: "FIRE", name: "Fire", priority: "Critical" },
  { code: "SUSPICIOUS_ACTIVITY", name: "Suspicious Activity", priority: "Medium" },
  { code: "INFRASTRUCTURE", name: "Infrastructure Fault", priority: "Medium" },
];

const incidentSubcodes = [
  { incidentCode: "ASSAULT", subcode: "COMMON_ASSAULT", name: "Common Assault" },
  { incidentCode: "ASSAULT", subcode: "GBH", name: "Assault GBH" },
  { incidentCode: "ASSAULT", subcode: "DOMESTIC", name: "Domestic Violence" },
  { incidentCode: "THEFT", subcode: "PETTY_THEFT", name: "Petty Theft" },
  { incidentCode: "THEFT", subcode: "FROM_VEHICLE", name: "Theft From Vehicle" },
  { incidentCode: "BURGLARY", subcode: "RESIDENTIAL", name: "Residential Burglary" },
  { incidentCode: "BURGLARY", subcode: "BUSINESS", name: "Business Burglary" },
  { incidentCode: "MEDICAL", subcode: "INJURY", name: "Injury" },
  { incidentCode: "MEDICAL", subcode: "CARDIAC", name: "Cardiac Emergency" },
  { incidentCode: "MEDICAL", subcode: "GENERAL", name: "General Medical" },
  { incidentCode: "FIRE", subcode: "STRUCTURE", name: "Structure Fire" },
  { incidentCode: "FIRE", subcode: "VEHICLE", name: "Vehicle Fire" },
  { incidentCode: "FIRE", subcode: "VEGETATION", name: "Vegetation Fire" },
  { incidentCode: "SUSPICIOUS_ACTIVITY", subcode: "PERSON", name: "Suspicious Person" },
  { incidentCode: "SUSPICIOUS_ACTIVITY", subcode: "VEHICLE", name: "Suspicious Vehicle" },
  { incidentCode: "INFRASTRUCTURE", subcode: "WATER_LEAK", name: "Water Leak" },
  { incidentCode: "INFRASTRUCTURE", subcode: "POWER_OUTAGE", name: "Power Outage" },
  { incidentCode: "INFRASTRUCTURE", subcode: "ROAD_HAZARD", name: "Road Hazard" },
];

const serviceTypes = [
  { type: "SAPS", category: "Emergency", controlRoomManaged: true },
  { type: "EMS", category: "Emergency", controlRoomManaged: true },
  { type: "FIRE_DEPARTMENT", category: "Emergency", controlRoomManaged: true },
  { type: "SECURITY_BACKUP", category: "Security", controlRoomManaged: true },
  { type: "MUNICIPAL", category: "Municipal", controlRoomManaged: true },
  { type: "TOWING", category: "Recovery", controlRoomManaged: true },
];

const infrastructureTypes = [
  { type: "STREET_LIGHT", riskLevel: "Low", requiresLocation: true },
  { type: "WATER_PIPE", riskLevel: "Medium", requiresLocation: true },
  { type: "ELECTRICAL", riskLevel: "High", requiresLocation: true },
  { type: "ROAD", riskLevel: "Medium", requiresLocation: true },
  { type: "TRAFFIC_LIGHT", riskLevel: "Medium", requiresLocation: true },
  { type: "DRAINAGE", riskLevel: "Medium", requiresLocation: true },
];

const emergencyContactTypes = [
  { type: "SAPS_STATION", escalationLevel: "Level 1", sectorSpecific: true },
  { type: "EMS_DISPATCH", escalationLevel: "Level 1", sectorSpecific: false },
  { type: "FIRE_CONTROL", escalationLevel: "Level 1", sectorSpecific: false },
  { type: "SECURITY_SUPERVISOR", escalationLevel: "Level 2", sectorSpecific: true },
  { type: "MUNICIPAL_CONTROL", escalationLevel: "Level 2", sectorSpecific: false },
  { type: "TOW_OPERATOR", escalationLevel: "Level 1", sectorSpecific: true },
];

function isBlank(value) {
  return !String(value || "").trim();
}

function buildExistingRecordUpdate(existing, defaults, nameField = "name") {
  if (!Object.hasOwn(defaults, nameField) || !isBlank(existing?.[nameField])) {
    return null;
  }

  return {
    [nameField]: defaults[nameField],
  };
}

async function upsertGlobalRecord(model, keyField, defaults, nameField = "name") {
  const existing = await model.findFirst({
    where: {
      sectorId: TEMPLATE_SECTOR_ID,
      [keyField]: defaults[keyField],
    },
  });

  if (!existing) {
    await model.create({
      data: {
        ...defaults,
        sectorId: TEMPLATE_SECTOR_ID,
        active: true,
      },
    });

    return "created";
  }

  const updateData = buildExistingRecordUpdate(existing, defaults, nameField);

  if (!updateData) {
    return "unchanged";
  }

  await model.update({
    where: { id: existing.id },
    data: updateData,
  });

  return "updated";
}

async function seedIncidentCodes() {
  const byCode = new Map();
  const stats = { created: 0, updated: 0, unchanged: 0 };

  for (const item of incidentCodes) {
    const action = await upsertGlobalRecord(prisma.incidentCode, "code", item);
    stats[action] += 1;

    const record = await prisma.incidentCode.findFirst({
      where: {
        sectorId: TEMPLATE_SECTOR_ID,
        code: item.code,
      },
    });

    byCode.set(item.code, record);
  }

  return { byCode, stats };
}

async function seedIncidentSubcodes(incidentCodesByCode) {
  const stats = { created: 0, updated: 0, unchanged: 0, skipped: 0 };

  for (const item of incidentSubcodes) {
    const parent = incidentCodesByCode.get(item.incidentCode);

    if (!parent) {
      stats.skipped += 1;
      continue;
    }

    const existing = await prisma.incidentSubcode.findFirst({
      where: {
        incidentCodeId: parent.id,
        subcode: item.subcode,
      },
    });

    if (!existing) {
      await prisma.incidentSubcode.create({
        data: {
          sectorId: TEMPLATE_SECTOR_ID,
          incidentCodeId: parent.id,
          subcode: item.subcode,
          name: item.name,
          active: true,
        },
      });

      stats.created += 1;
      continue;
    }

    if (!isBlank(existing.name)) {
      stats.unchanged += 1;
      continue;
    }

    await prisma.incidentSubcode.update({
      where: { id: existing.id },
      data: {
        name: item.name,
      },
    });
    stats.updated += 1;
  }

  return stats;
}

async function seedRegister(model, keyField, rows, nameField = "name") {
  const stats = { created: 0, updated: 0, unchanged: 0 };

  for (const item of rows) {
    const action = await upsertGlobalRecord(model, keyField, item, nameField);
    stats[action] += 1;
  }

  return stats;
}

async function main() {
  const { byCode, stats: incidentCodeStats } = await seedIncidentCodes();
  const incidentSubcodeStats = await seedIncidentSubcodes(byCode);
  const serviceTypeStats = await seedRegister(prisma.serviceType, "type", serviceTypes, "type");
  const infrastructureTypeStats = await seedRegister(
    prisma.infrastructureType,
    "type",
    infrastructureTypes,
    "type"
  );
  const emergencyContactTypeStats = await seedRegister(
    prisma.emergencyContactType,
    "type",
    emergencyContactTypes,
    "type"
  );

  console.log("Master register seed complete");
  console.table([
    { register: "Incident Codes", ...incidentCodeStats },
    { register: "Incident Subcodes", ...incidentSubcodeStats },
    { register: "Service Types", ...serviceTypeStats },
    { register: "Infrastructure Types", ...infrastructureTypeStats },
    { register: "Emergency Contact Types", ...emergencyContactTypeStats },
  ]);
}

main()
  .catch((error) => {
    console.error("Master register seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
