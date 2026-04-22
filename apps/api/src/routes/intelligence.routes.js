import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.get(
  "/dashboard",
  requireAuth,
  requireRole("INTELLIGENCE"),
  (req, res) => {
    res.json({
      message: "Crime Intelligence Dashboard Access Granted",
      user: req.user
    });
  }
);

export default router;
