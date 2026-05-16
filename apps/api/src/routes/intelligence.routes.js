import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const INTEL_ROLES = [
  "ADMIN",
  "MASTER_ADMIN",
  "INTELLIGENCE",
  "INTELLIGENCE_ANALYST",
];

const ENTITY_TYPES = [
  "PERSON",
  "VEHICLE",
  "LOCATION",
  "ORGANISATION",
  "INCIDENT_PATTERN",
  "RISK_LOCATION",
  "OTHER",
];

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const patrolEventIntelInclude = {
  patrol: {
    select: {
      id: true,
      callSign: true,
      sector: true,
      status: true,
    },
  },
  incident: {
    include: {
      incidentCodeRef: true,
      incidentSubcodeRef: true,
    },
  },
  incidentCodeRef: true,
  incidentSubcodeRef: true,
  serviceTypeRef: true,
  infrastructureTypeRef: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
};

function clean(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function upper(value, fallback = null) {
  const text = clean(value);
  return text ? text.toUpperCase() : fallback;
}

function validEntityType(value) {
  const type = upper(value, "OTHER");
  return ENTITY_TYPES.includes(type) ? type : "OTHER";
}

function validRiskLevel(value) {
  const risk = upper(value, "LOW");
  return RISK_LEVELS.includes(risk) ? risk : "LOW";
}

router.use(requireAuth);
router.use(requireRole(...INTEL_ROLES));

router.get("/entities", async (req, res) => {
  try {
    const { type, riskLevel, sector, q } = req.query;

    const where = {};

    if (type && type !== "ALL") where.entityType = validEntityType(type);
    if (riskLevel && riskLevel !== "ALL") where.riskLevel = validRiskLevel(riskLevel);
    if (sector && sector !== "ALL") where.sector = String(sector).trim();

    if (q && String(q).trim()) {
      where.OR = [
        { displayName: { contains: String(q).trim(), mode: "insensitive" } },
        { description: { contains: String(q).trim(), mode: "insensitive" } },
        { address: { contains: String(q).trim(), mode: "insensitive" } },
        { suburb: { contains: String(q).trim(), mode: "insensitive" } },
      ];
    }

    const entities = await prisma.intelligenceEntity.findMany({
      where,
      include: {
        voivehicleDetails: true,
        incidentVOILinks: {
          include: {
            incident: true,
          },
        },
        patrolEventVOILinks: {
          include: {
            patrolEvent: {
              include: patrolEventIntelInclude,
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json(entities);
  } catch (error) {
    console.error("GET /intelligence/entities failed:", error);
    res.status(500).json({ error: "Failed to fetch intelligence entities" });
  }
});

router.post("/entities", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      address,
      suburb,
      sector,
      latitude,
      longitude,
      riskLevel,
      status,
      vehicle,
    } = req.body;

    if (!clean(displayName)) {
      return res.status(400).json({ error: "displayName is required" });
    }

    const created = await prisma.intelligenceEntity.create({
      data: {
        entityType: validEntityType(entityType),
        displayName: clean(displayName),
        description: clean(description),
        address: clean(address),
        suburb: clean(suburb),
        sector: clean(sector),
        latitude: latitude === undefined || latitude === null || latitude === "" ? null : Number(latitude),
        longitude: longitude === undefined || longitude === null || longitude === "" ? null : Number(longitude),
        riskLevel: validRiskLevel(riskLevel),
        status: upper(status, "ACTIVE"),
        voivehicleDetails:
          validEntityType(entityType) === "VEHICLE" && vehicle?.registrationNumber
            ? {
                create: {
                  registrationNumber: String(vehicle.registrationNumber).trim().toUpperCase(),
                  make: clean(vehicle.make),
                  model: clean(vehicle.model),
                  colour: clean(vehicle.colour),
                  vehicleType: clean(vehicle.vehicleType),
                  distinguishingMarks: clean(vehicle.distinguishingMarks),
                  notes: clean(vehicle.notes),
                },
              }
            : undefined,
      },
      include: {
        voivehicleDetails: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("POST /intelligence/entities failed:", error);
    res.status(500).json({ error: "Failed to create intelligence entity" });
  }
});

router.patch("/entities/:id", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      address,
      suburb,
      sector,
      latitude,
      longitude,
      riskLevel,
      status,
      vehicle,
    } = req.body;

    const data = {};

    if (entityType !== undefined) data.entityType = validEntityType(entityType);
    if (displayName !== undefined) {
      if (!clean(displayName)) return res.status(400).json({ error: "displayName cannot be empty" });
      data.displayName = clean(displayName);
    }
    if (description !== undefined) data.description = clean(description);
    if (address !== undefined) data.address = clean(address);
    if (suburb !== undefined) data.suburb = clean(suburb);
    if (sector !== undefined) data.sector = clean(sector);
    if (latitude !== undefined) data.latitude = latitude === null || latitude === "" ? null : Number(latitude);
    if (longitude !== undefined) data.longitude = longitude === null || longitude === "" ? null : Number(longitude);
    if (riskLevel !== undefined) data.riskLevel = validRiskLevel(riskLevel);
    if (status !== undefined) data.status = upper(status, "ACTIVE");

    const updated = await prisma.intelligenceEntity.update({
      where: { id: req.params.id },
      data,
      include: {
        voivehicleDetails: true,
      },
    });

    if (vehicle && updated.entityType === "VEHICLE") {
      await prisma.vOIVehicleDetails.upsert({
        where: { intelligenceEntityId: updated.id },
        update: {
          registrationNumber: vehicle.registrationNumber
            ? String(vehicle.registrationNumber).trim().toUpperCase()
            : updated.voivehicleDetails?.registrationNumber || "UNKNOWN",
          make: clean(vehicle.make),
          model: clean(vehicle.model),
          colour: clean(vehicle.colour),
          vehicleType: clean(vehicle.vehicleType),
          distinguishingMarks: clean(vehicle.distinguishingMarks),
          notes: clean(vehicle.notes),
        },
        create: {
          intelligenceEntityId: updated.id,
          registrationNumber: vehicle.registrationNumber
            ? String(vehicle.registrationNumber).trim().toUpperCase()
            : "UNKNOWN",
          make: clean(vehicle.make),
          model: clean(vehicle.model),
          colour: clean(vehicle.colour),
          vehicleType: clean(vehicle.vehicleType),
          distinguishingMarks: clean(vehicle.distinguishingMarks),
          notes: clean(vehicle.notes),
        },
      });
    }

    const result = await prisma.intelligenceEntity.findUnique({
      where: { id: req.params.id },
      include: {
        voivehicleDetails: true,
      },
    });

    res.json(result);
  } catch (error) {
    console.error("PATCH /intelligence/entities/:id failed:", error);
    res.status(500).json({ error: "Failed to update intelligence entity" });
  }
});

router.get("/links", async (req, res) => {
  try {
    const links = await prisma.intelligenceLink.findMany({
      include: {
        fromEntity: true,
        toEntity: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    res.json(links);
  } catch (error) {
    console.error("GET /intelligence/links failed:", error);
    res.status(500).json({ error: "Failed to fetch intelligence links" });
  }
});

router.post("/links", async (req, res) => {
  try {
    const { fromEntityId, toEntityId, relationship, strength, notes } = req.body;

    if (!fromEntityId || !toEntityId || !clean(relationship)) {
      return res.status(400).json({
        error: "fromEntityId, toEntityId and relationship are required",
      });
    }

    const link = await prisma.intelligenceLink.create({
      data: {
        fromEntityId,
        toEntityId,
        relationship: clean(relationship).toUpperCase(),
        strength: strength === undefined || strength === null || strength === "" ? null : Number(strength),
        notes: clean(notes),
      },
      include: {
        fromEntity: true,
        toEntity: true,
      },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error("POST /intelligence/links failed:", error);
    res.status(500).json({ error: "Failed to create intelligence link" });
  }
});

router.post("/promote/incident/:incidentId", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      riskLevel,
      roleInIncident,
      notes,
      vehicle,
    } = req.body;

    const incident = await prisma.incident.findUnique({
      where: { id: req.params.incidentId },
    });

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const finalType = validEntityType(entityType);
    const finalDisplayName =
      clean(displayName) ||
      clean(vehicle?.registrationNumber) ||
      `${incident.incidentCode} - ${incident.title}`;

    const entity = await prisma.intelligenceEntity.create({
      data: {
        entityType: finalType,
        displayName: finalDisplayName,
        description:
          clean(description) ||
          clean(incident.description) ||
          `Promoted from incident ${incident.incidentCode}`,
        address: clean(incident.street),
        suburb: clean(incident.suburb),
        sector: clean(incident.sector),
        riskLevel: validRiskLevel(riskLevel || incident.severity),
        status: "ACTIVE",
        voivehicleDetails:
          finalType === "VEHICLE" && vehicle?.registrationNumber
            ? {
                create: {
                  registrationNumber: String(vehicle.registrationNumber).trim().toUpperCase(),
                  make: clean(vehicle.make),
                  model: clean(vehicle.model),
                  colour: clean(vehicle.colour),
                  vehicleType: clean(vehicle.vehicleType),
                  distinguishingMarks: clean(vehicle.distinguishingMarks),
                  notes: clean(vehicle.notes),
                },
              }
            : undefined,
      },
      include: {
        voivehicleDetails: true,
      },
    });

    const link = await prisma.incidentVOILink.create({
      data: {
        incidentId: incident.id,
        intelligenceEntityId: entity.id,
        roleInIncident: clean(roleInIncident) || "PROMOTED_FROM_INCIDENT",
        notes: clean(notes),
      },
      include: {
        incident: true,
        intelligenceEntity: true,
      },
    });

    res.status(201).json({ entity, link });
  } catch (error) {
    console.error("POST /intelligence/promote/incident/:incidentId failed:", error);
    res.status(500).json({ error: "Failed to promote incident to intelligence" });
  }
});

router.post("/promote/patrol-event/:patrolEventId", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      riskLevel,
      observationType,
      notes,
      vehicle,
    } = req.body;

    const patrolEvent = await prisma.patrolEvent.findUnique({
      where: { id: req.params.patrolEventId },
      include: patrolEventIntelInclude,
    });

    if (!patrolEvent) {
      return res.status(404).json({ error: "Patrol event not found" });
    }

    const finalType = validEntityType(entityType);
    const finalDisplayName =
      clean(displayName) ||
      clean(vehicle?.registrationNumber) ||
      `${patrolEvent.type} - ${patrolEvent.createdAt.toISOString()}`;

    const entity = await prisma.intelligenceEntity.create({
      data: {
        entityType: finalType,
        displayName: finalDisplayName,
        description:
          clean(description) ||
          clean(patrolEvent.description) ||
          `Promoted from patrol event ${patrolEvent.type}`,
        address: [patrolEvent.streetNumber, patrolEvent.streetName].filter(Boolean).join(" ") || null,
        suburb: clean(patrolEvent.suburb),
        sector: patrolEvent.incident?.sector || patrolEvent.patrol?.sector || null,
        latitude: patrolEvent.latitude,
        longitude: patrolEvent.longitude,
        riskLevel: validRiskLevel(riskLevel),
        status: "ACTIVE",
        voivehicleDetails:
          finalType === "VEHICLE" && vehicle?.registrationNumber
            ? {
                create: {
                  registrationNumber: String(vehicle.registrationNumber).trim().toUpperCase(),
                  make: clean(vehicle.make),
                  model: clean(vehicle.model),
                  colour: clean(vehicle.colour),
                  vehicleType: clean(vehicle.vehicleType),
                  distinguishingMarks: clean(vehicle.distinguishingMarks),
                  notes: clean(vehicle.notes),
                },
              }
            : undefined,
      },
      include: {
        voivehicleDetails: true,
      },
    });

    const link = await prisma.patrolEventVOILink.create({
      data: {
        patrolEventId: patrolEvent.id,
        intelligenceEntityId: entity.id,
        observationType: clean(observationType) || patrolEvent.type,
        notes: clean(notes),
      },
      include: {
        patrolEvent: true,
        intelligenceEntity: true,
      },
    });

    res.status(201).json({ entity, link });
  } catch (error) {
    console.error("POST /intelligence/promote/patrol-event/:patrolEventId failed:", error);
    res.status(500).json({ error: "Failed to promote patrol event to intelligence" });
  }
});

router.get("/graph", async (req, res) => {
  try {
    const entities = await prisma.intelligenceEntity.findMany({
      include: {
        voivehicleDetails: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    const links = await prisma.intelligenceLink.findMany({
      include: {
        fromEntity: true,
        toEntity: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const incidentLinks = await prisma.incidentVOILink.findMany({
      include: {
        incident: true,
        intelligenceEntity: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const patrolEventLinks = await prisma.patrolEventVOILink.findMany({
      include: {
        patrolEvent: {
          include: patrolEventIntelInclude,
        },
        intelligenceEntity: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    res.json({
      entities,
      links,
      incidentLinks,
      patrolEventLinks,
    });
  } catch (error) {
    console.error("GET /intelligence/graph failed:", error);
    res.status(500).json({ error: "Failed to fetch intelligence graph" });
  }
});

export default router;
