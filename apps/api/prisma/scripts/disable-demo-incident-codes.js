import { prisma } from "../../src/config/db.js";

const DEMO_CODES = [
  "ASSAULT",
  "BURGLARY",
  "FIRE",
  "INFRASTRUCTURE",
  "MEDICAL",
  "MVA",
];

async function disableDemoIncidentCodes() {
  const demoCodes = await prisma.incidentCode.findMany({
    where: {
      code: {
        in: DEMO_CODES,
      },
    },
    include: {
      subcodes: {
        select: {
          id: true,
          subcode: true,
          active: true,
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  });

  const foundCodes = new Set(demoCodes.map((row) => row.code));
  const missingCodes = DEMO_CODES.filter((code) => !foundCodes.has(code));
  const codeIds = demoCodes.map((row) => row.id);
  const activeCodes = demoCodes.filter((row) => row.active);
  const activeSubcodes = demoCodes.flatMap((row) =>
    row.subcodes
      .filter((subcode) => subcode.active)
      .map((subcode) => ({
        parentCode: row.code,
        subcode: subcode.subcode,
      }))
  );

  const codeResult = await prisma.incidentCode.updateMany({
    where: {
      id: {
        in: activeCodes.map((row) => row.id),
      },
    },
    data: {
      active: false,
    },
  });

  const subcodeResult = await prisma.incidentSubcode.updateMany({
    where: {
      incidentCodeId: {
        in: codeIds,
      },
      active: true,
    },
    data: {
      active: false,
    },
  });

  console.log("Demo incident code disable complete");
  console.log(`Target demo codes: ${DEMO_CODES.join(", ")}`);
  console.log(`Codes found: ${demoCodes.length}`);
  console.log(
    `Found code values: ${demoCodes.map((row) => row.code).join(", ") || "none"}`
  );
  console.log(`Codes disabled: ${codeResult.count}`);
  console.log(`Subcodes disabled: ${subcodeResult.count}`);
  console.log(
    `Active subcodes found before disable: ${
      activeSubcodes
        .map((row) => `${row.parentCode}:${row.subcode}`)
        .join(", ") || "none"
    }`
  );
  console.log(`Missing codes: ${missingCodes.join(", ") || "none"}`);
  console.log("Deletes performed: 0");
}

disableDemoIncidentCodes()
  .catch((error) => {
    console.error("Failed to disable demo incident codes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
