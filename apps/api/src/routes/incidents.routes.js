import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const ADMIN_ROLES = new Set(["ADMIN", "MASTER_ADMIN", "CONTROL_ROOM"]);

function isAdminLike(role) {
  return ADMIN_ROLES.has(String(role || "").toUpperCase());
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function notFound(res, message = "Incident not found.") {
  return res.status(404).json({ error: message });
}

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizeSeverity(value) {
  const allowed = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  const normalized = String(value || "MEDIUM").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : null;
}

function normalizeStatus(value) {
  const allowed = new Set(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
  const normalized = String(value || "OPEN").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : null;
}

function normalizeSource(value) {
  const allowed = new Set(["PATROL", "CONTROL_ROOM", "ADMIN", "SYSTEM", "PUBLIC"]);
  const normalized = String(value || "PATROL").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : null;
}

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

const incidentInclude = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
  linkedPatrol: {
    select: {
      id: true,
      sector: true,
      status: true,
      startTime: true,
      endTime: true,
      startKm: true,
      endKm: true,
      totalKm: true,
    },
  },
  patrolEvents: {
    select: {
      id: true,
      patrolId: true,
      incidentId: true,
      type: true,
      incidentCode: true,
      description: true,
      assistance: true,
      sceneActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
};

router.post("/report", requireAuth, async (req, res) => {
  try {
    const {
      incidentCode,
      title,
      description,
      sector,
      severity,
      status,
      source,
      linkedPatrolId,
      occurredAt,
    } = req.body;

    const normalizedTitle = toNullableString(title);
    const normalizedDescription = toNullableString(description);
    const normalizedSector = toNullableString(sector);
    const normalizedSeverity = normalizeSeverity(severity);
    const normalizedStatus = normalizeStatus(status || "OPEN");
    const normalizedSource = normalizeSource(source || "PATROL");
    const normalizedIncidentCode = toNullableString(incidentCode) || buildIncidentCode();

    if (!normalizedTitle) {
      return badRequest(res, "Title is required.");
    }

    if (!normalizedSector) {
      return badRequest(res, "Sector is required.");
    }

    if (!normalizedSeverity) {
      return badRequest(res, "Severity must be LOW, MEDIUM, HIGH, or CRITICAL.");
    }

    if (!normalizedStatus) {
      return badRequest(res, "Status must be OPEN, IN_PROGRESS, RESOLVED, or CLOSED.");
    }

    if (!normalizedSource) {
      return badRequest(res, "Source is invalid.");
    }

    if (linkedPatrolId) {
      const patrol = await prisma.patrolSession.findUnique({
        where: { id: linkedPatrolId },
        select: { id: true },
      });

      if (!patrol) {
        return badRequest(res, "Linked patrol not found.");
      }
    }

    const incident = await prisma.incident.create({
      data: {
        incidentCode: normalizedIncidentCode,
        title: normalizedTitle,
        description: normalizedDescription,
        sector: normalizedSector,
        severity: normalizedSeverity,
        status: normalizedStatus,
        source: normalizedSource,
        linkedPatrolId: linkedPatrolId || null,
        createdByUserId: req.user.id,
        reportedAt: new Date(),
        occurredAt: occurredAt ? new Date(occurredAt) : null,
      },
      include: incidentInclude,
    });

    return res.status(201).json(incident);
  } catch (error) {
    console.error("POST /incidents/report failed:", error);
    return res.status(500).json({ error: "Failed to create incident." });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        createdByUserId: req.user.id,
      },
      orderBy: {
        reportedAt: "desc",
      },
      include: incidentInclude,
    });

    return res.json(incidents);
  } catch (error) {
    console.error("GET /incidents/mine failed:", error);
    return res.status(500).json({ error: "Failed to fetch incidents." });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, severity, sector, linkedPatrolId, createdByUserId, limit } = req.query;

    const where = {};

    if (status) {
      const normalizedStatus = normalizeStatus(status);
      if (!normalizedStatus) {
        return badRequest(res, "Invalid status filter.");
      }
      where.status = normalizedStatus;
    }

    if (severity) {
      const normalizedSeverity = normalizeSeverity(severity);
      if (!normalizedSeverity) {
        return badRequest(res, "Invalid severity filter.");
      }
      where.severity = normalizedSeverity;
    }

    if (sector) {
      where.sector = String(sector).trim();
    }

    if (linkedPatrolId) {
      where.linkedPatrolId = String(linkedPatrolId).trim();
    }

    if (!isAdminLike(req.user.role)) {
      where.createdByUserId = req.user.id;
    } else if (createdByUserId) {
      where.createdByUserId = String(createdByUserId).trim();
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: {
        reportedAt: "desc",
      },
      take,
      include: incidentInclude,
    });

    return res.json(incidents);
  } catch (error) {
    console.error("GET /incidents failed:", error);
    return res.status(500).json({ error: "Failed to fetch incidents." });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: incidentInclude,
    });

    if (!incident) {
      return notFound(res);
    }

    const canView = isAdminLike(req.user.role) || incident.createdByUserId === req.user.id;

    if (!canView) {
      return res.status(403).json({ error: "You do not have access to this incident." });
    }

    return res.json(incident);
  } catch (error) {
    console.error("GET /incidents/:id failed:", error);
    return res.status(500).json({ error: "Failed to fetch incident." });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return badRequest(res, "Status must be OPEN, IN_PROGRESS, RESOLVED, or CLOSED.");
    }

    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: incidentInclude,
    });

    if (!existing) {
      return notFound(res);
    }

    const canUpdate = isAdminLike(req.user.role) || existing.createdByUserId === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ error: "You do not have permission to update this incident." });
    }

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: normalizedStatus,
      },
      include: incidentInclude,
    });

    return res.json(incident);
  } catch (error) {
    console.error("PATCH /incidents/:id/status failed:", error);
    return res.status(500).json({ error: "Failed to update incident status." });
  }
});

router.patch("/:id/resolve", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: incidentInclude,
    });

    if (!existing) {
      return notFound(res);
    }

    const canResolve = isAdminLike(req.user.role) || existing.createdByUserId === req.user.id;

    if (!canResolve) {
      return res.status(403).json({ error: "You do not have permission to resolve this incident." });
    }

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: "RESOLVED",
      },
      include: incidentInclude,
    });

    return res.json(incident);
  } catch (error) {
    console.error("PATCH /incidents/:id/resolve failed:", error);
    return res.status(500).json({ error: "Failed to resolve incident." });
  }
});

export default router;