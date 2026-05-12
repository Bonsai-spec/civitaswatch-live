import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const IMPORT_SOURCE = "patrollers-pdf";
const REQUIRED_COLUMNS = [
  "callsign",
  "firstName",
  "surname",
  "fullName",
  "cellNumber",
  "accessLevel",
  "patrollerRole",
  "lastLogon",
  "source",
];
const SAMPLE_LIMIT = 10;

function usage() {
  console.error("Usage: node apps/api/scripts/import-patrollers.js <patrollers.csv> [--write]");
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

function normalizeKey(value) {
  return trimValue(value).toLowerCase();
}

function normalizeCellNumber(value) {
  const digits = trimValue(value).replace(/\D/g, "");

  if (!digits) return "";

  return digits.length === 9 ? `0${digits}` : digits;
}

function nameKey(firstName, surname) {
  return `${normalizeKey(firstName)}|${normalizeKey(surname)}`;
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
    const raw = {};

    headers.forEach((header, headerIndex) => {
      raw[header] = trimValue(row[headerIndex]);
    });

    return {
      rowNumber: index + 2,
      raw,
    };
  });
}

function buildImportNotes(raw) {
  return [
    "[IMPORT]",
    `source: ${IMPORT_SOURCE}`,
    `callsign: ${raw.callsign}`,
    `accessLevel: ${raw.accessLevel}`,
    `patrollerRole: ${raw.patrollerRole}`,
    `lastLogon: ${raw.lastLogon}`,
    "[/IMPORT]",
  ].join("\n");
}

function appendImportNotes(existingNotes, importNotes) {
  const cleanExistingNotes = trimValue(existingNotes);
  return cleanExistingNotes ? `${cleanExistingNotes}\n${importNotes}` : importNotes;
}

function buildPatrollerRow({ rowNumber, raw }) {
  const warnings = [];
  const member = {
    callSign: raw.callsign || null,
    firstName: raw.firstName,
    surname: raw.surname,
    cellNumber: raw.cellNumber || null,
    patrolApproved: true,
    patrolStatus: "ACTIVE",
    notes: buildImportNotes(raw),
  };

  if (!raw.callsign) warnings.push("MISSING_CALLSIGN");
  if (!raw.firstName) warnings.push("MISSING_FIRST_NAME");
  if (!raw.surname) warnings.push("MISSING_SURNAME");
  if (!raw.cellNumber) warnings.push("MISSING_CELL_NUMBER");

  return {
    rowNumber,
    raw,
    member,
    action: null,
    match: null,
    skipReason: !raw.firstName || !raw.surname ? "MISSING_REQUIRED_MEMBER_NAME" : "",
    warnings,
  };
}

function addDuplicateWarnings(rows) {
  const seenCallSigns = new Map();
  const seenCellNumbers = new Map();
  const seenNames = new Map();

  rows.forEach((row) => {
    const callSignKey = normalizeKey(row.member.callSign);
    const cellKey = normalizeCellNumber(row.member.cellNumber);
    const fullNameKey = nameKey(row.member.firstName, row.member.surname);

    if (callSignKey) {
      if (seenCallSigns.has(callSignKey)) {
        row.warnings.push(`DUPLICATE_CSV_CALLSIGN_ROW_${seenCallSigns.get(callSignKey)}`);
      } else {
        seenCallSigns.set(callSignKey, row.rowNumber);
      }
    }

    if (cellKey) {
      if (seenCellNumbers.has(cellKey)) {
        row.warnings.push(`DUPLICATE_CSV_CELL_ROW_${seenCellNumbers.get(cellKey)}`);
      } else {
        seenCellNumbers.set(cellKey, row.rowNumber);
      }
    }

    if (fullNameKey.replace(/\|/g, "")) {
      if (seenNames.has(fullNameKey)) {
        row.warnings.push(`DUPLICATE_CSV_NAME_ROW_${seenNames.get(fullNameKey)}`);
      } else {
        seenNames.set(fullNameKey, row.rowNumber);
      }
    }
  });

  return rows;
}

function analyzeRows(csvRows) {
  return addDuplicateWarnings(rowsToObjects(csvRows).map(buildPatrollerRow));
}

async function loadExistingMembers(prisma) {
  return prisma.member.findMany({
    select: {
      id: true,
      callSign: true,
      firstName: true,
      surname: true,
      cellNumber: true,
      notes: true,
    },
  });
}

function findMatchingMember(existingMembers, row) {
  const callSignKey = normalizeKey(row.member.callSign);
  const cellKey = normalizeCellNumber(row.member.cellNumber);
  const fullNameKey = nameKey(row.member.firstName, row.member.surname);

  if (callSignKey) {
    const match = existingMembers.find((member) => normalizeKey(member.callSign) === callSignKey);
    if (match) return { member: match, matchType: "callSign" };
  }

  if (cellKey) {
    const match = existingMembers.find(
      (member) => normalizeCellNumber(member.cellNumber) === cellKey
    );
    if (match) return { member: match, matchType: "cellNumber" };
  }

  if (fullNameKey.replace(/\|/g, "")) {
    const match = existingMembers.find(
      (member) => nameKey(member.firstName, member.surname) === fullNameKey
    );
    if (match) return { member: match, matchType: "firstName+surname" };
  }

  return null;
}

function getImportRowKey(row) {
  const callSignKey = normalizeKey(row.member.callSign);
  const cellKey = normalizeCellNumber(row.member.cellNumber);
  const fullNameKey = nameKey(row.member.firstName, row.member.surname);

  if (callSignKey) return `callSign:${callSignKey}`;
  if (cellKey) return `cellNumber:${cellKey}`;
  if (fullNameKey.replace(/\|/g, "")) return `name:${fullNameKey}`;

  return "";
}

function skipDuplicatePlannedRows(rows) {
  const seenKeys = new Map();

  return rows.map((row) => {
    if (row.action === "skip") return row;

    const key = row.match?.id ? `member:${row.match.id}` : getImportRowKey(row);

    if (!key) return row;

    if (!seenKeys.has(key)) {
      seenKeys.set(key, row.rowNumber);
      return row;
    }

    return {
      ...row,
      action: "skip",
      skipReason: `DUPLICATE_IMPORT_ROW_${seenKeys.get(key)}`,
      warnings: [...row.warnings, `DUPLICATE_IMPORT_ROW_${seenKeys.get(key)}`],
    };
  });
}

function buildUpdateData(existingMember, row) {
  return {
    callSign: row.member.callSign,
    firstName: row.member.firstName,
    surname: row.member.surname,
    cellNumber: row.member.cellNumber,
    patrolApproved: true,
    patrolStatus: "ACTIVE",
    notes: appendImportNotes(existingMember.notes, row.member.notes),
  };
}

async function planImport(rows) {
  const { prisma } = await import("../src/config/db.js");

  try {
    const existingMembers = await loadExistingMembers(prisma);
    const plannedRows = rows.map((row) => {
      if (row.skipReason) {
        return {
          ...row,
          action: "skip",
        };
      }

      const match = findMatchingMember(existingMembers, row);

      if (!match) {
        return {
          ...row,
          action: "create",
        };
      }

      return {
        ...row,
        action: "update",
        match: {
          id: match.member.id,
          matchType: match.matchType,
        },
        member: buildUpdateData(match.member, row),
      };
    });

    return skipDuplicatePlannedRows(plannedRows);
  } finally {
    await prisma.$disconnect();
  }
}

function summarize(rows) {
  return {
    totalRows: rows.length,
    wouldCreate: rows.filter((row) => row.action === "create").length,
    wouldUpdate: rows.filter((row) => row.action === "update").length,
    skipped: rows.filter((row) => row.action === "skip").length,
    warnings: rows.flatMap((row) =>
      row.warnings.map((warning) => ({
        rowNumber: row.rowNumber,
        warning,
      }))
    ),
    sampleRows: rows.slice(0, SAMPLE_LIMIT).map((row) => ({
      rowNumber: row.rowNumber,
      action: row.action,
      match: row.match,
      callSign: row.member.callSign,
      firstName: row.member.firstName,
      surname: row.member.surname,
      cellNumber: row.member.cellNumber,
      skipReason: row.skipReason,
      warnings: row.warnings,
    })),
  };
}

async function writeRows(rows) {
  const { prisma } = await import("../src/config/db.js");
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      if (row.action === "skip") {
        skipped += 1;
      } else if (row.action === "update") {
        await prisma.member.update({
          where: { id: row.match.id },
          data: row.member,
        });
        updated += 1;
      } else if (row.action === "create") {
        await prisma.member.create({
          data: row.member,
        });
        created += 1;
      }
    }

    return {
      created,
      updated,
      skipped,
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
  const analyzedRows = analyzeRows(csvRows);
  const plannedRows = await planImport(analyzedRows);

  console.log(`Mode: ${parsedArgs.write ? "WRITE" : "DRY-RUN"}`);
  console.log(`CSV: ${csvPath}`);
  console.log(JSON.stringify(summarize(plannedRows), null, 2));

  if (!parsedArgs.write) {
    console.log("Dry-run only. No DB writes performed. Re-run with --write to import patrollers.");
    return;
  }

  console.log(JSON.stringify(await writeRows(plannedRows), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
