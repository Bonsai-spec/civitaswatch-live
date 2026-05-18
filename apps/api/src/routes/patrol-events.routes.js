import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const VALID_TYPES = [
  "NOTIFIED",
  "STAND_DOWN",
  "EN_ROUTE",
  "ON_SCENE",
  "MOBILE",
  "RESUME_PATROL",
  "INFRASTRUCTURE",
];

function normalize(type) {
  return String(type || "").trim().toUpperCase();
}

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function isAdminUser(user) {
  return ["ADMIN", "MASTER_ADMIN"].includes(user?.role);
}

function canUsePatrol(patrol, user) {
  if (!patrol || !user) return false;
  if (isAdminUser(user)) return true;
  if (patrol.userId === user.id) return true;

  return (patrol.crew || []).some((crewMember) => crewMember.userId === user.id);
}

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

const incidentClassificationInclude = {
  incidentCodeRef: {
    select: incidentCodeSelect,
  },
  incidentSubcodeRef: {
    select: incidentSubcodeSelect,
  },
};

const patrolEventOperationalInclude = {
  ...incidentClassificationInclude,
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

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

router.post(
  "/",
  requireAuth,
  // Patrol event submissions are accepted from both PATROL and PATROLLER app roles.
  requireRole("PATROL", "PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const {
        patrolId,
        incidentId,
        type,
        incidentCode,
        incidentCodeId,
        incidentSubcodeId,
        incidentType,
        referenceNumber,
        streetNumber,
        streetName,
        suburb,
        locationNotes,
        latitude,
        longitude,
        serviceTypeId,
        infrastructureTypeId,
        description,
        assistance,
        sceneActive,
      } = req.body;

      if (!patrolId || !type) {
        return res.status(400).json({
          error: "patrolId and type are required",
        });
      }

      const cleanType = normalize(type);

      if (!VALID_TYPES.includes(cleanType)) {
        return res.status(400).json({
          error: "Invalid type",
          validTypes: VALID_TYPES,
        });
      }

      const patrol = await prisma.patrolSession.findUnique({
        where: { id: patrolId },
        include: {
          crew: true,
        },
      });

      if (!patrol) {
        return res.status(404).json({
          error: "Patrol not found",
        });
      }

      if (!canUsePatrol(patrol, req.user)) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      let linkedIncident = null;

      if (incidentId) {
        linkedIncident = await prisma.incident.findUnique({
          where: { id: incidentId },
          select: {
            id: true,
            incidentCode: true,
            incidentCodeId: true,
            incidentSubcodeId: true,
            linkedPatrolId: true,
          },
        });

        if (!linkedIncident) {
          return res.status(404).json({
            error: "Incident not found",
          });
        }

        if (
          linkedIncident.linkedPatrolId &&
          linkedIncident.linkedPatrolId !== patrolId
        ) {
          return res.status(400).json({
            error: "Incident is linked to a different patrol",
          });
        }
      }

      if (cleanType === "NOTIFIED" && !linkedIncident) {
        return res.status(400).json({
          error: `${cleanType} requires incidentId`,
        });
      }

      const event = await prisma.$transaction(async (tx) => {
        let patrolStatus = patrol.status;
        let nextSceneActive =
          typeof sceneActive === "boolean" ? sceneActive : null;
        const normalizedIncidentCodeId = toNullableString(incidentCodeId);
        const normalizedIncidentSubcodeId = toNullableString(incidentSubcodeId);
        const normalizedIncidentType = toNullableString(incidentType);
        const normalizedLatitude = toNullableNumber(latitude);
        const normalizedLongitude = toNullableNumber(longitude);

        if (Number.isNaN(normalizedLatitude) || Number.isNaN(normalizedLongitude)) {
          const error = new Error("Invalid coordinates");
          error.statusCode = 400;
          throw error;
        }

        if (cleanType === "NOTIFIED") {
          patrolStatus = "NOTIFIED";
          nextSceneActive = true;
        }

        if (cleanType === "STAND_DOWN") {
          patrolStatus = "STAND_DOWN";
          nextSceneActive = false;
        }

        if (cleanType === "EN_ROUTE") {
          patrolStatus = "EN_ROUTE";
          nextSceneActive = true;
        }

        if (cleanType === "ON_SCENE") {
          patrolStatus = "ON_SCENE";
          nextSceneActive = true;
        }

        if (cleanType === "MOBILE") {
          patrolStatus = "MOBILE";
        }

        if (cleanType === "RESUME_PATROL") {
          patrolStatus = "ACTIVE";
          nextSceneActive = false;
        }

        await tx.patrolSession.update({
          where: { id: patrolId },
          data: {
            status: patrolStatus,
          },
        });

        if (linkedIncident && !linkedIncident.linkedPatrolId) {
          await tx.incident.update({
            where: { id: linkedIncident.id },
            data: {
              linkedPatrolId: patrolId,
            },
          });
        }

        if (
          linkedIncident &&
          (incidentCodeId !== undefined ||
            incidentSubcodeId !== undefined ||
            incidentType !== undefined)
        ) {
          await tx.incident.update({
            where: { id: linkedIncident.id },
            data: {
              ...(incidentCodeId !== undefined
                ? { incidentCodeId: normalizedIncidentCodeId }
                : {}),
              ...(incidentSubcodeId !== undefined
                ? { incidentSubcodeId: normalizedIncidentSubcodeId }
                : {}),
              ...(incidentType !== undefined
                ? { incidentType: normalizedIncidentType }
                : {}),
            },
          });
        }

        if (linkedIncident && cleanType === "ON_SCENE") {
          await tx.incident.update({
            where: { id: linkedIncident.id },
            data: {
              status: "IN_PROGRESS",
            },
          });
        }

        if (linkedIncident && cleanType === "STAND_DOWN") {
          await tx.incident.update({
            where: { id: linkedIncident.id },
            data: {
              status: "RESOLVED",
            },
          });
        }

        const createdEvent = await tx.patrolEvent.create({
          data: {
            patrolId,
            incidentId: linkedIncident ? linkedIncident.id : null,
            type: cleanType,
            incidentCode: linkedIncident
              ? linkedIncident.incidentCode
              : toNullableString(incidentCode),
            incidentCodeId: normalizedIncidentCodeId || linkedIncident?.incidentCodeId || null,
            incidentSubcodeId:
              normalizedIncidentSubcodeId || linkedIncident?.incidentSubcodeId || null,
            referenceNumber: toNullableString(referenceNumber),
            streetNumber: toNullableString(streetNumber),
            streetName: toNullableString(streetName),
            suburb: toNullableString(suburb),
            locationNotes: toNullableString(locationNotes),
            latitude: normalizedLatitude,
            longitude: normalizedLongitude,
            serviceTypeId: toNullableString(serviceTypeId),
            infrastructureTypeId: toNullableString(infrastructureTypeId),
            createdByUserId: req.user?.id || null,
            description: toNullableString(description),
            // Emergency Assistance must persist here. Control Room reads this
            // same field for its Assistance Requests queue.
            assistance: toNullableString(assistance),
            sceneActive: nextSceneActive,
          },
          include: {
            incident: {
              include: incidentClassificationInclude,
            },
            ...patrolEventOperationalInclude,
            patrol: true,
          },
        });

        return createdEvent;
      });

      return res.status(201).json(event);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          error: error.message,
        });
      }

      if (error.code === "P2003") {
        return res.status(400).json({
          error: "Invalid incidentCodeId, incidentSubcodeId, serviceTypeId, infrastructureTypeId, or createdByUserId.",
        });
      }

      console.error("POST /patrol-events failed:", error);
      return res.status(500).json({
        error: "Failed to create patrol event",
      });
    }
  }
);

router.get(
  "/assistance/requests",
  requireAuth,
  requireRole("CONTROL_ROOM", "ADMIN", "MASTER_ADMIN"),
  async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || "").toLowerCase() === "true";
      // Assistance is not a separate register yet. It remains PatrolEvent data,
      // with external service coordination owned by Control Room.
      const events = await prisma.patrolEvent.findMany({
        where: {
          AND: [
            {
              assistance: {
                not: null,
              },
            },
            {
              assistance: {
                not: "",
              },
            },
            includeResolved ? {} : {
              sceneActive: true,
            },
          ],
        },
        include: {
          incident: {
            select: {
              id: true,
              incidentCode: true,
              incidentCodeId: true,
              incidentSubcodeId: true,
              incidentCodeRef: {
                select: incidentCodeSelect,
              },
              incidentSubcodeRef: {
                select: incidentSubcodeSelect,
              },
              title: true,
              status: true,
            },
          },
          ...patrolEventOperationalInclude,
          patrol: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  registration: true,
                  make: true,
                  colour: true,
                  type: true,
                },
              },
              crew: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  member: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });

      return res.json(events);
    } catch (error) {
      console.error("GET /patrol-events/assistance/requests failed:", error);
      return res.status(500).json({
        error: "Failed to fetch assistance requests",
      });
    }
  }
);

router.post(
  "/assistance/requests/:id/resolve",
  requireAuth,
  requireRole("CONTROL_ROOM", "ADMIN", "MASTER_ADMIN"),
  async (req, res) => {
    try {
      const event = await prisma.patrolEvent.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          assistance: true,
        },
      });

      if (!event || !event.assistance) {
        return res.status(404).json({
          error: "Assistance request not found",
        });
      }

      const updatedEvent = await prisma.patrolEvent.update({
        where: {
          id: req.params.id,
        },
        data: {
          sceneActive: false,
        },
        include: {
          incident: {
            include: incidentClassificationInclude,
          },
          ...patrolEventOperationalInclude,
          patrol: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  registration: true,
                  make: true,
                  colour: true,
                  type: true,
                },
              },
              crew: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  member: true,
                },
              },
            },
          },
        },
      });

      return res.json(updatedEvent);
    } catch (error) {
      console.error("POST /patrol-events/assistance/requests/:id/resolve failed:", error);
      return res.status(500).json({
        error: "Failed to resolve assistance request",
      });
    }
  }
);

router.get(
  "/report/incidents/summary",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const events = await prisma.patrolEvent.findMany({
        where: {
          type: "STAND_DOWN",
        },
        include: {
          incident: {
            include: incidentClassificationInclude,
          },
          ...patrolEventOperationalInclude,
          patrol: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  registration: true,
                  make: true,
                  type: true,
                },
              },
              crew: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  member: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const summaryMap = new Map();

      for (const event of events) {
        const code =
          event.incident?.incidentCode || event.incidentCode || "UNCODED";
        const assistance = event.assistance || "NONE";
        const key = `${code}__${assistance}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            incidentCode: code,
            assistance,
            count: 0,
            latestAt: event.createdAt,
          });
        }

        const item = summaryMap.get(key);
        item.count += 1;

        if (new Date(event.createdAt) > new Date(item.latestAt)) {
          item.latestAt = event.createdAt;
        }
      }

      const summary = Array.from(summaryMap.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.latestAt) - new Date(a.latestAt);
      });

      return res.json({
        summary,
        events,
      });
    } catch (error) {
      console.error("GET /patrol-events/report/incidents/summary failed:", error);
      return res.status(500).json({
        error: "Failed to fetch incident report",
      });
    }
  }
);

router.get(
  "/:patrolId",
  requireAuth,
  requireRole("PATROLLER", "ADMIN"),
  async (req, res) => {
    try {
      const { patrolId } = req.params;

      const patrol = await prisma.patrolSession.findUnique({
        where: { id: patrolId },
        include: {
          crew: true,
        },
      });

      if (!patrol) {
        return res.status(404).json({
          error: "Patrol not found",
        });
      }

      if (!canUsePatrol(patrol, req.user)) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      const events = await prisma.patrolEvent.findMany({
        where: { patrolId },
        include: {
          incident: {
            include: incidentClassificationInclude,
          },
          ...patrolEventOperationalInclude,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return res.json(events);
    } catch (error) {
      console.error("GET /patrol-events/:patrolId failed:", error);
      return res.status(500).json({
        error: "Failed to fetch patrol events",
      });
    }
  }
);

export default router;
