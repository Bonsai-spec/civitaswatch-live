import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const organisations = await prisma.organisation.findMany({
      include: {
        sectors: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(organisations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch organisations" });
  }
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }

    const organisation = await prisma.organisation.create({
      data: {
        name,
        code: code.toUpperCase(),
      },
    });

    res.status(201).json(organisation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create organisation" });
  }
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const organisation = await prisma.organisation.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code: code.toUpperCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    res.json(organisation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update organisation" });
  }
});

router.post("/:organisationId/sectors", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { organisationId } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Sector name and code are required" });
    }

    const sector = await prisma.sector.create({
      data: {
        organisationId,
        name,
        code: code.toUpperCase(),
      },
    });

    res.status(201).json(sector);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create sector" });
  }
});

router.patch("/sectors/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const sector = await prisma.sector.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code: code.toUpperCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    res.json(sector);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update sector" });
  }
});

router.get("/sector-access", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const access = await prisma.userSectorAccess.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        sector: {
          include: {
            organisation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(access);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sector access" });
  }
});

router.post("/sector-access", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      userId,
      sectorId,
      role,
      canView,
      canCreate,
      canEdit,
      canClose,
      canExport,
      isAdmin,
    } = req.body;

    if (!userId || !sectorId || !role) {
      return res.status(400).json({ error: "userId, sectorId and role are required" });
    }

    const access = await prisma.userSectorAccess.upsert({
      where: {
        userId_sectorId: {
          userId,
          sectorId,
        },
      },
      update: {
        role,
        canView: Boolean(canView),
        canCreate: Boolean(canCreate),
        canEdit: Boolean(canEdit),
        canClose: Boolean(canClose),
        canExport: Boolean(canExport),
        isAdmin: Boolean(isAdmin),
      },
      create: {
        userId,
        sectorId,
        role,
        canView: canView ?? true,
        canCreate: Boolean(canCreate),
        canEdit: Boolean(canEdit),
        canClose: Boolean(canClose),
        canExport: Boolean(canExport),
        isAdmin: Boolean(isAdmin),
      },
      include: {
        user: true,
        sector: {
          include: {
            organisation: true,
          },
        },
      },
    });

    res.status(201).json(access);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save sector access" });
  }
});

router.delete("/sector-access/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.userSectorAccess.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete sector access" });
  }
});

export default router;