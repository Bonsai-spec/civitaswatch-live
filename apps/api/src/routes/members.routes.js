import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      orderBy: [{ sector: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    res.json(members);
  } catch (error) {
    console.error("Load members error:", error);
    res.status(500).json({ error: "Failed to load members" });
  }
});

router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(member);
  } catch (error) {
    console.error("Load member error:", error);
    res.status(500).json({ error: "Failed to load member" });
  }
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const member = await prisma.member.create({
      data: req.body,
    });

    res.status(201).json(member);
  } catch (error) {
    console.error("Create member error:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(member);
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.member.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Member deleted" });
  } catch (error) {
    console.error("Delete member error:", error);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

export default router;
