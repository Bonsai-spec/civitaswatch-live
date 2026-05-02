import express from "express";
import { prisma } from "../config/db.js";

const router = express.Router();

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
};

const incidentInclude = {
  linkedPatrol: {
    include: patrolInclude,
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

function parseIncidentDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

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
        include: { sectors: true },
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