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
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          registration: true,
          make: true,
          colour: true,
          type: true,
        },
      },
      crew: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          member: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
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

const intelligenceEntityDetailInclude = {
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
  outgoingLinks: {
    include: {
      toEntity: true,
    },
  },
  incomingLinks: {
    include: {
      fromEntity: true,
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

router.get("/", async (req, res) => {
  try {
    const entities = await prisma.intelligenceEntity.findMany({
      include: intelligenceEntityDetailInclude,
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json(entities);
  } catch (error) {
    console.error("GET /intelligence failed:", error);
    res.status(500).json({ error: "Failed to fetch intelligence entities" });
  }
});

router.get("/observation-review", async (req, res) => {
  try {
    const events = await prisma.patrolEvent.findMany({
      where: {
        OR: [
          { type: "OBSERVATION" },
          { description: { contains: "Observation Type:", mode: "insensitive" } },
        ],
      },
      include: patrolEventIntelInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    res.json(events);
  } catch (error) {
    console.error("GET /intelligence/observation-review failed:", error);
    res.status(500).json({ error: "Failed to fetch observation review events" });
  }
});

router.post("/", async (req, res) => {
  req.url = "/entities";
  router.handle(req, res);
});

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
        ...intelligenceEntityDetailInclude,
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
      vehicleDetails,
    } = req.body;
    const vehiclePayload = vehicle || vehicleDetails;

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
          validEntityType(entityType) === "VEHICLE" && vehiclePayload?.registrationNumber
            ? {
                create: {
                  registrationNumber: String(vehiclePayload.registrationNumber).trim().toUpperCase(),
                  make: clean(vehiclePayload.make),
                  model: clean(vehiclePayload.model),
                  colour: clean(vehiclePayload.colour),
                  vehicleType: clean(vehiclePayload.vehicleType),
                  distinguishingMarks: clean(vehiclePayload.distinguishingMarks),
                  notes: clean(vehiclePayload.notes),
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
      vehicleDetails,
    } = req.body;
    const vehiclePayload = vehicle || vehicleDetails;

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

    if (vehiclePayload && updated.entityType === "VEHICLE") {
      await prisma.vOIVehicleDetails.upsert({
        where: { intelligenceEntityId: updated.id },
        update: {
          registrationNumber: vehiclePayload.registrationNumber
            ? String(vehiclePayload.registrationNumber).trim().toUpperCase()
            : updated.voivehicleDetails?.registrationNumber || "UNKNOWN",
          make: clean(vehiclePayload.make),
          model: clean(vehiclePayload.model),
          colour: clean(vehiclePayload.colour),
          vehicleType: clean(vehiclePayload.vehicleType),
          distinguishingMarks: clean(vehiclePayload.distinguishingMarks),
          notes: clean(vehiclePayload.notes),
        },
        create: {
          intelligenceEntityId: updated.id,
          registrationNumber: vehiclePayload.registrationNumber
            ? String(vehiclePayload.registrationNumber).trim().toUpperCase()
            : "UNKNOWN",
          make: clean(vehiclePayload.make),
          model: clean(vehiclePayload.model),
          colour: clean(vehiclePayload.colour),
          vehicleType: clean(vehiclePayload.vehicleType),
          distinguishingMarks: clean(vehiclePayload.distinguishingMarks),
          notes: clean(vehiclePayload.notes),
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

router.delete("/links/:id", async (req, res) => {
  try {
    const deleted = await prisma.intelligenceLink.delete({
      where: { id: req.params.id },
    });

    res.json(deleted);
  } catch (error) {
    console.error("DELETE /intelligence/links/:id failed:", error);
    res.status(500).json({ error: "Failed to delete intelligence link" });
  }
});

router.post("/promote/incident/:incidentId", async (req, res) => {
  try {
    const {
      entityType,
      displayName,
      description,
      riskLevel,
      status,
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

    const existingLink = await prisma.incidentVOILink.findFirst({
      where: {
        incidentId: incident.id,
      },
      include: {
        incident: true,
        intelligenceEntity: {
          include: {
            voivehicleDetails: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingLink) {
      return res.json({
        entity: existingLink.intelligenceEntity,
        link: existingLink,
        alreadyPromoted: true,
      });
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
        status: upper(status, "ACTIVE"),
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
      status,
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

    const existingLink = await prisma.patrolEventVOILink.findFirst({
      where: {
        patrolEventId: patrolEvent.id,
      },
      include: {
        patrolEvent: {
          include: patrolEventIntelInclude,
        },
        intelligenceEntity: {
          include: {
            voivehicleDetails: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingLink) {
      return res.json({
        entity: existingLink.intelligenceEntity,
        link: existingLink,
        alreadyPromoted: true,
      });
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
        status: upper(status, "ACTIVE"),
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

router.get("/:id/connections", async (req, res) => {
  try {
    const entity = await prisma.intelligenceEntity.findUnique({
      where: { id: req.params.id },
      include: intelligenceEntityDetailInclude,
    });

    if (!entity) {
      return res.status(404).json({ error: "Intelligence entity not found" });
    }

    res.json(entity);
  } catch (error) {
    console.error("GET /intelligence/:id/connections failed:", error);
    res.status(500).json({ error: "Failed to fetch intelligence profile" });
  }
});

router.patch("/:id", async (req, res) => {
  req.url = `/entities/${req.params.id}`;
  router.handle(req, res);
});

router.delete("/:id", async (req, res) => {
  try {
    const archived = await prisma.intelligenceEntity.update({
      where: { id: req.params.id },
      data: {
        status: "ARCHIVED",
      },
      include: intelligenceEntityDetailInclude,
    });

    res.json(archived);
  } catch (error) {
    console.error("DELETE /intelligence/:id failed:", error);
    res.status(500).json({ error: "Failed to archive intelligence entity" });
  }
});

export default router;
