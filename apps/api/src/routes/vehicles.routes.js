import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// Create vehicle (ADMIN only for now)
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { make, type, registration, colour } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        make,
        type,
        registration,
        colour
      }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

// List active vehicles
router.get("/", requireAuth, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

export default router;