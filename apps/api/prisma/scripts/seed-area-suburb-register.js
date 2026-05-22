import { prisma } from "../../src/config/db.js";

const APPLY_FLAG = "--apply";
const CONFIRM_ENV = "CONFIRM_AREA_SUBURB_SEED";
const CONFIRM_VALUE = "YES";

const INITIAL_AREAS = [
  { officialName: "Valhalla", type: "SUBURB", aliases: ["Vahalla", "Valhala"] },
  { officialName: "Clubview", type: "SUBURB", aliases: ["Club View"] },
  { officialName: "Lyttelton", type: "SUBURB", aliases: ["Lyttleton"] },
  { officialName: "Aswood", type: "AREA", aliases: [] },
];

function normalizeAreaAlias(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function hasApplyFlag(args = process.argv.slice(2)) {
  return args.includes(APPLY_FLAG);
}

function isApplyConfirmed(args = process.argv.slice(2), env = process.env) {
  return hasApplyFlag(args) && env[CONFIRM_ENV] === CONFIRM_VALUE;
}

async function upsertArea(definition, apply) {
  const existing = await prisma.area.findFirst({
    where: {
      sectorId: null,
      officialName: definition.officialName,
    },
    include: {
      aliases: true,
    },
  });

  if (!apply) {
    return {
      officialName: definition.officialName,
      action: existing ? "exists" : "would create",
      aliases: definition.aliases,
    };
  }

  const area = existing || (await prisma.area.create({
    data: {
      officialName: definition.officialName,
      type: definition.type,
      active: true,
    },
    include: {
      aliases: true,
    },
  }));

  if (existing && (!existing.active || existing.type !== definition.type)) {
    await prisma.area.update({
      where: { id: existing.id },
      data: {
        active: true,
        type: definition.type,
      },
    });
  }

  const existingAliases = new Set(
    (area.aliases || []).map((alias) => alias.normalizedAlias)
  );

  for (const alias of definition.aliases) {
    const normalizedAlias = normalizeAreaAlias(alias);
    if (existingAliases.has(normalizedAlias)) continue;

    await prisma.areaAlias.create({
      data: {
        areaId: area.id,
        alias,
        normalizedAlias,
        active: true,
      },
    });
  }

  return {
    officialName: definition.officialName,
    action: existing ? "updated" : "created",
    aliases: definition.aliases,
  };
}

async function main({ args = process.argv.slice(2), env = process.env } = {}) {
  const apply = hasApplyFlag(args);
  const confirmed = isApplyConfirmed(args, env);

  console.log("Area / Suburb register seed helper");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);

  if (apply && !confirmed) {
    console.error(`Apply mode refused. Set ${CONFIRM_ENV}=${CONFIRM_VALUE} and pass ${APPLY_FLAG}.`);
    return { applied: false, refused: true };
  }

  const results = [];
  for (const definition of INITIAL_AREAS) {
    results.push(await upsertArea(definition, apply));
  }

  for (const result of results) {
    console.log(
      `- ${result.officialName}: ${result.action}; aliases: ${result.aliases.join(", ") || "none"}`
    );
  }

  return { applied: apply, count: results.length };
}

main()
  .catch((error) => {
    console.error("Area / Suburb seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
