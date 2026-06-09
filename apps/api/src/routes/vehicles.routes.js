import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const VEHICLE_READ_ROLES = [
  "ADMIN",
  "MASTER_ADMIN",
  "CONTROL_ROOM",
  "PATROLLER",
  "PATROL",
  "SUPERVISOR",
];

const VEHICLE_WRITE_ROLES = [
  "ADMIN",
  "MASTER_ADMIN",
  "CONTROL_ROOM",
];

// Create vehicle.
// Admin / Control Room can add official register vehicles.
// Patrollers should use the temporary vehicle flow from patroller.html, not this official route.
router.post("/", requireAuth, requireRole(...VEHICLE_WRITE_ROLES), async (req, res) => {
  try {
    const { make, type, registration, colour } = req.body;

    const normalizedRegistration = String(registration || "").trim().toUpperCase();

    if (!normalizedRegistration) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        make: String(make || "").trim(),
        type: String(type || "").trim(),
        registration: normalizedRegistration,
        colour: String(colour || "").trim(),
        isActive: true,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    const duplicateRegistration =
      error?.code === "P2002" &&
      (Array.isArray(error?.meta?.target)
        ? error.meta.target.includes("registration")
        : error?.meta?.target === "registration");

    if (duplicateRegistration) {
      return res.status(409).json({ error: "Vehicle registration already exists" });
    }

    console.error("POST /vehicles failed:", error);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

// List active vehicles.
// This powers Admin Vehicle Register and Patroller vehicle dropdown.
router.get("/", requireAuth, requireRole(...VEHICLE_READ_ROLES), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: [{ registration: "asc" }, { createdAt: "desc" }],
    });

    res.json(vehicles);
  } catch (error) {
    console.error("GET /vehicles failed:", error);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

export default router;
