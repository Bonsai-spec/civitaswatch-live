import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const INTEL_ROLES = new Set(["MASTER_ADMIN", "ADMIN", "INTELLIGENCE_ANALYST"]);

function requireIntelligenceAccess(req, res, next) {
  const role = req.user?.role;

  if (!role || !INTEL_ROLES.has(role)) {
    return res.status(403).json({ error: "Crime intelligence access denied" });
  }

  next();
}

router.use(requireAuth);
router.use(requireIntelligenceAccess);

function normalizeCoordinate(value, label) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    const err = new Error(`${label} must be a valid number`);
    err.statusCode = 400;
    throw err;
  }

  if (label === "latitude" && (number < -90 || number > 90)) {
    const err = new Error("latitude must be between -90 and 90");
    err.statusCode = 400;
    throw err;
  }

  if (label === "longitude" && (number < -180 || number > 180)) {
    const err = new Error("longitude must be between -180 and 180");
    err.statusCode = 400;
    throw err;
  }

  return number;
}

router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalEntities,
      activeEntities,
      highRiskEntities,
      vehicleEntities,
      links,
    ] = await Promise.all([
      prisma.intelligenceEntity.count(),
      prisma.intelligenceEntity.count({ where: { status: "ACTIVE" } }),
      prisma.intelligenceEntity.count({
        where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
      }),
      prisma.intelligenceEntity.count({ where: { entityType: "VEHICLE" } }),
      prisma.intelligenceLink.count(),
    ]);

    return res.json({
      message: "Crime Intelligence Dashboard Access Granted",
      user: req.user,
      summary: {
        totalEntities,
        activeEntities,
        highRiskEntities,
        vehicleEntities,
        links,
      },
    });
  } catch (error) {
    console.error("Intelligence dashboard error:", error);
    return res.status(500).json({
      error: "Failed to load intelligence dashboard",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { q, entityType, riskLevel, status } = req.query;

    const where = {
      ...(entityType && entityType !== "ALL" ? { entityType } : {}),
      ...(riskLevel && riskLevel !== "ALL" ? { riskLevel } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              {
                voivehicleDetails: {
                  registrationNumber: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const entities = await prisma.intelligenceEntity.findMany({
      where,
      include: {
        voivehicleDetails: true,
        outgoingLinks: { include: { toEntity: true } },
        incomingLinks: { include: { fromEntity: true } },
        incidentVOILinks: { include: { incident: true } },
        patrolEventVOILinks: { include: { patrolEvent: true } },
      },
      orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }],
    });

    return res.json(entities);
  } catch (error) {
    console.error("Load intelligence entities error:", error);
    return res.status(500).json({
      error: "Failed to load intelligence entities",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      riskLevel,
      status,
      vehicleDetails,
    } = req.body;

    if (!entityType || !displayName) {
      return res.status(400).json({
        error: "entityType and displayName are required",
      });
    }

    const entity = await prisma.intelligenceEntity.create({
      data: {
        entityType,
        displayName,
        description: description ?? null,
        riskLevel: riskLevel || "LOW",
        status: status || "ACTIVE",

        ...(entityType === "VEHICLE" && vehicleDetails
          ? {
              voivehicleDetails: {
                create: {
                  registrationNumber:
                    vehicleDetails.registrationNumber || "UNKNOWN",
                  make: vehicleDetails.make ?? null,
                  model: vehicleDetails.model ?? null,
                  colour: vehicleDetails.colour ?? null,
                  vehicleType: vehicleDetails.vehicleType ?? null,
                  distinguishingMarks:
                    vehicleDetails.distinguishingMarks ?? null,
                  notes: vehicleDetails.notes ?? null,
                },
              },
            }
          : {}),
      },
      include: {
        voivehicleDetails: true,
      },
    });

    return res.status(201).json(entity);
  } catch (error) {
    console.error("Create intelligence entity error:", error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Failed to create intelligence entity",
    });
  }
});

router.patch("/:entityId", async (req, res) => {
  try {
    const { entityId } = req.params;
    const {
      entityType,
      displayName,
      description,
      riskLevel,
      status,
      vehicleDetails,
    } = req.body;

    const existing = await prisma.intelligenceEntity.findUnique({
      where: { id: entityId },
      include: { voivehicleDetails: true },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Intelligence entity not found",
      });
    }

    const entity = await prisma.intelligenceEntity.update({
      where: { id: entityId },
      data: {
        entityType: entityType ?? existing.entityType,
        displayName: displayName ?? existing.displayName,
        description: description === undefined ? existing.description : description ?? null,
        riskLevel: riskLevel ?? existing.riskLevel,
        status: status ?? existing.status,

        ...(entityType === "VEHICLE" && vehicleDetails
          ? {
              voivehicleDetails: {
                upsert: {
                  create: {
                    registrationNumber:
                      vehicleDetails.registrationNumber || "UNKNOWN",
                    make: vehicleDetails.make ?? null,
                    model: vehicleDetails.model ?? null,
                    colour: vehicleDetails.colour ?? null,
                    vehicleType: vehicleDetails.vehicleType ?? null,
                    distinguishingMarks:
                      vehicleDetails.distinguishingMarks ?? null,
                    notes: vehicleDetails.notes ?? null,
                  },
                  update: {
                    registrationNumber:
                      vehicleDetails.registrationNumber || "UNKNOWN",
                    make: vehicleDetails.make ?? null,
                    model: vehicleDetails.model ?? null,
                    colour: vehicleDetails.colour ?? null,
                    vehicleType: vehicleDetails.vehicleType ?? null,
                    distinguishingMarks:
                      vehicleDetails.distinguishingMarks ?? null,
                    notes: vehicleDetails.notes ?? null,
                  },
                },
              },
            }
          : {}),
      },
      include: {
        voivehicleDetails: true,
        outgoingLinks: { include: { toEntity: true } },
        incomingLinks: { include: { fromEntity: true } },
      },
    });

    return res.json(entity);
  } catch (error) {
    console.error("Update intelligence entity error:", error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Failed to update intelligence entity",
    });
  }
});

router.delete("/:entityId", async (req, res) => {
  try {
    const { entityId } = req.params;

    const entity = await prisma.intelligenceEntity.update({
      where: { id: entityId },
      data: { status: "ARCHIVED" },
    });

    return res.json(entity);
  } catch (error) {
    console.error("Archive intelligence entity error:", error);
    return res.status(500).json({
      error: "Failed to archive intelligence entity",
    });
  }
});

router.post("/links", async (req, res) => {
  try {
    const {
      fromEntityId,
      toEntityId,
      relationship,
      strength,
      notes,
    } = req.body;

    if (!fromEntityId || !toEntityId || !relationship) {
      return res.status(400).json({
        error: "fromEntityId, toEntityId and relationship are required",
      });
    }

    if (fromEntityId === toEntityId) {
      return res.status(400).json({
        error: "Cannot link an entity to itself",
      });
    }

    const link = await prisma.intelligenceLink.create({
      data: {
        fromEntityId,
        toEntityId,
        relationship,
        strength:
          strength === undefined || strength === null
            ? null
            : Number(strength),
        notes: notes ?? null,
      },
      include: {
        fromEntity: true,
        toEntity: true,
      },
    });

    return res.status(201).json(link);
  } catch (error) {
    console.error("Create intelligence link error:", error);
    return res.status(500).json({
      error: "Failed to create intelligence link",
    });
  }
});

router.delete("/links/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;

    const existing = await prisma.intelligenceLink.findUnique({
      where: { id: linkId },
      include: {
        fromEntity: true,
        toEntity: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Intelligence link not found",
      });
    }

    await prisma.intelligenceLink.delete({
      where: { id: linkId },
    });

    return res.json({
      deleted: true,
      link: existing,
    });
  } catch (error) {
    console.error("Delete intelligence link error:", error);
    return res.status(500).json({
      error: "Failed to delete intelligence link",
    });
  }
});

router.get("/:entityId/connections", async (req, res) => {
  try {
    const { entityId } = req.params;

    const entity = await prisma.intelligenceEntity.findUnique({
      where: { id: entityId },
      include: {
        voivehicleDetails: true,
        patrolEventVOILinks: {
          include: { patrolEvent: true },
        },
        incidentVOILinks: {
          include: { incident: true },
        },
        outgoingLinks: {
          include: { toEntity: true },
        },
        incomingLinks: {
          include: { fromEntity: true },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({
        error: "Intelligence entity not found",
      });
    }

    return res.json(entity);
  } catch (error) {
    console.error("Intelligence connections error:", error);
    return res.status(500).json({
      error: "Failed to load intelligence connections",
    });
  }
});

export default router;