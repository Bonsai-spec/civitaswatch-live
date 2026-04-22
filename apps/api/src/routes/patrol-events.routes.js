import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// Add event to an active patrol
router.post("/", requireAuth, requireRole("PATROLLER"), async (req, res) => {
  try {
    const { patrolId, type, incidentCode, description, assistance, sceneActive } = req.body;

    if (!patrolId || !type) {
      return res.status(400).json({ error: "patrolId and type are required" });
    }

    const validTypes = ["STAND_DOWN", "RESUME", "ASSIST_REQUESTED", "NOTE"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    const patrol = await prisma.patrolSession.findUnique({
      where: { id: patrolId }
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol not found" });
    }

    if (patrol.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (patrol.status !== "ACTIVE" && type !== "NOTE") {
      return res.status(400).json({ error: "Patrol is not active" });
    }

    const event = await prisma.patrolEvent.create({
      data: {
        patrolId,
        type,
        incidentCode: incidentCode || null,
        description: description || null,
        assistance: assistance || null,
        sceneActive: typeof sceneActive === "boolean" ? sceneActive : null
      }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create patrol event" });
  }
});

// Get all events for a patrol
router.get("/:patrolId", requireAuth, async (req, res) => {
  try {
    const events = await prisma.patrolEvent.findMany({
      where: { patrolId: req.params.patrolId },
      orderBy: { createdAt: "asc" }
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch patrol events" });
  }
});

export default router;