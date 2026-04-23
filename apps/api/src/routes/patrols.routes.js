
import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.post(
  "/start",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const { vehicleId, sector, startKm, checklistId } = req.body;

      const existingActivePatrol = await prisma.patrolSession.findFirst({
        where: {
          userId: req.user.id,
          status: "ACTIVE",
        },
      });

      if (existingActivePatrol) {
        return res.status(400).json({ error: "Active patrol already exists" });
      }

      const patrol = await prisma.patrolSession.create({
        data: {
          userId: req.user.id,
          vehicleId,
          sector,
          checklistId: checklistId || null,
          startKm,
          status: "ACTIVE",
        },
        include: {
          vehicle: true,
          checklist: true,
        },
      });

      res.status(201).json(patrol);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to start patrol" });
    }
  }
);

router.get(
  "/active",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const patrol = await prisma.patrolSession.findFirst({
        where: {
          userId: req.user.id,
          status: "ACTIVE",
        },
        include: {
          vehicle: true,
          checklist: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!patrol) {
        return res.status(404).json({ error: "No active patrol found" });
      }

      res.json(patrol);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch active patrol" });
    }
  }
);

router.post(
  "/:id/end",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { endKm, summary } = req.body;

      const patrol = await prisma.patrolSession.findUnique({
        where: { id },
      });

      if (!patrol) {
        return res.status(404).json({ error: "Patrol not found" });
      }

      if (patrol.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (patrol.status !== "ACTIVE") {
        return res.status(400).json({ error: "Patrol is not active" });
      }

      const totalKm = endKm - patrol.startKm;

      const updatedPatrol = await prisma.patrolSession.update({
        where: { id },
        data: {
          endTime: new Date(),
          endKm,
          totalKm,
          summary,
          status: "COMPLETED",
        },
        include: {
          vehicle: true,
          checklist: true,
        },
      });

      res.json(updatedPatrol);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to end patrol" });
    }
  }
);

router.get(
  "/report/all",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const patrols = await prisma.patrolSession.findMany({
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
          checklist: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(patrols);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch patrol report" });
    }
  }
);

export default router;