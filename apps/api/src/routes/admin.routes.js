import express from "express";
import { prisma } from "../config/db.js";

const router = express.Router();

// Admin "Incident Register" data currently represents operational incident
// reports/responses. It is not the future Incident Code/Subcode master register.
// Future configuration registers should remain separate from operational records
// such as incidents, responses, and patrol reports. Planned master registers
// include Incident Codes, Incident Subcodes, Service Types, Infrastructure Types,
// and Emergency Contact Types. Sector isolation should eventually scope both
// configuration registers and operational data, while Master Admin and Central
// Intelligence retain cross-sector oversight.
//
// Incident Codes, Incident Subcodes, Service Types, Infrastructure Types, and
// Emergency Contact Types are implemented below as the first persistent master
// registers.
//
// These endpoints should be sector-scoped. Master Admin may manage shared
// templates; Sector Admin may manage local sector values. Control Room and
// Patrol should read active classification values only. Master register removal
// should prefer deactivation so operational history can keep its references.
const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ARCHIVED"];
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const incidentCodeSelect = {
  id: true,
  code: true,
  name: true,
  priority: true,
};

const incidentSubcodeSelect = {
  id: true,
  subcode: true,
  name: true,
};

const patrolInclude = {
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
      type: true,
      colour: true,
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
  patrolEvents: {
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
    include: {
      incident: {
        select: {
          id: true,
          incidentCode: true,
          incidentCodeId: true,
          incidentSubcodeId: true,
          title: true,
          status: true,
          incidentCodeRef: {
            select: incidentCodeSelect,
          },
          incidentSubcodeRef: {
            select: incidentSubcodeSelect,
          },
        },
      },
      incidentCodeRef: {
        select: incidentCodeSelect,
      },
      incidentSubcodeRef: {
        select: incidentSubcodeSelect,
      },
      serviceTypeRef: {
        select: {
          id: true,
          type: true,
          category: true,
          controlRoomManaged: true,
        },
      },
      infrastructureTypeRef: {
        select: {
          id: true,
          type: true,
          riskLevel: true,
          requiresLocation: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  },
};

const incidentInclude = {
  linkedPatrol: {
    include: patrolInclude,
  },
  patrolEvents: {
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
    select: {
      id: true,
      patrolId: true,
      incidentId: true,
      type: true,
      description: true,
      createdAt: true,
      incidentCodeId: true,
      incidentSubcodeId: true,
      referenceNumber: true,
      streetNumber: true,
      streetName: true,
      suburb: true,
      locationNotes: true,
      latitude: true,
      longitude: true,
      incidentCodeRef: {
        select: incidentCodeSelect,
      },
      incidentSubcodeRef: {
        select: incidentSubcodeSelect,
      },
    },
  },
  incidentCodeRef: {
    select: incidentCodeSelect,
  },
  incidentSubcodeRef: {
    select: incidentSubcodeSelect,
  },
};

const incidentSubcodeInclude = {
  incidentCode: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
};

function buildIncidentCode() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `INC-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

// Sector Admin users normally work inside their assigned sector; Master Admin
// may override sectorId explicitly when managing shared or cross-sector data.
function resolveSectorId(req, providedSectorId) {
  if (providedSectorId !== undefined) {
    return providedSectorId;
  }

  return (
    req.user?.sectorId ||
    req.user?.defaultSectorId ||
    req.user?.sectors?.[0]?.id ||
    null
  );
}

function parseOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return null;
}

function nullableText(value) {
  return value === undefined ? undefined : cleanText(value);
}

function parseIncidentDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

router.get("/incident-codes", async (req, res) => {
  try {
    const { sectorId, active } = req.query;
    const where = {};
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (resolvedSectorId) where.sectorId = resolvedSectorId;

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      where.active = parsedActive;
    }

    const incidentCodes = await prisma.incidentCode.findMany({
      where,
      orderBy: { code: "asc" },
    });

    res.json(incidentCodes);
  } catch (err) {
    console.error("GET /admin/incident-codes failed:", err);
    res.status(500).json({ error: "Failed to fetch incident codes." });
  }
});

router.post("/incident-codes", async (req, res) => {
  try {
    const { sectorId, code, name, priority, active, templateSourceId } = req.body;
    const cleanCode = cleanText(code);
    const cleanName = cleanText(name);
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (!cleanCode || !cleanName) {
      return res.status(400).json({ error: "code and name are required." });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const incidentCode = await prisma.incidentCode.create({
      data: {
        sectorId: resolvedSectorId,
        code: cleanCode,
        name: cleanName,
        priority: cleanText(priority) || "Medium",
        active: parsedActive === undefined ? true : parsedActive,
        templateSourceId: cleanText(templateSourceId),
      },
    });

    res.status(201).json(incidentCode);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Incident Code already exists for this sector." });
    }

    console.error("POST /admin/incident-codes failed:", err);
    res.status(500).json({ error: "Failed to create incident code." });
  }
});

router.patch("/incident-codes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, code, name, priority, active, templateSourceId } = req.body;
    const data = {};

    if (sectorId !== undefined) data.sectorId = cleanText(resolveSectorId(req, sectorId));

    if (code !== undefined) {
      const cleanCode = cleanText(code);
      if (!cleanCode) {
        return res.status(400).json({ error: "code cannot be empty." });
      }
      data.code = cleanCode;
    }

    if (name !== undefined) {
      const cleanName = cleanText(name);
      if (!cleanName) {
        return res.status(400).json({ error: "name cannot be empty." });
      }
      data.name = cleanName;
    }

    if (priority !== undefined) data.priority = cleanText(priority) || "Medium";

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      data.active = parsedActive;
    }

    if (templateSourceId !== undefined) {
      data.templateSourceId = nullableText(templateSourceId);
    }

    const incidentCode = await prisma.incidentCode.update({
      where: { id },
      data,
    });

    res.json(incidentCode);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Code not found." });
    }

    if (err.code === "P2002") {
      return res.status(409).json({ error: "Incident Code already exists for this sector." });
    }

    console.error("PATCH /admin/incident-codes/:id failed:", err);
    res.status(500).json({ error: "Failed to update incident code." });
  }
});

router.delete("/incident-codes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const incidentCode = await prisma.incidentCode.update({
      where: { id },
      data: { active: false },
    });

    res.json(incidentCode);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Code not found." });
    }

    console.error("DELETE /admin/incident-codes/:id failed:", err);
    res.status(500).json({ error: "Failed to deactivate incident code." });
  }
});

router.get("/incident-subcodes", async (req, res) => {
  try {
    const { sectorId, incidentCodeId, active } = req.query;
    const where = {};
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (resolvedSectorId) where.sectorId = resolvedSectorId;
    if (incidentCodeId !== undefined) where.incidentCodeId = cleanText(incidentCodeId);

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      where.active = parsedActive;
    }

    const incidentSubcodes = await prisma.incidentSubcode.findMany({
      where,
      include: incidentSubcodeInclude,
      orderBy: { subcode: "asc" },
    });

    res.json(incidentSubcodes);
  } catch (err) {
    console.error("GET /admin/incident-subcodes failed:", err);
    res.status(500).json({ error: "Failed to fetch incident subcodes." });
  }
});

router.post("/incident-subcodes", async (req, res) => {
  try {
    const { sectorId, incidentCodeId, subcode, name, active, templateSourceId } = req.body;
    const cleanIncidentCodeId = cleanText(incidentCodeId);
    const cleanSubcode = cleanText(subcode);
    const cleanName = cleanText(name);
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (!cleanIncidentCodeId || !cleanSubcode || !cleanName) {
      return res.status(400).json({
        error: "incidentCodeId, subcode and name are required.",
      });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const incidentSubcode = await prisma.incidentSubcode.create({
      data: {
        sectorId: resolvedSectorId,
        incidentCodeId: cleanIncidentCodeId,
        subcode: cleanSubcode,
        name: cleanName,
        active: parsedActive === undefined ? true : parsedActive,
        templateSourceId: cleanText(templateSourceId),
      },
      include: incidentSubcodeInclude,
    });

    res.status(201).json(incidentSubcode);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Incident Subcode already exists for this code." });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid incidentCodeId." });
    }

    console.error("POST /admin/incident-subcodes failed:", err);
    res.status(500).json({ error: "Failed to create incident subcode." });
  }
});

router.patch("/incident-subcodes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, incidentCodeId, subcode, name, active, templateSourceId } = req.body;
    const data = {};

    if (sectorId !== undefined) data.sectorId = cleanText(resolveSectorId(req, sectorId));

    if (incidentCodeId !== undefined) {
      const cleanIncidentCodeId = cleanText(incidentCodeId);
      if (!cleanIncidentCodeId) {
        return res.status(400).json({ error: "incidentCodeId cannot be empty." });
      }
      data.incidentCodeId = cleanIncidentCodeId;
    }

    if (subcode !== undefined) {
      const cleanSubcode = cleanText(subcode);
      if (!cleanSubcode) {
        return res.status(400).json({ error: "subcode cannot be empty." });
      }
      data.subcode = cleanSubcode;
    }

    if (name !== undefined) {
      const cleanName = cleanText(name);
      if (!cleanName) {
        return res.status(400).json({ error: "name cannot be empty." });
      }
      data.name = cleanName;
    }

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      data.active = parsedActive;
    }

    if (templateSourceId !== undefined) {
      data.templateSourceId = nullableText(templateSourceId);
    }

    const incidentSubcode = await prisma.incidentSubcode.update({
      where: { id },
      data,
      include: incidentSubcodeInclude,
    });

    res.json(incidentSubcode);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Subcode not found." });
    }

    if (err.code === "P2002") {
      return res.status(409).json({ error: "Incident Subcode already exists for this code." });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid incidentCodeId." });
    }

    console.error("PATCH /admin/incident-subcodes/:id failed:", err);
    res.status(500).json({ error: "Failed to update incident subcode." });
  }
});

router.delete("/incident-subcodes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const incidentSubcode = await prisma.incidentSubcode.update({
      where: { id },
      data: { active: false },
      include: incidentSubcodeInclude,
    });

    res.json(incidentSubcode);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Subcode not found." });
    }

    console.error("DELETE /admin/incident-subcodes/:id failed:", err);
    res.status(500).json({ error: "Failed to deactivate incident subcode." });
  }
});

router.get("/service-types", async (req, res) => {
  try {
    const { sectorId, active, controlRoomManaged, category } = req.query;
    const where = {};
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (resolvedSectorId) where.sectorId = resolvedSectorId;
    if (category !== undefined) where.category = cleanText(category);

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      where.active = parsedActive;
    }

    if (controlRoomManaged !== undefined) {
      const parsedControlRoomManaged = parseOptionalBoolean(controlRoomManaged);
      if (parsedControlRoomManaged === null) {
        return res.status(400).json({ error: "controlRoomManaged must be true or false." });
      }
      where.controlRoomManaged = parsedControlRoomManaged;
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where,
      orderBy: { type: "asc" },
    });

    res.json(serviceTypes);
  } catch (err) {
    console.error("GET /admin/service-types failed:", err);
    res.status(500).json({ error: "Failed to fetch service types." });
  }
});

router.post("/service-types", async (req, res) => {
  try {
    const { sectorId, type, category, controlRoomManaged, active, templateSourceId } = req.body;
    const cleanType = cleanText(type);
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (!cleanType) {
      return res.status(400).json({ error: "type is required." });
    }

    const parsedControlRoomManaged = parseOptionalBoolean(controlRoomManaged);
    if (parsedControlRoomManaged === null) {
      return res.status(400).json({ error: "controlRoomManaged must be true or false." });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const serviceType = await prisma.serviceType.create({
      data: {
        sectorId: resolvedSectorId,
        type: cleanType,
        category: cleanText(category) || "Emergency",
        controlRoomManaged:
          parsedControlRoomManaged === undefined ? true : parsedControlRoomManaged,
        active: parsedActive === undefined ? true : parsedActive,
        templateSourceId: cleanText(templateSourceId),
      },
    });

    res.status(201).json(serviceType);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Service Type already exists for this sector." });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("POST /admin/service-types failed:", err);
    res.status(500).json({ error: "Failed to create service type." });
  }
});

router.patch("/service-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, type, category, controlRoomManaged, active, templateSourceId } = req.body;
    const data = {};

    if (sectorId !== undefined) data.sectorId = cleanText(resolveSectorId(req, sectorId));

    if (type !== undefined) {
      const cleanType = cleanText(type);
      if (!cleanType) {
        return res.status(400).json({ error: "type cannot be empty." });
      }
      data.type = cleanType;
    }

    if (category !== undefined) data.category = cleanText(category) || "Emergency";

    if (controlRoomManaged !== undefined) {
      const parsedControlRoomManaged = parseOptionalBoolean(controlRoomManaged);
      if (parsedControlRoomManaged === null) {
        return res.status(400).json({ error: "controlRoomManaged must be true or false." });
      }
      data.controlRoomManaged = parsedControlRoomManaged;
    }

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      data.active = parsedActive;
    }

    if (templateSourceId !== undefined) {
      data.templateSourceId = nullableText(templateSourceId);
    }

    const serviceType = await prisma.serviceType.update({
      where: { id },
      data,
    });

    res.json(serviceType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Service Type not found." });
    }

    if (err.code === "P2002") {
      return res.status(409).json({ error: "Service Type already exists for this sector." });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("PATCH /admin/service-types/:id failed:", err);
    res.status(500).json({ error: "Failed to update service type." });
  }
});

router.delete("/service-types/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const serviceType = await prisma.serviceType.update({
      where: { id },
      data: { active: false },
    });

    res.json(serviceType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Service Type not found." });
    }

    console.error("DELETE /admin/service-types/:id failed:", err);
    res.status(500).json({ error: "Failed to deactivate service type." });
  }
});

router.get("/infrastructure-types", async (req, res) => {
  try {
    const { sectorId, active, requiresLocation, riskLevel } = req.query;
    const where = {};
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (resolvedSectorId) where.sectorId = resolvedSectorId;
    if (riskLevel !== undefined) where.riskLevel = cleanText(riskLevel);

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      where.active = parsedActive;
    }

    if (requiresLocation !== undefined) {
      const parsedRequiresLocation = parseOptionalBoolean(requiresLocation);
      if (parsedRequiresLocation === null) {
        return res.status(400).json({ error: "requiresLocation must be true or false." });
      }
      where.requiresLocation = parsedRequiresLocation;
    }

    const infrastructureTypes = await prisma.infrastructureType.findMany({
      where,
      orderBy: { type: "asc" },
    });

    res.json(infrastructureTypes);
  } catch (err) {
    console.error("GET /admin/infrastructure-types failed:", err);
    res.status(500).json({ error: "Failed to fetch infrastructure types." });
  }
});

router.post("/infrastructure-types", async (req, res) => {
  try {
    const { sectorId, type, riskLevel, requiresLocation, active, templateSourceId } = req.body;
    const cleanType = cleanText(type);
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (!cleanType) {
      return res.status(400).json({ error: "type is required." });
    }

    const parsedRequiresLocation = parseOptionalBoolean(requiresLocation);
    if (parsedRequiresLocation === null) {
      return res.status(400).json({ error: "requiresLocation must be true or false." });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const infrastructureType = await prisma.infrastructureType.create({
      data: {
        sectorId: resolvedSectorId,
        type: cleanType,
        riskLevel: cleanText(riskLevel) || "Medium",
        requiresLocation: parsedRequiresLocation === undefined ? true : parsedRequiresLocation,
        active: parsedActive === undefined ? true : parsedActive,
        templateSourceId: cleanText(templateSourceId),
      },
    });

    res.status(201).json(infrastructureType);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "Infrastructure Type already exists for this sector.",
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("POST /admin/infrastructure-types failed:", err);
    res.status(500).json({ error: "Failed to create infrastructure type." });
  }
});

router.patch("/infrastructure-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, type, riskLevel, requiresLocation, active, templateSourceId } = req.body;
    const data = {};

    if (sectorId !== undefined) data.sectorId = cleanText(resolveSectorId(req, sectorId));

    if (type !== undefined) {
      const cleanType = cleanText(type);
      if (!cleanType) {
        return res.status(400).json({ error: "type cannot be empty." });
      }
      data.type = cleanType;
    }

    if (riskLevel !== undefined) data.riskLevel = cleanText(riskLevel) || "Medium";

    if (requiresLocation !== undefined) {
      const parsedRequiresLocation = parseOptionalBoolean(requiresLocation);
      if (parsedRequiresLocation === null) {
        return res.status(400).json({ error: "requiresLocation must be true or false." });
      }
      data.requiresLocation = parsedRequiresLocation;
    }

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      data.active = parsedActive;
    }

    if (templateSourceId !== undefined) {
      data.templateSourceId = nullableText(templateSourceId);
    }

    const infrastructureType = await prisma.infrastructureType.update({
      where: { id },
      data,
    });

    res.json(infrastructureType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Infrastructure Type not found." });
    }

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "Infrastructure Type already exists for this sector.",
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("PATCH /admin/infrastructure-types/:id failed:", err);
    res.status(500).json({ error: "Failed to update infrastructure type." });
  }
});

router.delete("/infrastructure-types/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const infrastructureType = await prisma.infrastructureType.update({
      where: { id },
      data: { active: false },
    });

    res.json(infrastructureType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Infrastructure Type not found." });
    }

    console.error("DELETE /admin/infrastructure-types/:id failed:", err);
    res.status(500).json({ error: "Failed to deactivate infrastructure type." });
  }
});

router.get("/emergency-contact-types", async (req, res) => {
  try {
    const { sectorId, active, sectorSpecific, escalationLevel } = req.query;
    const where = {};
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (resolvedSectorId) where.sectorId = resolvedSectorId;
    if (escalationLevel !== undefined) where.escalationLevel = cleanText(escalationLevel);

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      where.active = parsedActive;
    }

    if (sectorSpecific !== undefined) {
      const parsedSectorSpecific = parseOptionalBoolean(sectorSpecific);
      if (parsedSectorSpecific === null) {
        return res.status(400).json({ error: "sectorSpecific must be true or false." });
      }
      where.sectorSpecific = parsedSectorSpecific;
    }

    const emergencyContactTypes = await prisma.emergencyContactType.findMany({
      where,
      orderBy: { type: "asc" },
    });

    res.json(emergencyContactTypes);
  } catch (err) {
    console.error("GET /admin/emergency-contact-types failed:", err);
    res.status(500).json({ error: "Failed to fetch emergency contact types." });
  }
});

router.post("/emergency-contact-types", async (req, res) => {
  try {
    const { sectorId, type, escalationLevel, sectorSpecific, active, templateSourceId } = req.body;
    const cleanType = cleanText(type);
    const resolvedSectorId = cleanText(resolveSectorId(req, sectorId));

    if (!cleanType) {
      return res.status(400).json({ error: "type is required." });
    }

    const parsedSectorSpecific = parseOptionalBoolean(sectorSpecific);
    if (parsedSectorSpecific === null) {
      return res.status(400).json({ error: "sectorSpecific must be true or false." });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const emergencyContactType = await prisma.emergencyContactType.create({
      data: {
        sectorId: resolvedSectorId,
        type: cleanType,
        escalationLevel: cleanText(escalationLevel) || "Level 1",
        sectorSpecific: parsedSectorSpecific === undefined ? true : parsedSectorSpecific,
        active: parsedActive === undefined ? true : parsedActive,
        templateSourceId: cleanText(templateSourceId),
      },
    });

    res.status(201).json(emergencyContactType);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "Emergency Contact Type already exists for this sector.",
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("POST /admin/emergency-contact-types failed:", err);
    res.status(500).json({ error: "Failed to create emergency contact type." });
  }
});

router.patch("/emergency-contact-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, type, escalationLevel, sectorSpecific, active, templateSourceId } = req.body;
    const data = {};

    if (sectorId !== undefined) data.sectorId = cleanText(resolveSectorId(req, sectorId));

    if (type !== undefined) {
      const cleanType = cleanText(type);
      if (!cleanType) {
        return res.status(400).json({ error: "type cannot be empty." });
      }
      data.type = cleanType;
    }

    if (escalationLevel !== undefined) {
      data.escalationLevel = cleanText(escalationLevel) || "Level 1";
    }

    if (sectorSpecific !== undefined) {
      const parsedSectorSpecific = parseOptionalBoolean(sectorSpecific);
      if (parsedSectorSpecific === null) {
        return res.status(400).json({ error: "sectorSpecific must be true or false." });
      }
      data.sectorSpecific = parsedSectorSpecific;
    }

    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active);
      if (parsedActive === null) {
        return res.status(400).json({ error: "active must be true or false." });
      }
      data.active = parsedActive;
    }

    if (templateSourceId !== undefined) {
      data.templateSourceId = nullableText(templateSourceId);
    }

    const emergencyContactType = await prisma.emergencyContactType.update({
      where: { id },
      data,
    });

    res.json(emergencyContactType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Emergency Contact Type not found." });
    }

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "Emergency Contact Type already exists for this sector.",
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid sectorId." });
    }

    console.error("PATCH /admin/emergency-contact-types/:id failed:", err);
    res.status(500).json({ error: "Failed to update emergency contact type." });
  }
});

router.delete("/emergency-contact-types/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const emergencyContactType = await prisma.emergencyContactType.update({
      where: { id },
      data: { active: false },
    });

    res.json(emergencyContactType);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Emergency Contact Type not found." });
    }

    console.error("DELETE /admin/emergency-contact-types/:id failed:", err);
    res.status(500).json({ error: "Failed to deactivate emergency contact type." });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const { status, sector, severity, incidentType, includeArchived } = req.query;

    const where = {};

    if (status && status !== "ALL") {
      where.status = String(status).toUpperCase();
    } else if (includeArchived !== "true") {
      where.status = { not: "ARCHIVED" };
    }

    if (sector && sector !== "ALL") where.sector = String(sector);
    if (severity && severity !== "ALL") where.severity = String(severity).toUpperCase();
    if (incidentType && incidentType !== "ALL") where.incidentType = String(incidentType);

    const [incidents, patrols, organisations] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: incidentInclude,
        orderBy: { reportedAt: "desc" },
        take: 50,
      }),
      prisma.patrolSession.findMany({
        include: patrolInclude,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.organisation.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    res.json({ incidents, patrols, organisations });
  } catch (err) {
    console.error("GET /admin/dashboard failed:", err);
    res.status(500).json({ error: "Dashboard failed" });
  }
});

router.post("/incidents", async (req, res) => {
  try {
    const {
      title,
      incidentType,
      street,
      suburb,
      description,
      sector,
      severity,
      date,
      time,
      incidentCodeId,
      incidentSubcodeId,
    } = req.body;

    if (!title || !incidentType || !street || !suburb || !sector || !severity || !date || !time) {
      return res.status(400).json({
        error: "Title, type, street, suburb, sector, severity, date and time are required.",
      });
    }

    const normalizedSeverity = String(severity).toUpperCase();

    if (!VALID_SEVERITIES.includes(normalizedSeverity)) {
      return res.status(400).json({
        error: `Invalid severity. Use one of: ${VALID_SEVERITIES.join(", ")}`,
      });
    }

    const incidentDateTime = parseIncidentDateTime(date, time);

    if (!incidentDateTime) {
      return res.status(400).json({ error: "Invalid incident date or time." });
    }

    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return res.status(400).json({ error: "No user found. Create a user first." });
    }

    const incident = await prisma.incident.create({
      data: {
        incidentCode: buildIncidentCode(),
        title: cleanText(title),
        description: cleanText(description),
        incidentType: cleanText(incidentType),
        incidentCodeId: cleanText(incidentCodeId),
        incidentSubcodeId: cleanText(incidentSubcodeId),
        street: cleanText(street),
        suburb: cleanText(suburb),
        sector: cleanText(sector),
        severity: normalizedSeverity,
        status: "OPEN",
        source: "ADMIN",
        createdByUserId: user.id,
        reportedAt: incidentDateTime,
        occurredAt: incidentDateTime,
      },
      include: incidentInclude,
    });

    res.status(201).json(incident);
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid incidentCodeId or incidentSubcodeId." });
    }

    console.error("POST /admin/incidents failed:", err);
    res.status(500).json({ error: "Failed to create incident." });
  }
});

router.patch("/incidents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      incidentType,
      street,
      suburb,
      description,
      sector,
      severity,
      status,
      date,
      time,
      linkedPatrolId,
      incidentCodeId,
      incidentSubcodeId,
    } = req.body;

    const data = {};

    if (title !== undefined) data.title = cleanText(title);
    if (incidentType !== undefined) data.incidentType = cleanText(incidentType);
    if (incidentCodeId !== undefined) data.incidentCodeId = cleanText(incidentCodeId);
    if (incidentSubcodeId !== undefined) data.incidentSubcodeId = cleanText(incidentSubcodeId);
    if (street !== undefined) data.street = cleanText(street);
    if (suburb !== undefined) data.suburb = cleanText(suburb);
    if (description !== undefined) data.description = cleanText(description);
    if (sector !== undefined) data.sector = cleanText(sector);

    if (severity !== undefined) {
      const normalizedSeverity = String(severity).toUpperCase();
      if (!VALID_SEVERITIES.includes(normalizedSeverity)) {
        return res.status(400).json({
          error: `Invalid severity. Use one of: ${VALID_SEVERITIES.join(", ")}`,
        });
      }
      data.severity = normalizedSeverity;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status).toUpperCase();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          error: `Invalid status. Use one of: ${VALID_STATUSES.join(", ")}`,
        });
      }
      data.status = normalizedStatus;
    }

    if (date !== undefined && time !== undefined) {
      const incidentDateTime = parseIncidentDateTime(date, time);
      if (!incidentDateTime) {
        return res.status(400).json({ error: "Invalid incident date or time." });
      }
      data.reportedAt = incidentDateTime;
      data.occurredAt = incidentDateTime;
    }

    if (linkedPatrolId !== undefined) {
      data.linkedPatrolId = linkedPatrolId || null;
    }

    const incident = await prisma.incident.update({
      where: { id },
      data,
      include: incidentInclude,
    });

    res.json(incident);
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Invalid incidentCodeId or incidentSubcodeId." });
    }

    console.error("PATCH /admin/incidents/:id failed:", err);
    res.status(500).json({ error: "Failed to update incident." });
  }
});

router.patch("/incidents/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body.status || "").toUpperCase();

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Use one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: { status },
      include: incidentInclude,
    });

    res.json(incident);
  } catch (err) {
    console.error("PATCH /admin/incidents/:id/status failed:", err);
    res.status(500).json({ error: "Failed to update incident status." });
  }
});

router.patch("/incidents/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: incidentInclude,
    });

    res.json(incident);
  } catch (err) {
    console.error("PATCH /admin/incidents/:id/archive failed:", err);
    res.status(500).json({ error: "Failed to archive incident." });
  }
});

router.delete("/incidents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.incident.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /admin/incidents/:id failed:", err);
    res.status(500).json({ error: "Failed to delete incident." });
  }
});

router.patch("/incidents/:id/assign-patrol", async (req, res) => {
  try {
    const { id } = req.params;
    const { patrolId } = req.body;

    if (!patrolId) {
      return res.status(400).json({ error: "patrolId is required." });
    }

    const patrol = await prisma.patrolSession.findUnique({
      where: { id: patrolId },
      include: patrolInclude,
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol not found." });
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        linkedPatrolId: patrolId,
        status: "IN_PROGRESS",
      },
      include: incidentInclude,
    });

    res.json(incident);
  } catch (err) {
    console.error("PATCH /admin/incidents/:id/assign-patrol failed:", err);
    res.status(500).json({ error: "Failed to assign patrol." });
  }
});

router.patch("/incidents/:id/unassign-patrol", async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.update({
      where: { id },
      data: { linkedPatrolId: null },
      include: incidentInclude,
    });

    res.json(incident);
  } catch (err) {
    console.error("PATCH /admin/incidents/:id/unassign-patrol failed:", err);
    res.status(500).json({ error: "Failed to unassign patrol." });
  }
});

export default router;
