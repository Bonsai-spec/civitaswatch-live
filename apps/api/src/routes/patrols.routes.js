// apps/api/src/routes/patrols.routes.js

import express from "express";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// =================================
// ACTIVE PATROLS
// GET /patrols/active
// =================================
router.get("/active", requireAuth, async (req, res) => {
  try {
    const patrols = await prisma.patrolSession.findMany({
      where: {
        status: {
          in: ["ACTIVE", "EN_ROUTE", "ON_SCENE", "STAND_DOWN", "MOBILE"],
        },
      },
      include: {
        user: true,
        vehicle: true,
      },
      orderBy: {
        startTime: "desc",
      },
    });

    res.json(patrols);
  } catch (err) {
    console.error("ACTIVE patrols error:", err);
    res.status(500).json({ error: "Failed to load active patrols" });
  }
});

// =================================
// START PATROL
// POST /patrols/start
// =================================
router.post("/start", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { vehicleId, sector, startKm } = req.body;

    if (!vehicleId || !sector || startKm === undefined) {
      return res.status(400).json({
        error: "vehicleId, sector, startKm required",
      });
    }

    const existing = await prisma.patrolSession.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ["ACTIVE", "EN_ROUTE", "ON_SCENE", "STAND_DOWN", "MOBILE"],
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "User already has active patrol",
      });
    }

    const patrol = await prisma.patrolSession.create({
      data: {
        userId: user.id,
        vehicleId,
        sector,
        startKm: Number(startKm),
        status: "ACTIVE",
        startTime: new Date(),
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    res.status(201).json(patrol);
  } catch (err) {
    console.error("START patrol error:", err);
    res.status(500).json({ error: "Failed to start patrol" });
  }
});

// =================================
// END PATROL
// POST /patrols/:id/end
// =================================
router.post("/:id/end", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { endKm, summary } = req.body;

    const patrol = await prisma.patrolSession.findUnique({
      where: { id },
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol not found" });
    }

    if (patrol.status === "COMPLETED") {
      return res.status(400).json({ error: "Patrol already completed" });
    }

    const end = Number(endKm);
    const start = Number(patrol.startKm);

    if (Number.isNaN(end)) {
      return res.status(400).json({ error: "Invalid end KM" });
    }

    if (end < start) {
      return res.status(400).json({
        error: "End KM cannot be less than start KM",
      });
    }

    const updated = await prisma.patrolSession.update({
      where: { id },
      data: {
        endKm: end,
        totalKm: end - start,
        summary: summary || null,
        status: "COMPLETED",
        endTime: new Date(),
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("END patrol error:", err);
    res.status(500).json({ error: "Failed to end patrol" });
  }
});

// =================================
// EXISTING REPORT + AUDIT CODE
// =================================

function auditValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function isAllowedOperationalRole(user) {
  return ["ADMIN", "MASTER_ADMIN", "CONTROL_ROOM"].includes(user?.role);
}

function buildPatrolReportWhere(query = {}) {
  const where = {};

  if (query.sector && query.sector !== "ALL") {
    where.sector = query.sector;
  }

  if (query.vehicleId && query.vehicleId !== "ALL") {
    where.vehicleId = query.vehicleId;
  }

  if (query.patrollerId && query.patrollerId !== "ALL") {
    where.userId = query.patrollerId;
  }

  if (query.status && query.status !== "ALL") {
    where.status = query.status;
  }

  if (query.from || query.to) {
    where.startTime = {};

    if (query.from) where.startTime.gte = new Date(query.from);

    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      where.startTime.lte = toDate;
    }
  }

  return where;
}

// =================================
// REPORTS
// GET /patrols/report/all
// =================================
router.get("/report/all", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!isAllowedOperationalRole(user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const reports = await prisma.patrolSession.findMany({
      where: buildPatrolReportWhere(req.query),
      orderBy: {
        startTime: "desc",
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    res.json(reports);
  } catch (err) {
    console.error("GET /patrols/report/all failed:", err);
    res.status(500).json({ error: "Failed to load patrol reports" });
  }
});

export default router;
