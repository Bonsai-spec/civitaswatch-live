import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// Start patrol
router.post("/start", requireAuth, requireRole("PATROLLER"), async (req, res) => {
  try {
    const { vehicleId, sector, checklistId, startKm } = req.body;

    if (!vehicleId || !sector || startKm === undefined) {
      return res.status(400).json({ error: "vehicleId, sector, and startKm are required" });
    }

    const activePatrol = await prisma.patrolSession.findFirst({
      where: {
        userId: req.user.id,
        status: "ACTIVE"
      }
    });

    if (activePatrol) {
      return res.status(400).json({ error: "Patroller already has an active patrol" });
    }

    const patrol = await prisma.patrolSession.create({
      data: {
        userId: req.user.id,
        vehicleId,
        sector,
        checklistId: checklistId || null,
        startKm: Number(startKm),
        status: "ACTIVE"
      },
      include: {
        vehicle: true,
        checklist: true
      }
    });

    res.status(201).json(patrol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start patrol" });
  }
});

// Get my active patrol
router.get("/active", requireAuth, requireRole("PATROLLER"), async (req, res) => {
  try {
    const patrol = await prisma.patrolSession.findFirst({
      where: {
        userId: req.user.id,
        status: "ACTIVE"
      },
      include: {
        vehicle: true,
        checklist: true
      },
      orderBy: { startTime: "desc" }
    });

    res.json(patrol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch active patrol" });
  }
});

// End patrol
router.post("/:id/end", requireAuth, requireRole("PATROLLER"), async (req, res) => {
  try {
    const { endKm, summary } = req.body;
    const patrolId = req.params.id;

    const patrol = await prisma.patrolSession.findUnique({
      where: { id: patrolId }
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol not found" });
    }

    if (patrol.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (patrol.status !== "ACTIVE") {
      return res.status(400).json({ error: "Patrol is not active" });
    }

    const finalEndKm = Number(endKm);
    const totalKm = finalEndKm - patrol.startKm;

    const updatedPatrol = await prisma.patrolSession.update({
      where: { id: patrolId },
      data: {
        endTime: new Date(),
        endKm: finalEndKm,
        totalKm,
        summary: summary || null,
        status: "COMPLETED"
      },
      include: {
        vehicle: true,
        checklist: true
      }
    });

    res.json(updatedPatrol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to end patrol" });
  }
});

export default router;