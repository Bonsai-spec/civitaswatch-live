// apps/api/src/routes/patrols.routes.js

import express from "express";
import { randomUUID } from "crypto";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const ACTIVE_PATROL_STATUSES = [
  "ACTIVE",
  "NOTIFIED",
  "EN_ROUTE",
  "ON_SCENE",
  "STAND_DOWN",
  "MOBILE",
];

const PATROL_INCLUDE = {
  user: true,
  vehicle: true,
  crew: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      member: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  },
};

const incidentCodeSelect = {
  id: true,
  code: true,
  name: true,
  priority: true,
};

const incidentSubcodeSelect = {
  id: true,
  subcode: true,
  name: true,
};

const PATROL_EVENT_INCLUDE = {
  incident: {
    select: {
      id: true,
      incidentCode: true,
      incidentCodeId: true,
      incidentSubcodeId: true,
      title: true,
      status: true,
      incidentCodeRef: {
        select: incidentCodeSelect,
      },
      incidentSubcodeRef: {
        select: incidentSubcodeSelect,
      },
    },
  },
  incidentCodeRef: {
    select: incidentCodeSelect,
  },
  incidentSubcodeRef: {
    select: incidentSubcodeSelect,
  },
  serviceTypeRef: {
    select: {
      id: true,
      type: true,
      category: true,
      controlRoomManaged: true,
    },
  },
  infrastructureTypeRef: {
    select: {
      id: true,
      type: true,
      riskLevel: true,
      requiresLocation: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
};

const PATROL_DETAIL_INCLUDE = {
  ...PATROL_INCLUDE,
  incidents: true,
  patrolEvents: {
    orderBy: {
      createdAt: "asc",
    },
    include: PATROL_EVENT_INCLUDE,
  },
};

function isAdminUser(user) {
  return ["ADMIN", "MASTER_ADMIN"].includes(user?.role);
}

function isAllowedOperationalRole(user) {
  return ["ADMIN", "MASTER_ADMIN", "CONTROL_ROOM"].includes(user?.role);
}

function normalizeVehicleMode(value) {
  const mode = String(value || "REGISTERED").trim().toUpperCase();
  return mode === "TEMPORARY" ? "TEMPORARY" : "REGISTERED";
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item))
        .filter(Boolean)
    )
  );
}

function normalizeCrewCallSigns(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || "").split(/[,\s]+/);

  const seen = new Set();
  const callSigns = [];

  rawValues.forEach((item) => {
    const callSign = cleanText(item);
    const key = callSign?.toUpperCase();

    if (!callSign || seen.has(key)) return;

    seen.add(key);
    callSigns.push(callSign);
  });

  return callSigns;
}

async function resolveCrewCallSignMemberIds({ tx, crewCallSigns }) {
  const callSigns = normalizeCrewCallSigns(crewCallSigns);

  if (!callSigns.length) {
    return {
      memberIds: [],
      unresolvedCallSigns: [],
    };
  }

  const members = await tx.member.findMany({
    where: {
      isActive: true,
      OR: callSigns.map((callSign) => ({
        callSign: {
          equals: callSign,
          mode: "insensitive",
        },
      })),
    },
    select: {
      id: true,
      callSign: true,
    },
  });
  const membersByCallSign = new Map(
    members
      .filter((member) => member.callSign)
      .map((member) => [member.callSign.toUpperCase(), member])
  );
  const unresolvedCallSigns = callSigns.filter((callSign) => !membersByCallSign.has(callSign.toUpperCase()));
  const memberIds = callSigns
    .map((callSign) => membersByCallSign.get(callSign.toUpperCase())?.id)
    .filter(Boolean);

  return {
    memberIds,
    unresolvedCallSigns,
  };
}

function getTemporaryVehicleLabel(patrol) {
  return [
    patrol.tempVehicleRegistration,
    patrol.tempVehicleMake,
    patrol.tempVehicleModel,
    patrol.tempVehicleColour,
    patrol.tempVehicleType,
  ]
    .filter(Boolean)
    .join(" ");
}

function addVehicleLabel(patrol) {
  if (!patrol) return patrol;

  return {
    ...patrol,
    driver: patrol.driver || patrol.user || null,
    vehicleLabel:
      patrol.vehicle?.registration ||
      getTemporaryVehicleLabel(patrol) ||
      patrol.tempVehicleCallSign ||
      "Temporary vehicle",
  };
}

function addVehicleLabels(patrols) {
  return patrols.map(addVehicleLabel);
}

async function getDriverMember(userId, tx = prisma) {
  return tx.member.findUnique({
    where: {
      userId,
    },
  });
}

async function buildCrewCreateRows({ tx, patrolId, driverUserId, crewMemberIds }) {
  const rows = [];
  const driverMember = await getDriverMember(driverUserId, tx);
  const usedUserIds = new Set([driverUserId]);
  const usedMemberIds = new Set();

  if (driverMember?.id) {
    usedMemberIds.add(driverMember.id);
  }

  rows.push({
    patrolSessionId: patrolId,
    userId: driverUserId,
    memberId: driverMember?.id || null,
    role: "DRIVER",
    attendanceStatus: "PRESENT",
    creditGranted: true,
  });

  const ids = normalizeIdList(crewMemberIds);

  if (!ids.length) {
    return rows;
  }

  const members = await tx.member.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  for (const member of members) {
    if (usedMemberIds.has(member.id)) continue;
    if (member.userId && usedUserIds.has(member.userId)) continue;

    rows.push({
      patrolSessionId: patrolId,
      userId: member.userId || null,
      memberId: member.id,
      role: "CREW",
      attendanceStatus: "PRESENT",
      creditGranted: true,
    });

    usedMemberIds.add(member.id);
    if (member.userId) usedUserIds.add(member.userId);
  }

  return rows;
}

function buildPatrolReportWhere(query = {}) {
  const where = {};

  if (query.sector && query.sector !== "ALL") {
    where.sector = query.sector;
  }

  if (query.vehicleId && query.vehicleId !== "ALL") {
    where.vehicleId = query.vehicleId;
  }

  if (query.patrollerId && query.patrollerId !== "ALL") {
    where.userId = query.patrollerId;
  }

  if (query.status && query.status !== "ALL") {
    where.status = query.status;
  }

  if (query.month && !query.from && !query.to) {
    const monthStart = new Date(`${query.month}-01T00:00:00.000Z`);

    if (!Number.isNaN(monthStart.getTime())) {
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

      where.startTime = {
        gte: monthStart,
        lt: monthEnd,
      };
    }
  }

  if (query.from || query.to) {
    where.startTime = {};

    if (query.from) where.startTime.gte = new Date(query.from);

    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      where.startTime.lte = toDate;
    }
  }

  return where;
}

// =================================
// ACTIVE PATROLS
// GET /patrols/active
// =================================
router.get("/active", requireAuth, async (req, res) => {
  try {
    const patrols = await prisma.patrolSession.findMany({
      where: {
        status: {
          in: ACTIVE_PATROL_STATUSES,
        },
      },
      include: PATROL_INCLUDE,
      orderBy: {
        startTime: "desc",
      },
    });

    res.json(addVehicleLabels(patrols));
  } catch (err) {
    console.error("ACTIVE patrols error:", err);
    res.status(500).json({ error: "Failed to load active patrols" });
  }
});

// =================================
// MY ACTIVE PATROLS
// GET /patrols/me/active
// =================================
router.get("/me/active", requireAuth, async (req, res) => {
  try {
    const patrols = await prisma.patrolSession.findMany({
      where: {
        status: {
          in: ACTIVE_PATROL_STATUSES,
        },
        OR: [
          {
            userId: req.user.id,
          },
          {
            crew: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
      },
      include: PATROL_DETAIL_INCLUDE,
      orderBy: {
        startTime: "desc",
      },
    });

    res.json(addVehicleLabels(patrols));
  } catch (err) {
    console.error("MY ACTIVE patrols error:", err);
    res.status(500).json({ error: "Failed to load active patrols" });
  }
});

// =================================
// START PATROL
// POST /patrols/start
// =================================
router.post("/start", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const {
      vehicleId,
      vehicleMode,
      callSign,
      sector,
      startKm,
      crewIds,
      crewMemberIds,
      crewCallSigns,
      tempVehicleRegistration,
      tempVehicleMake,
      tempVehicleModel,
      tempVehicleColour,
      tempVehicleType,
      tempVehicleCallSign,
      tempVehicleOwnerName,
      tempVehicleOwnerPhone,
      tempVehicleNotes,
    } = req.body;

    const mode = normalizeVehicleMode(vehicleMode);
    const cleanVehicleId = cleanText(vehicleId);
    const cleanCallSign = cleanText(callSign);
    const cleanTempVehicleRegistration = cleanText(tempVehicleRegistration);

    if (!cleanCallSign) {
      return res.status(400).json({
        error: "callSign required",
      });
    }

    if (!sector || startKm === undefined) {
      return res.status(400).json({
        error: "sector and startKm required",
      });
    }

    if (mode === "REGISTERED" && !cleanVehicleId) {
      return res.status(400).json({
        error: "vehicleId required for registered patrol vehicle",
      });
    }

    if (mode === "TEMPORARY" && !cleanTempVehicleRegistration) {
      return res.status(400).json({
        error: "tempVehicleRegistration required for temporary patrol vehicle",
      });
    }

    const start = Number(startKm);

    if (Number.isNaN(start)) {
      return res.status(400).json({ error: "Invalid start KM" });
    }

    const existing = await prisma.patrolSession.findFirst({
      where: {
        status: {
          in: ACTIVE_PATROL_STATUSES,
        },
        OR: [
          {
            userId: user.id,
          },
          {
            crew: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "User already has active patrol",
      });
    }

    const patrol = await prisma.$transaction(async (tx) => {
      const resolvedCrew = await resolveCrewCallSignMemberIds({
        tx,
        crewCallSigns,
      });

      if (resolvedCrew.unresolvedCallSigns.length) {
        const error = new Error("Unresolved crew call signs");
        error.statusCode = 400;
        error.unresolvedCallSigns = resolvedCrew.unresolvedCallSigns;
        throw error;
      }

      const created = await tx.patrolSession.create({
        data: {
          userId: user.id,
          vehicleId: mode === "REGISTERED" ? cleanVehicleId : null,
          callSign: cleanCallSign,
          sector,
          startKm: start,
          status: "ACTIVE",
          startTime: new Date(),
          vehicleMode: mode,
          tempVehicleRegistration:
            mode === "TEMPORARY" ? cleanTempVehicleRegistration : null,
          tempVehicleMake: mode === "TEMPORARY" ? cleanText(tempVehicleMake) : null,
          tempVehicleModel: mode === "TEMPORARY" ? cleanText(tempVehicleModel) : null,
          tempVehicleColour:
            mode === "TEMPORARY" ? cleanText(tempVehicleColour) : null,
          tempVehicleType: mode === "TEMPORARY" ? cleanText(tempVehicleType) : null,
          tempVehicleCallSign:
            mode === "TEMPORARY" ? cleanText(tempVehicleCallSign) : null,
          tempVehicleOwnerName:
            mode === "TEMPORARY" ? cleanText(tempVehicleOwnerName) : null,
          tempVehicleOwnerPhone:
            mode === "TEMPORARY" ? cleanText(tempVehicleOwnerPhone) : null,
          tempVehicleNotes:
            mode === "TEMPORARY" ? cleanText(tempVehicleNotes) : null,
        },
      });

      const crewRows = await buildCrewCreateRows({
        tx,
        patrolId: created.id,
        driverUserId: user.id,
        crewMemberIds: [
          ...normalizeIdList(crewIds || crewMemberIds),
          ...resolvedCrew.memberIds,
        ],
      });

      if (crewRows.length) {
        await tx.patrolSessionCrew.createMany({
          data: crewRows,
          skipDuplicates: true,
        });
      }

      return tx.patrolSession.findUnique({
        where: {
          id: created.id,
        },
        include: PATROL_INCLUDE,
      });
    });

    res.status(201).json(addVehicleLabel(patrol));
  } catch (err) {
    if (err.statusCode === 400 && err.unresolvedCallSigns) {
      return res.status(400).json({
        error: "Unresolved crew call signs",
        unresolvedCallSigns: err.unresolvedCallSigns,
      });
    }

    console.error("START patrol error:", err);
    res.status(500).json({ error: "Failed to start patrol" });
  }
});

// =================================
// END PATROL
// POST /patrols/:id/end
// =================================
router.post("/:id/end", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { endKm, summary } = req.body;

    const patrol = await prisma.patrolSession.findUnique({
      where: { id },
      include: {
        crew: true,
      },
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol not found" });
    }

    if (patrol.status === "COMPLETED") {
      return res.status(400).json({ error: "Patrol already completed" });
    }

    if (patrol.userId !== req.user.id && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Only the driver or admin may end patrol" });
    }

    if (endKm === undefined || endKm === null || endKm === "") {
      return res.status(400).json({ error: "endKm required" });
    }

    const end = Number(endKm);
    const start = Number(patrol.startKm);

    if (Number.isNaN(end)) {
      return res.status(400).json({ error: "Invalid end KM" });
    }

    if (!Number.isNaN(start) && end < start) {
      return res.status(400).json({
        error: "End KM cannot be less than start KM",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patrolSessionCrew.updateMany({
        where: {
          patrolSessionId: id,
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
        },
      });

      return tx.patrolSession.update({
        where: { id },
        data: {
          endKm: end,
          totalKm: Number.isNaN(start) ? null : end - start,
          summary: summary || null,
          status: "COMPLETED",
          endTime: new Date(),
        },
        include: PATROL_INCLUDE,
      });
    });

    res.json(addVehicleLabel(updated));
  } catch (err) {
    console.error("END patrol error:", err);
    res.status(500).json({ error: "Failed to end patrol" });
  }
});

// =================================
// EXISTING REPORT + AUDIT CODE
// =================================

function auditValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeOptionalInt(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const number = Number(value);
  if (!Number.isInteger(number)) {
    const error = new Error(`${fieldName} must be a whole number`);
    error.statusCode = 400;
    throw error;
  }

  return number;
}

// =================================
// ADMIN REPORT UPDATE + AUDIT
// PATCH /patrols/:id/admin-update
// =================================
router.patch("/:id/admin-update", requireAuth, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Only admin users may edit patrol reports" });
    }

    const { id } = req.params;
    const { updates = {}, editReason } = req.body || {};
    const cleanReason = cleanText(editReason);

    if (!cleanReason || cleanReason.length < 5) {
      return res.status(400).json({ error: "Edit reason is required, minimum 5 characters." });
    }

    const patrol = await prisma.patrolSession.findUnique({
      where: { id },
      include: PATROL_DETAIL_INCLUDE,
    });

    if (!patrol) {
      return res.status(404).json({ error: "Patrol report not found" });
    }

    if (patrol.isLocked) {
      return res.status(400).json({ error: "Patrol report is locked and cannot be edited" });
    }

    const data = {};
    const auditRows = [];

    function addChange(fieldName, nextValue) {
      if (nextValue === undefined) return;

      const oldValue = patrol[fieldName];
      if (auditValue(oldValue) === auditValue(nextValue)) return;

      data[fieldName] = nextValue;
      auditRows.push({
        id: randomUUID(),
        patrolId: id,
        editedBy: req.user.id,
        editedByRole: req.user.role,
        fieldName,
        oldValue: auditValue(oldValue),
        newValue: auditValue(nextValue),
        editReason: cleanReason,
      });
    }

    const normalizedStartKm = normalizeOptionalInt(updates.startKm, "startKm");
    if (normalizedStartKm === null) {
      return res.status(400).json({ error: "Start KM is required." });
    }

    addChange("sector", updates.sector === undefined ? undefined : cleanText(updates.sector));
    addChange("summary", updates.summary === undefined ? undefined : cleanText(updates.summary));
    addChange("startKm", normalizedStartKm);
    addChange("endKm", normalizeOptionalInt(updates.endKm, "endKm"));

    const nextStartKm = data.startKm !== undefined ? data.startKm : patrol.startKm;
    const nextEndKm = data.endKm !== undefined ? data.endKm : patrol.endKm;

    if (nextStartKm !== null && nextEndKm !== null && nextEndKm !== undefined && nextEndKm < nextStartKm) {
      return res.status(400).json({ error: "End KM cannot be less than Start KM." });
    }

    if (data.startKm !== undefined || data.endKm !== undefined) {
      data.totalKm =
        nextEndKm === null || nextEndKm === undefined
          ? null
          : nextEndKm - nextStartKm;
    }

    if (auditRows.length === 0) {
      return res.json({ patrol: addVehicleLabel(patrol), auditLogs: [] });
    }

    data.editedAt = new Date();
    data.editedBy = req.user.id;
    data.editCount = { increment: 1 };

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patrolReportAuditLog.createMany({ data: auditRows });

      return tx.patrolSession.update({
        where: { id },
        data,
        include: PATROL_DETAIL_INCLUDE,
      });
    });

    res.json({ patrol: addVehicleLabel(updated), auditLogs: auditRows });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error("PATCH /patrols/:id/admin-update failed:", err);
    res.status(500).json({ error: "Failed to update patrol report" });
  }
});

// =================================
// PATROL REPORT AUDIT
// GET /patrols/:id/audit
// =================================
router.get("/:id/audit", requireAuth, async (req, res) => {
  try {
    if (!isAllowedOperationalRole(req.user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const logs = await prisma.patrolReportAuditLog.findMany({
      where: { patrolId: req.params.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (err) {
    console.error("GET /patrols/:id/audit failed:", err);
    res.status(500).json({ error: "Failed to load audit history" });
  }
});

// =================================
// REPORTS
// GET /patrols/report/all
// =================================
router.get("/report/all", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!isAllowedOperationalRole(user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const reports = await prisma.patrolSession.findMany({
      where: buildPatrolReportWhere(req.query),
      orderBy: {
        startTime: "desc",
      },
      include: PATROL_DETAIL_INCLUDE,
    });

    res.json(addVehicleLabels(reports));
  } catch (err) {
    console.error("GET /patrols/report/all failed:", err);
    res.status(500).json({ error: "Failed to load patrol reports" });
  }
});

export default router;
