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

function toNullableDecimal(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriority(value) {
  const allowed = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  const normalized = String(value || "MEDIUM").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : null;
}

function normalizeStatus(value) {
  const allowed = new Set([
    "REPORTED",
    "ACKNOWLEDGED",
    "ASSIGNED",
    "EN_ROUTE",
    "ON_SCENE",
    "RESOLVED",
    "CLOSED",
    "CANCELLED",
  ]);
  const normalized = String(value || "").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : null;
}

function normalizeSource(value) {
  const allowed = new Set(["PATROLLER", "CONTROL_ROOM", "ADMIN", "SYSTEM", "IMPORT"]);
  const normalized = String(value || "PATROLLER").trim().toUpperCase();
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

function buildStatusTimestamps(status) {
  const now = new Date();
  const patch = {};

  if (status === "ACKNOWLEDGED") patch.acknowledgedAt = now;
  if (status === "ASSIGNED") patch.assignedAt = now;
  if (status === "EN_ROUTE") patch.dispatchedAt = now;
  if (status === "ON_SCENE") patch.onSceneAt = now;
  if (status === "RESOLVED") patch.resolvedAt = now;
  if (status === "CLOSED") patch.closedAt = now;

  return patch;
}

const incidentInclude = {
  patrol: {
    select: {
      id: true,
      sector: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  },
  reportedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
};

router.post("/report", requireAuth, async (req, res) => {
  try {
    const {
      patrolId,
      assignedToUserId,
      title,
      description,
      category,
      subCategory,
      priority,
      status,
      source,
      sector,
      locationText,
      address,
      latitude,
      longitude,
      liabilityAccepted,
      metadata,
    } = req.body;

    const normalizedTitle = toNullableString(title);
    const normalizedDescription = toNullableString(description);
    const normalizedCategory = toNullableString(category);
    const normalizedPriority = normalizePriority(priority);
    const normalizedStatus = normalizeStatus(status || "REPORTED");
    const normalizedSource = normalizeSource(source || "PATROLLER");
    const parsedLatitude = toNullableDecimal(latitude);
    const parsedLongitude = toNullableDecimal(longitude);

    if (!normalizedTitle) return badRequest(res, "Title is required.");
    if (!normalizedDescription) return badRequest(res, "Description is required.");
    if (!normalizedCategory) return badRequest(res, "Category is required.");
    if (!normalizedPriority) {
      return badRequest(res, "Priority must be LOW, MEDIUM, HIGH, or CRITICAL.");
    }
    if (!normalizedStatus) return badRequest(res, "Status is invalid.");
    if (!normalizedSource) return badRequest(res, "Source is invalid.");

    if (
      (latitude !== undefined || longitude !== undefined) &&
      (parsedLatitude === null || parsedLongitude === null)
    ) {
      return badRequest(res, "Latitude and longitude must both be valid numbers when supplied.");
    }

    if (patrolId) {
      const patrol = await prisma.patrol.findUnique({
        where: { id: patrolId },
        select: { id: true },
      });

      if (!patrol) {
        return badRequest(res, "Patrol not found for supplied patrolId.");
      }
    }

    if (assignedToUserId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToUserId },
        select: { id: true },
      });

      if (!assignee) {
        return badRequest(res, "Assigned user not found.");
      }
    }

    const incident = await prisma.incident.create({
      data: {
        incidentCode: buildIncidentCode(),
        patrolId: patrolId || null,
        reportedByUserId: req.user.id,
        assignedToUserId: assignedToUserId || null,
        title: normalizedTitle,
        description: normalizedDescription,
        category: normalizedCategory,
        subCategory: toNullableString(subCategory),
        priority: normalizedPriority,
        status: normalizedStatus,
        source: normalizedSource,
        sector: toNullableString(sector),
        locationText: toNullableString(locationText),
        address: toNullableString(address),
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        liabilityAccepted: Boolean(liabilityAccepted),
        liabilityAcceptedAt: liabilityAccepted ? new Date() : null,
        reportedAt: new Date(),
        metadata: metadata && typeof metadata === "object" ? metadata : null,
        ...buildStatusTimestamps(normalizedStatus),
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
        OR: [
          { reportedByUserId: req.user.id },
          { assignedToUserId: req.user.id },
        ],
      },
      orderBy: { reportedAt: "desc" },
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
    const {
      status,
      priority,
      category,
      sector,
      patrolId,
      assignedToUserId,
      reportedByUserId,
      limit,
    } = req.query;

    const where = {};

    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) return badRequest(res, "Invalid status filter.");
      where.status = normalized;
    }

    if (priority) {
      const normalized = normalizePriority(priority);
      if (!normalized) return badRequest(res, "Invalid priority filter.");
      where.priority = normalized;
    }

    if (category) where.category = String(category).trim();
    if (sector) where.sector = String(sector).trim();
    if (patrolId) where.patrolId = String(patrolId).trim();
    if (assignedToUserId) where.assignedToUserId = String(assignedToUserId).trim();
    if (reportedByUserId) where.reportedByUserId = String(reportedByUserId).trim();

    if (!isAdminLike(req.user.role)) {
      where.OR = [
        { reportedByUserId: req.user.id },
        { assignedToUserId: req.user.id },
      ];
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { reportedAt: "desc" },
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

    if (!incident) return notFound(res);

    const canView =
      isAdminLike(req.user.role) ||
      incident.reportedByUserId === req.user.id ||
      incident.assignedToUserId === req.user.id;

    if (!canView) {
      return res.status(403).json({ error: "You do not have access to this incident." });
    }

    return res.json(incident);
  } catch (error) {
    console.error("GET /incidents/:id failed:", error);
    return res.status(500).json({ error: "Failed to fetch incident." });
  }
});

router.patch("/:id/assign", requireAuth, async (req, res) => {
  try {
    if (!isAdminLike(req.user.role)) {
      return res.status(403).json({ error: "Only admin/control roles may assign incidents." });
    }

    const { assignedToUserId } = req.body;

    if (!assignedToUserId) {
      return badRequest(res, "assignedToUserId is required.");
    }

    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) return notFound(res);

    const assignee = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: { id: true },
    });

    if (!assignee) {
      return badRequest(res, "Assigned user not found.");
    }

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        assignedToUserId,
        status: "ASSIGNED",
        assignedAt: new Date(),
      },
      include: incidentInclude,
    });

    return res.json(incident);
  } catch (error) {
    console.error("PATCH /incidents/:id/assign failed:", error);
    return res.status(500).json({ error: "Failed to assign incident." });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = normalizeStatus(status);

    if (!normalizedStatus) {
      return badRequest(res, "Valid status is required.");
    }

    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: incidentInclude,
    });

    if (!existing) return notFound(res);

    const canUpdate =
      isAdminLike(req.user.role) ||
      existing.reportedByUserId === req.user.id ||
      existing.assignedToUserId === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ error: "You do not have permission to update this incident." });
    }

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: normalizedStatus,
        ...buildStatusTimestamps(normalizedStatus),
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
    const { resolutionNotes, status } = req.body;

    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: incidentInclude,
    });

    if (!existing) return notFound(res);

    const canResolve =
      isAdminLike(req.user.role) ||
      existing.assignedToUserId === req.user.id;

    if (!canResolve) {
      return res.status(403).json({ error: "You do not have permission to resolve this incident." });
    }

    const nextStatus = normalizeStatus(status || "RESOLVED");
    if (!nextStatus || !["RESOLVED", "CLOSED"].includes(nextStatus)) {
      return badRequest(res, "Resolve endpoint only accepts RESOLVED or CLOSED.");
    }

    const now = new Date();
    const data = {
      status: nextStatus,
      resolutionNotes: toNullableString(resolutionNotes),
      resolvedAt: existing.resolvedAt || now,
      ...(nextStatus === "CLOSED" ? { closedAt: now } : {}),
    };

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data,
      include: incidentInclude,
    });

    return res.json(incident);
  } catch (error) {
    console.error("PATCH /incidents/:id/resolve failed:", error);
    return res.status(500).json({ error: "Failed to resolve incident." });
  }
});

export default router;