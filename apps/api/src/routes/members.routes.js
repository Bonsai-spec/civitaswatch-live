import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const ADMIN_ROLES = ["ADMIN", "MASTER_ADMIN"];
const PATROL_CREW_LOOKUP_ROLES = ["PATROL", "PATROLLER"];
const CREW_LOOKUP_MEMBER_SELECT = {
  id: true,
  firstName: true,
  surname: true,
  callSign: true,
  userId: true,
  user: {
    select: {
      id: true,
      fullName: true,
    },
  },
};

function getMemberFullName(member) {
  return [member.firstName, member.surname].filter(Boolean).join(" ").trim();
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function formatCrewLookupMember(member) {
  const name = getMemberFullName(member);

  return {
    id: member.id,
    firstName: member.firstName,
    surname: member.surname,
    lastName: member.surname,
    name,
    callSign: member.callSign,
    callsign: member.callSign,
    userId: member.userId,
    user: member.user
      ? {
          id: member.user.id,
          fullName: member.user.fullName,
        }
      : null,
  };
}

function cleanMemberPayload(body) {
  const allowed = [
    "firstName",
    "surname",
    "idNumber",
    "cellNumber",
    "email",
    "address",
    "suburb",
    "sector",
    "callSign",
    "vettingStatus",
    "isActive",
    "nextOfKinName",
    "nextOfKinPhone",
    "medicalNotes",
    "allergies",
    "medication",
    "bloodType",
    "driversLicence",
    "licenceCode",
    "pdp",
    "firstAid",
    "fireTraining",
    "radioTraining",
    "patrolTraining",
    "controlRoomTraining",
    "patrolApproved",
    "patrolStatus",
    "patrolNotes",
    "notes",
  ];

  const data = {};

  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key];
    }
  });

  if (typeof data.email === "string") data.email = data.email.trim().toLowerCase() || null;
  if (typeof data.firstName === "string") data.firstName = data.firstName.trim();
  if (typeof data.surname === "string") data.surname = data.surname.trim();
  if (typeof data.callSign === "string") data.callSign = data.callSign.trim() || null;

  return data;
}

router.get(
  "/",
  requireAuth,
  requireRole(...ADMIN_ROLES, ...PATROL_CREW_LOOKUP_ROLES),
  async (req, res) => {
    try {
      if (!isAdminRole(req.user.role)) {
        const members = await prisma.member.findMany({
          where: {
            isActive: true,
            OR: [
              { patrolApproved: true },
              { patrolStatus: { in: ["PENDING", "APPROVED"] } },
              { patrolTraining: true },
            ],
          },
          select: CREW_LOOKUP_MEMBER_SELECT,
          orderBy: [{ patrolStatus: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        });

        return res.json(members.map(formatCrewLookupMember));
      }

      const members = await prisma.member.findMany({
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
        },
        orderBy: [{ sector: "asc" }, { surname: "asc" }, { firstName: "asc" }],
      });

      res.json(members);
    } catch (error) {
      console.error("Load members error:", error);
      res.status(500).json({ error: "Failed to load members" });
    }
  }
);

router.get("/patrollers", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const patrollers = await prisma.member.findMany({
      where: {
        OR: [
          { patrolApproved: true },
          { patrolStatus: { in: ["PENDING", "APPROVED", "SUSPENDED"] } },
          { patrolTraining: true },
        ],
      },
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
      },
      orderBy: [{ patrolStatus: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    res.json(patrollers);
  } catch (error) {
    console.error("Load patrollers error:", error);
    res.status(500).json({ error: "Failed to load patroller register" });
  }
});

router.get("/:id", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
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
      },
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

router.post("/", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = cleanMemberPayload(req.body);

    if (!data.firstName || !data.surname) {
      return res.status(400).json({ error: "First name and surname are required" });
    }

    const member = await prisma.member.create({
      data,
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
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error("Create member error:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

router.patch("/:id", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = cleanMemberPayload(req.body);

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data,
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
      },
    });

    res.json(member);
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.post("/:id/create-patroller-login", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password is required, minimum 6 characters" });
    }

    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (!member.email) {
      return res.status(400).json({ error: "Member email is required before creating login" });
    }

    if (member.userId || member.user) {
      return res.status(400).json({ error: "Member already has a linked login user" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: member.email.toLowerCase() },
    });

    if (existingUser) {
      const updatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          userId: existingUser.id,
          patrolApproved: true,
          patrolStatus: "APPROVED",
          patrolTraining: true,
        },
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
        },
      });

      return res.json(updatedMember);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: getMemberFullName(member),
        email: member.email.toLowerCase(),
        passwordHash,
        role: "PATROLLER",
        isActive: true,
      },
    });

    const updatedMember = await prisma.member.update({
      where: { id: member.id },
      data: {
        userId: user.id,
        patrolApproved: true,
        patrolStatus: "APPROVED",
        patrolTraining: true,
      },
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
      },
    });

    res.status(201).json(updatedMember);
  } catch (error) {
    console.error("Create patroller login error:", error);
    res.status(500).json({ error: "Failed to create patroller login" });
  }
});

router.patch("/:id/patroller-status", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { patrolStatus, patrolApproved, patrolNotes } = req.body;

    const data = {
      patrolStatus: patrolStatus || "PENDING",
      patrolApproved: Boolean(patrolApproved),
      patrolNotes: patrolNotes || null,
    };

    if (data.patrolApproved) {
      data.patrolStatus = "APPROVED";
      data.patrolTraining = true;
    }

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data,
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
      },
    });

    res.json(member);
  } catch (error) {
    console.error("Update patroller status error:", error);
    res.status(500).json({ error: "Failed to update patroller status" });
  }
});

router.delete("/:id", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
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
