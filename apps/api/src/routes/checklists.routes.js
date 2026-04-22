import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.post(
  "/pre-patrol",
  requireAuth,
  requireRole("PATROLLER"),
  async (req, res) => {
    try {
      const {
        vehicleInspected,
        safetyCheckCompleted,
        radioChecked,
        vestChecked,
        callSignConfirmed,
        vehicleFuelLevel,
        notes
      } = req.body;

      const checklist = await prisma.prePatrolChecklist.create({
        data: {
          userId: req.user.id,
          patrolDate: new Date(),
          vehicleInspected: Boolean(vehicleInspected),
          safetyCheckCompleted: Boolean(safetyCheckCompleted),
          radioChecked: Boolean(radioChecked),
          vestChecked: Boolean(vestChecked),
          callSignConfirmed: Boolean(callSignConfirmed),
          vehicleFuelLevel: vehicleFuelLevel || null,
          notes: notes || null,
          completedAt: new Date()
        }
      });

      res.status(201).json(checklist);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save pre-patrol checklist" });
    }
  }
);

router.get(
  "/pre-patrol/latest",
  requireAuth,
  requireRole("PATROLLER"),
  async (req, res) => {
    try {
      const checklist = await prisma.prePatrolChecklist.findFirst({
        where: { userId: req.user.id },
        orderBy: { completedAt: "desc" }
      });

      res.json(checklist);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch latest checklist" });
    }
  }
);

export default router;