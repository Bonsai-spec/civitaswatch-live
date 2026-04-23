
import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const { patrolId, type, incidentCode, description, assistance, sceneActive } = req.body;

      if (!patrolId || !type) {
        return res.status(400).json({ error: "patrolId and type are required" });
      }

      const patrol = await prisma.patrolSession.findUnique({
        where: { id: patrolId },
      });

      if (!patrol) {
        return res.status(404).json({ error: "Patrol not found" });
      }

      if (patrol.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const event = await prisma.patrolEvent.create({
        data: {
          patrolId,
          type,
          incidentCode: incidentCode || null,
          description: description || null,
          assistance: assistance || null,
          sceneActive:
            typeof sceneActive === "boolean"
              ? sceneActive
              : null,
        },
      });

      res.status(201).json(event);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create patrol event" });
    }
  }
);

router.get(
  "/:patrolId",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const { patrolId } = req.params;

      const patrol = await prisma.patrolSession.findUnique({
        where: { id: patrolId },
      });

      if (!patrol) {
        return res.status(404).json({ error: "Patrol not found" });
      }

      if (patrol.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const events = await prisma.patrolEvent.findMany({
        where: { patrolId },
        orderBy: { createdAt: "asc" },
      });

      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch patrol events" });
    }
  }
);

router.get(
  "/report/incidents/summary",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const events = await prisma.patrolEvent.findMany({
        where: {
          type: "STAND_DOWN",
        },
        include: {
          patrol: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  registration: true,
                  make: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const summaryMap = new Map();

      for (const event of events) {
        const code = event.incidentCode || "UNCODED";
        const assistance = event.assistance || "NONE";
        const key = `${code}__${assistance}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            incidentCode: code,
            assistance,
            count: 0,
            latestAt: event.createdAt,
          });
        }

        const item = summaryMap.get(key);
        item.count += 1;

        if (new Date(event.createdAt) > new Date(item.latestAt)) {
          item.latestAt = event.createdAt;
        }
      }

      const summary = Array.from(summaryMap.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.latestAt) - new Date(a.latestAt);
      });

      res.json({
        summary,
        events,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch incident report" });
    }
  }
);

export default router;