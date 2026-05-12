import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const ADMIN_ROLES = ["ADMIN", "MASTER_ADMIN"];

// GET all users.
router.get("/", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            callSign: true,
            sector: true,
            patrolApproved: true,
            patrolStatus: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    res.json(users);
  } catch (error) {
    console.error("GET /users failed:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Enable / disable user.
router.patch("/:id/status", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: Boolean(isActive) },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("PATCH /users/:id/status failed:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

export default router;
