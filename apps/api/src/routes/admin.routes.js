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
// Incident Codes and Incident Subcodes are implemented below as the first
// persistent master registers. Repeat the same CRUD pattern for:
// - /api/admin/service-types
// - /api/admin/infrastructure-types
// - /api/admin/emergency-contact-types
//
// These endpoints should be sector-scoped. Master Admin may manage shared
// templates; Sector Admin may manage local sector values. Control Room and
// Patrol should read active classification values only. Deletes may require
// confirmation, audit logging, and role checks.
const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ARCHIVED"];
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

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
};

const incidentInclude = {
  linkedPatrol: {
    include: patrolInclude,
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

    if (sectorId !== undefined) where.sectorId = cleanText(sectorId);

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

    if (!cleanCode || !cleanName) {
      return res.status(400).json({ error: "code and name are required." });
    }

    const parsedActive = parseOptionalBoolean(active);
    if (parsedActive === null) {
      return res.status(400).json({ error: "active must be true or false." });
    }

    const incidentCode = await prisma.incidentCode.create({
      data: {
        sectorId: cleanText(sectorId),
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

    if (sectorId !== undefined) data.sectorId = nullableText(sectorId);

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

    await prisma.incidentCode.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Code not found." });
    }

    if (err.code === "P2003") {
      return res.status(409).json({
        error: "Incident Code cannot be deleted while Incident Subcodes reference it.",
      });
    }

    console.error("DELETE /admin/incident-codes/:id failed:", err);
    res.status(500).json({ error: "Failed to delete incident code." });
  }
});

router.get("/incident-subcodes", async (req, res) => {
  try {
    const { sectorId, incidentCodeId, active } = req.query;
    const where = {};

    if (sectorId !== undefined) where.sectorId = cleanText(sectorId);
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
        sectorId: cleanText(sectorId),
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

    if (sectorId !== undefined) data.sectorId = nullableText(sectorId);

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

    await prisma.incidentSubcode.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Incident Subcode not found." });
    }

    console.error("DELETE /admin/incident-subcodes/:id failed:", err);
    res.status(500).json({ error: "Failed to delete incident subcode." });
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
    } = req.body;

    const data = {};

    if (title !== undefined) data.title = cleanText(title);
    if (incidentType !== undefined) data.incidentType = cleanText(incidentType);
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
