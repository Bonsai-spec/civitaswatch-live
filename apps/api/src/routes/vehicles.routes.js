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
];

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function isVehicleAdmin(role) {
  return ["ADMIN", "MASTER_ADMIN"].includes(normalizeRole(role));
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanRegistration(value) {
  return cleanText(value).toUpperCase();
}

function isDuplicateRegistrationError(error) {
  return (
    error?.code === "P2002" &&
    (Array.isArray(error?.meta?.target)
      ? error.meta.target.includes("registration")
      : error?.meta?.target === "registration")
  );
}

// Create vehicle.
// Vehicle register writes are limited to Admin and Master Admin only.
// Patrollers should use the temporary vehicle flow from patroller.html, not this official route.
// Use VEHICLE_WRITE_ROLES for any future vehicle mutation route as well.
router.post("/", requireAuth, requireRole(...VEHICLE_WRITE_ROLES), async (req, res) => {
  try {
    const { make, type, registration, colour } = req.body;

    const normalizedRegistration = cleanRegistration(registration);

    if (!normalizedRegistration) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        make: cleanText(make),
        type: cleanText(type),
        registration: normalizedRegistration,
        colour: cleanText(colour),
        isActive: true,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    if (isDuplicateRegistrationError(error)) {
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
    const includeInactive = isVehicleAdmin(req.user?.role);

    const vehicles = await prisma.vehicle.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: "desc" }, { registration: "asc" }, { createdAt: "desc" }],
    });

    res.json(vehicles);
  } catch (error) {
    console.error("GET /vehicles failed:", error);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

router.patch("/:id", requireAuth, requireRole(...VEHICLE_WRITE_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { make, type, registration, colour } = req.body;
    const normalizedRegistration = cleanRegistration(registration);

    if (!normalizedRegistration) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        make: cleanText(make),
        type: cleanText(type),
        registration: normalizedRegistration,
        colour: cleanText(colour),
      },
    });

    res.json(vehicle);
  } catch (error) {
    if (isDuplicateRegistrationError(error)) {
      return res.status(409).json({ error: "Vehicle registration already exists" });
    }

    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    console.error("PATCH /vehicles/:id failed:", error);
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.patch("/:id/status", requireAuth, requireRole(...VEHICLE_WRITE_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const isActive = req.body?.isActive;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { isActive },
    });

    res.json(vehicle);
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    console.error("PATCH /vehicles/:id/status failed:", error);
    res.status(500).json({ error: "Failed to update vehicle status" });
  }
});

export default router;
