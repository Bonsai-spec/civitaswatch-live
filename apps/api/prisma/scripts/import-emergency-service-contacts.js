import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, "../seed-data/emergency-service-contacts.json");

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function toNullableString(value) {
  if (!hasText(value)) return null;
  return String(value).trim();
}

async function loadDraftContacts() {
  const raw = await fs.readFile(SEED_FILE, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.contacts)) {
    throw new Error("Emergency service contact seed file must contain a contacts array.");
  }

  return parsed.contacts;
}

function mapContactToService(contact) {
  const mapping = contact.existingServiceMapping || {};
  const name = toNullableString(mapping.name || contact.name);
  const type = toNullableString(mapping.type);
  const phone = toNullableString(mapping.phone || contact.primaryPhone);
  const sector = toNullableString(mapping.sector || contact.sectorOrAreaServed);

  if (!name || !type) {
    return null;
  }

  return {
    name,
    type,
    phone,
    radio: toNullableString(mapping.radio),
    sector,
    isActive: mapping.isActive === undefined ? Boolean(contact.active) : Boolean(mapping.isActive),
  };
}

async function importEmergencyServiceContacts() {
  const contacts = await loadDraftContacts();
  const stats = {
    read: contacts.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    unsupportedMetadataRows: 0,
  };

  for (const contact of contacts) {
    const serviceData = mapContactToService(contact);

    if (!serviceData) {
      console.warn(`Skipping contact with missing Service mapping: ${contact.name || "unnamed"}`);
      stats.skipped += 1;
      continue;
    }

    if (
      (Array.isArray(contact.secondaryPhones) && contact.secondaryPhones.length > 0) ||
      hasText(contact.whatsapp) ||
      hasText(contact.notes) ||
      contact.verified !== undefined ||
      contact.lastVerifiedDate !== undefined
    ) {
      stats.unsupportedMetadataRows += 1;
    }

    const existing = await prisma.service.findFirst({
      where: {
        name: serviceData.name,
        type: serviceData.type,
        phone: serviceData.phone,
      },
    });

    if (!existing) {
      await prisma.service.create({
        data: serviceData,
      });
      stats.created += 1;
      continue;
    }

    const updates = {};

    if (existing.radio !== serviceData.radio) updates.radio = serviceData.radio;
    if (existing.sector !== serviceData.sector) updates.sector = serviceData.sector;
    if (existing.isActive !== serviceData.isActive) updates.isActive = serviceData.isActive;

    if (Object.keys(updates).length === 0) {
      stats.unchanged += 1;
      continue;
    }

    await prisma.service.update({
      where: {
        id: existing.id,
      },
      data: updates,
    });
    stats.updated += 1;
  }

  console.log("Emergency service contact import complete");
  console.log(`Seed file: ${SEED_FILE}`);
  console.log(`Contacts read: ${stats.read}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Unchanged: ${stats.unchanged}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Rows with metadata not supported by Service model: ${stats.unsupportedMetadataRows}`);
  console.log("Unsupported metadata remains in the draft JSON and review document.");
  console.log("Deletes performed: 0");
}

importEmergencyServiceContacts()
  .catch((error) => {
    console.error("Emergency service contact import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
