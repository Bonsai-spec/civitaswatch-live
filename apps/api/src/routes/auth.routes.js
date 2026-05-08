import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { loginRateLimiter } from "../middleware/rateLimit.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const USER_ADMIN_ROLES = ["MASTER_ADMIN", "ADMIN"];

const ALLOWED_ROLES = [
  "MASTER_ADMIN",
  "ADMIN",
  "CONTROL_ROOM",
  "PATROLLER",
  "PATROL",
  "REPORTS",
  "SUPERVISOR",
  "INTELLIGENCE",
  "INTELLIGENCE_ANALYST",
];

function normaliseEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function safeUserSelect() {
  return {
    id: true,
    fullName: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };
}

function normalizeRole(role) {
  const cleanRole = String(role || "").trim().toUpperCase();
  return ALLOWED_ROLES.includes(cleanRole) ? cleanRole : null;
}

router.post(
  "/register",
  requireAuth,
  requireRole(...USER_ADMIN_ROLES),
  async (req, res) => {
    try {
      const { fullName, email, password, role } = req.body;

      const cleanFullName = cleanString(fullName);
      const cleanEmail = normaliseEmail(email);
      const cleanPassword = String(password || "");
      const cleanRole = normalizeRole(role);

      if (!cleanFullName || !cleanEmail || !cleanPassword || !cleanRole) {
        return res.status(400).json({
          error: "fullName, email, password, and valid role are required",
        });
      }

      if (cleanPassword.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters",
        });
      }

      if (cleanRole === "MASTER_ADMIN" && req.user.role !== "MASTER_ADMIN") {
        return res.status(403).json({
          error: "Only MASTER_ADMIN can create another MASTER_ADMIN",
        });
      }

      if (
        ["INTELLIGENCE", "INTELLIGENCE_ANALYST"].includes(cleanRole) &&
        req.user.role !== "MASTER_ADMIN"
      ) {
        return res.status(403).json({
          error: "Only MASTER_ADMIN can create intelligence users",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "User already exists",
        });
      }

      const passwordHash = await bcrypt.hash(cleanPassword, 10);

      const user = await prisma.user.create({
        data: {
          fullName: cleanFullName,
          email: cleanEmail,
          passwordHash,
          role: cleanRole,
          isActive: true,
        },
        select: safeUserSelect(),
      });

      return res.status(201).json(user);
    } catch (error) {
      console.error("POST /auth/register failed:", error);
      return res.status(500).json({
        error: "Failed to register user",
      });
    }
  }
);

router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = normaliseEmail(email);
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const passwordMatch = await bcrypt.compare(cleanPassword, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("POST /auth/login failed:", error);
    return res.status(500).json({
      error: "Login failed",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: safeUserSelect(),
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("GET /auth/me failed:", error);
    return res.status(500).json({
      error: "Failed to fetch current user",
    });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  return res.json({
    ok: true,
    message: "Client should clear stored token",
  });
});

export default router;
