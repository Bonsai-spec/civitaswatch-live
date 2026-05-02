// apps/api/src/routes/patrols.routes.js
// CivitasWatch Phase 2A backend routes
// Prisma 7 + PostgreSQL adapter version
//
// IMPORTANT:
// app.js mounts this file with:
// app.use("/patrols", patrolsRoutes);
//
// So route paths in this file must NOT start with /patrols.
//
// Final API paths:
// GET   /patrols/report/all
// PATCH /patrols/:id/admin-update
// GET   /patrols/:id/audit
//
// Optional GET /patrols/report/all query filters supported:
// ?from=2026-04-01
// ?to=2026-04-28
// ?sector=Sector%201
// ?vehicleId=...
// ?patrollerId=...
// ?status=COMPLETED

import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

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

    if (query.from) {
      where.startTime.gte = new Date(query.from);
    }

    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      where.startTime.lte = toDate;
    }
  }

  return where;
}

// =================================
// REPORTS LIST
// Final path: GET /patrols/report/all
// =================================
router.get("/report/all", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isAllowedOperationalRole(user)) {
      return res.status(403).json({ error: "Not allowed to view patrol reports" });
    }

    const reports = await prisma.patrolSession.findMany({
      where: buildPatrolReportWhere(req.query),
      orderBy: {
        startTime: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        vehicle: true,
      },
    });

    return res.json(reports);
  } catch (err) {
    console.error("GET /patrols/report/all failed:", err);
    return res.status(500).json({
      error: "Failed to load patrol reports",
    });
  }
});

// =================================
// ADMIN / CONTROL ROOM REPORT EDIT
// Final path: PATCH /patrols/:id/admin-update
// =================================
router.patch("/:id/admin-update", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { updates = {}, editReason } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isAllowedOperationalRole(user)) {
      return res.status(403).json({ error: "Not allowed to edit patrol reports" });
    }

    if (!editReason || editReason.trim().length < 5) {
      return res.status(400).json({
        error: "Edit reason is required, minimum 5 characters",
      });
    }

    const patrol = await prisma.patrolSession.findUnique({
      where: { id },
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol report not found" });
    }

    if (patrol.isLocked) {
      return res.status(403).json({ error: "This patrol report is locked" });
    }

    const editableFields = ["sector", "startKm", "endKm", "summary"];
    const cleanUpdates = {};
    const auditRows = [];

    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        const oldValue = patrol[field];
        const newValue = updates[field];

        if (auditValue(oldValue) !== auditValue(newValue)) {
          cleanUpdates[field] = newValue;

          auditRows.push({
            id: crypto.randomUUID(),
            patrolId: id,
            editedBy: user.id,
            editedByRole: user.role,
            fieldName: field,
            oldValue: auditValue(oldValue),
            newValue: auditValue(newValue),
            editReason: editReason.trim(),
          });
        }
      }
    }

    if (auditRows.length === 0) {
      return res.status(400).json({ error: "No changes detected" });
    }

    const finalStartKm =
      Object.prototype.hasOwnProperty.call(cleanUpdates, "startKm")
        ? cleanUpdates.startKm
        : patrol.startKm;

    const finalEndKm =
      Object.prototype.hasOwnProperty.call(cleanUpdates, "endKm")
        ? cleanUpdates.endKm
        : patrol.endKm;

    if (
      finalStartKm !== null &&
      finalStartKm !== undefined &&
      finalEndKm !== null &&
      finalEndKm !== undefined
    ) {
      const start = Number(finalStartKm);
      const end = Number(finalEndKm);

      if (Number.isNaN(start) || Number.isNaN(end)) {
        return res.status(400).json({
          error: "Start KM and End KM must be numbers",
        });
      }

      if (end < start) {
        return res.status(400).json({
          error: "End KM cannot be less than Start KM",
        });
      }

      cleanUpdates.totalKm = end - start;
    }

    const updatedPatrol = await prisma.$transaction(async (tx) => {
      const updated = await tx.patrolSession.update({
        where: { id },
        data: {
          ...cleanUpdates,
          editedAt: new Date(),
          editedBy: user.id,
          editCount: {
            increment: auditRows.length,
          },
        },
        include: {
          user: true,
          vehicle: true,
        },
      });

      await tx.patrolReportAuditLog.createMany({
        data: auditRows,
      });

      return updated;
    });

    return res.json({ patrol: updatedPatrol });
  } catch (err) {
    console.error("PATCH /patrols/:id/admin-update failed:", err);
    return res.status(500).json({
      error: "Failed to update patrol report",
    });
  }
});

// =================================
// AUDIT HISTORY
// Final path: GET /patrols/:id/audit
// =================================
router.get("/:id/audit", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isAllowedOperationalRole(user)) {
      return res.status(403).json({ error: "Not allowed to view audit logs" });
    }

    const logs = await prisma.patrolReportAuditLog.findMany({
      where: { patrolId: id },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [...new Set(logs.map((log) => log.editedBy).filter(Boolean))];

    const users = userIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        })
      : [];

    const usersById = new Map(users.map((u) => [u.id, u]));

    return res.json({
      auditLogs: logs.map((log) => {
        const editor = usersById.get(log.editedBy);

        return {
          id: log.id,
          field_name: log.fieldName,
          old_value: log.oldValue,
          new_value: log.newValue,
          edit_reason: log.editReason,
          edited_by: log.editedBy,
          edited_by_name: editor?.fullName || editor?.email || "Unknown",
          edited_by_role: log.editedByRole,
          created_at: log.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("GET /patrols/:id/audit failed:", err);
    return res.status(500).json({
      error: "Failed to load audit logs",
    });
  }
});

export default router;
