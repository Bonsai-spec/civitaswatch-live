import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SOURCE = "resident-list";
const REQUIRED_COLUMNS = [
  "id",
  "Name",
  "Surname",
  "Address",
  "Suburb",
  "City/Town",
  "Contact Number",
];

const SAMPLE_FLAGGED_LIMIT = 10;

function usage() {
  console.error("Usage: node apps/api/scripts/import-residents.js <residents.csv> [--write]");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const write = args.includes("--write");
  const csvPath = args.find((arg) => arg !== "--write");

  if (!csvPath) {
    usage();
    process.exitCode = 1;
    return null;
  }

  return {
    csvPath,
    write,
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV parse failed: unterminated quoted field");
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((cell) => String(cell || "").trim().length > 0));
}

function trimValue(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return trimValue(value).replace(/^\uFEFF/, "");
}

function normalizeSuburb(value) {
  const trimmed = trimValue(value);

  if (trimmed.toLowerCase() === "bronberrik") {
    return {
      value: "Bronberrick",
      normalized: true,
    };
  }

  return {
    value: trimmed,
    normalized: false,
  };
}

function normalizeContactNumber(value) {
  const trimmed = trimValue(value);
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return {
      value: trimmed,
      normalized: false,
      short: false,
    };
  }

  const normalizedDigits = digits.length === 9 ? `0${digits}` : digits;

  return {
    value: normalizedDigits,
    normalized: normalizedDigits !== trimmed,
    short: normalizedDigits.length < 10,
  };
}

function stableKey(parts) {
  return parts.map((part) => trimValue(part).toLowerCase()).join("|");
}

function addToGroup(groups, key, rowNumber) {
  if (!key.replace(/\|/g, "")) return;

  if (!groups.has(key)) {
    groups.set(key, []);
  }

  groups.get(key).push(rowNumber);
}

function getDuplicateGroupCount(groups) {
  return [...groups.values()].filter((rows) => rows.length > 1).length;
}

function buildImportNotes({ legacyResidentId, cityTown, flags }) {
  return [
    "[IMPORT]",
    `source: ${SOURCE}`,
    `legacyResidentId: ${legacyResidentId}`,
    `cityTown: ${cityTown}`,
    `flags: ${flags.join(",")}`,
    "[/IMPORT]",
  ].join("\n");
}

function requireColumns(headers) {
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missing.length > 0) {
    throw new Error(`Missing required CSV columns: ${missing.join(", ")}`);
  }
}

function rowsToObjects(csvRows) {
  if (csvRows.length === 0) {
    return [];
  }

  const headers = csvRows[0].map(normalizeHeader);
  requireColumns(headers);

  return csvRows.slice(1).map((row, index) => {
    const object = {};

    headers.forEach((header, headerIndex) => {
      object[header] = trimValue(row[headerIndex]);
    });

    return {
      rowNumber: index + 2,
      raw: object,
    };
  });
}

function analyzeRows(csvRows) {
  const contactGroups = new Map();
  const nameAddressGroups = new Map();

  const residents = rowsToObjects(csvRows).map(({ rowNumber, raw }) => {
    const contact = normalizeContactNumber(raw["Contact Number"]);
    const suburb = normalizeSuburb(raw.Suburb);
    const flags = [];

    if (!raw.Surname) flags.push("MISSING_SURNAME");
    if (!raw.Address) flags.push("MISSING_ADDRESS");
    if (contact.short) flags.push("SHORT_CONTACT_NUMBER");
    if (contact.normalized) flags.push("NORMALIZED_CONTACT_NUMBER");
    if (suburb.normalized) flags.push("SUBURB_NORMALIZED");

    const member = {
      firstName: raw.Name,
      surname: raw.Surname,
      cellNumber: contact.value || null,
      address: raw.Address || null,
      suburb: suburb.value || null,
      notes: "",
    };

    const resident = {
      rowNumber,
      legacyResidentId: raw.id,
      cityTown: raw["City/Town"],
      flags,
      member,
    };

    addToGroup(contactGroups, contact.value, rowNumber);
    addToGroup(nameAddressGroups, stableKey([member.firstName, member.surname, member.address]), rowNumber);

    return resident;
  });

  const duplicateContactRows = new Set();
  const duplicateNameAddressRows = new Set();

  for (const rows of contactGroups.values()) {
    if (rows.length > 1) {
      rows.forEach((rowNumber) => duplicateContactRows.add(rowNumber));
    }
  }

  for (const rows of nameAddressGroups.values()) {
    if (rows.length > 1) {
      rows.forEach((rowNumber) => duplicateNameAddressRows.add(rowNumber));
    }
  }

  residents.forEach((resident) => {
    if (duplicateContactRows.has(resident.rowNumber)) {
      resident.flags.push("DUPLICATE_CONTACT");
    }

    if (duplicateNameAddressRows.has(resident.rowNumber)) {
      resident.flags.push("DUPLICATE_NAME_ADDRESS");
    }

    resident.member.notes = buildImportNotes({
      legacyResidentId: resident.legacyResidentId,
      cityTown: resident.cityTown,
      flags: resident.flags,
    });
  });

  return {
    residents,
    duplicateContactGroupsCount: getDuplicateGroupCount(contactGroups),
    duplicateNameAddressGroupsCount: getDuplicateGroupCount(nameAddressGroups),
  };
}

function summarize({ residents, duplicateContactGroupsCount, duplicateNameAddressGroupsCount }) {
  const countsByFlag = {};
  const flaggedRows = residents.filter((resident) => resident.flags.length > 0);

  flaggedRows.forEach((resident) => {
    resident.flags.forEach((flag) => {
      countsByFlag[flag] = (countsByFlag[flag] || 0) + 1;
    });
  });

  return {
    totalRows: residents.length,
    rowsReady: residents.length,
    rowsWithFlags: flaggedRows.length,
    countsByFlag,
    sampleFlaggedRows: flaggedRows.slice(0, SAMPLE_FLAGGED_LIMIT).map((resident) => ({
      rowNumber: resident.rowNumber,
      legacyResidentId: resident.legacyResidentId,
      firstName: resident.member.firstName,
      surname: resident.member.surname,
      address: resident.member.address,
      cellNumber: resident.member.cellNumber,
      flags: resident.flags,
    })),
    duplicateContactGroupsCount,
    duplicateNameAddressGroupsCount,
  };
}

async function isLikelyExistingMember(prisma, member) {
  const existing = await prisma.member.findFirst({
    where: {
      OR: [
        member.cellNumber ? { cellNumber: member.cellNumber } : undefined,
        {
          firstName: member.firstName,
          surname: member.surname,
          address: member.address,
        },
      ].filter(Boolean),
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}

async function writeResidents(residents) {
  const { prisma } = await import("../src/config/db.js");
  let insertedCount = 0;
  let skippedLikelyExistingCount = 0;
  const residentsToInsert = [];

  try {
    for (const resident of residents) {
      const likelyExisting = await isLikelyExistingMember(prisma, resident.member);

      if (likelyExisting) {
        skippedLikelyExistingCount += 1;
      } else {
        residentsToInsert.push(resident);
      }
    }

    for (const resident of residentsToInsert) {
      await prisma.member.create({
        data: resident.member,
      });

      insertedCount += 1;
    }

    return {
      insertedCount,
      skippedLikelyExistingCount,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const parsedArgs = parseArgs(process.argv);
  if (!parsedArgs) return;

  const csvPath = path.resolve(process.cwd(), parsedArgs.csvPath);
  const csvText = await fs.readFile(csvPath, "utf8");
  const csvRows = parseCsv(csvText);
  const analysis = analyzeRows(csvRows);
  const summary = summarize(analysis);

  console.log(`Mode: ${parsedArgs.write ? "WRITE" : "DRY-RUN"}`);
  console.log(`CSV: ${csvPath}`);
  console.log(JSON.stringify(summary, null, 2));

  if (!parsedArgs.write) {
    console.log("Dry-run only. No DB writes performed. Re-run with --write to insert members.");
    return;
  }

  const writeSummary = await writeResidents(analysis.residents);
  console.log(JSON.stringify(writeSummary, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
