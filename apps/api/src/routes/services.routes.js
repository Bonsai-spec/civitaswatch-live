import express from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

const READ_ROLES = ["ADMIN", "MASTER_ADMIN", "CONTROL_ROOM"];
const WRITE_ROLES = ["ADMIN", "MASTER_ADMIN"];
const OPERATION_ROLES = ["ADMIN", "MASTER_ADMIN", "CONTROL_ROOM"];

const SERVICE_TYPES = [
  "AMBULANCE",
  "POLICE",
  "FIRE",
  "METRO",
  "TRAFFIC",
  "TOWING",
  "SECURITY_BACKUP",
  "CONTROL_ROOM",
  "MEDICAL_AID",
  "OTHER",
];

const SERVICE_STATUSES = [
  "REQUESTED",
  "EN_ROUTE",
  "ON_SCENE",
  "CLEARED",
  "CANCELLED",
];

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeServiceType(value) {
  const clean = normalize(value || "OTHER");
  return SERVICE_TYPES.includes(clean) ? clean : null;
}

function normalizeServiceStatus(value) {
  const clean = normalize(value || "REQUESTED").replace(/\s+/g, "_");
  return SERVICE_STATUSES.includes(clean) ? clean : null;
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function toNullableString(value) {
  if (!hasText(value)) return null;
  return String(value).trim();
}

function timestampData(status, existing = null) {
  const now = new Date();
  const data = {};

  if (status === "REQUESTED" && !existing?.requestedAt) data.requestedAt = now;
  if (status === "ON_SCENE" && !existing?.arrivedAt) data.arrivedAt = now;
  if (status === "CLEARED" && !existing?.clearedAt) data.clearedAt = now;

  return data;
}

router.get(
  "/",
  requireAuth,
  requireRole(...READ_ROLES),
  async (req, res) => {
    try {
      const { type, sector, includeInactive } = req.query;
      const where = {};

      if (type) {
        const cleanType = normalizeServiceType(type);
        if (!cleanType) {
          return res.status(400).json({
            error: "Invalid service type",
            validTypes: SERVICE_TYPES,
          });
        }
        where.type = cleanType;
      }

      if (sector) where.sector = String(sector).trim();

      if (String(includeInactive || "").toLowerCase() !== "true") {
        where.isActive = true;
      }

      const services = await prisma.service.findMany({
        where,
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });

      res.json(services);
    } catch (error) {
      console.error("GET /services failed:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    try {
      const { name, type, phone, radio, sector, isActive } = req.body;

      if (!hasText(name)) {
        return res.status(400).json({ error: "Service name is required" });
      }

      const cleanType = normalizeServiceType(type);

      if (!cleanType) {
        return res.status(400).json({
          error: "Invalid service type",
          validTypes: SERVICE_TYPES,
        });
      }

      const service = await prisma.service.create({
        data: {
          name: String(name).trim(),
          type: cleanType,
          phone: toNullableString(phone),
          radio: toNullableString(radio),
          sector: toNullableString(sector),
          isActive: isActive === undefined ? true : Boolean(isActive),
        },
      });

      res.status(201).json(service);
    } catch (error) {
      console.error("POST /services failed:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    try {
      const { name, type, phone, radio, sector, isActive } = req.body;
      const data = {};

      if (name !== undefined) {
        if (!hasText(name)) {
          return res.status(400).json({ error: "Service name cannot be empty" });
        }
        data.name = String(name).trim();
      }

      if (type !== undefined) {
        const cleanType = normalizeServiceType(type);
        if (!cleanType) {
          return res.status(400).json({
            error: "Invalid service type",
            validTypes: SERVICE_TYPES,
          });
        }
        data.type = cleanType;
      }

      if (phone !== undefined) data.phone = toNullableString(phone);
      if (radio !== undefined) data.radio = toNullableString(radio);
      if (sector !== undefined) data.sector = toNullableString(sector);
      if (isActive !== undefined) data.isActive = Boolean(isActive);

      const service = await prisma.service.update({
        where: { id: req.params.id },
        data,
      });

      res.json(service);
    } catch (error) {
      console.error("PATCH /services/:id failed:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    try {
      const service = await prisma.service.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json(service);
    } catch (error) {
      console.error("DELETE /services/:id failed:", error);
      res.status(500).json({ error: "Failed to deactivate service" });
    }
  }
);

router.get(
  "/incident/:incidentId",
  requireAuth,
  requireRole(...READ_ROLES),
  async (req, res) => {
    try {
      const logs = await prisma.incidentServiceLog.findMany({
        where: { incidentId: req.params.incidentId },
        include: {
          service: true,
          incident: {
            select: {
              id: true,
              incidentCode: true,
              title: true,
              status: true,
              severity: true,
              sector: true,
              linkedPatrolId: true,
              reportedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      });

      res.json(logs);
    } catch (error) {
      console.error("GET /services/incident/:incidentId failed:", error);
      res.status(500).json({ error: "Failed to fetch incident service logs" });
    }
  }
);

router.get(
  "/incident-logs/report",
  requireAuth,
  requireRole(...OPERATION_ROLES),
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 250), 1000);

      const logs = await prisma.incidentServiceLog.findMany({
        take: limit,
        include: {
          service: true,
          incident: {
            select: {
              id: true,
              incidentCode: true,
              title: true,
              status: true,
              severity: true,
              sector: true,
              linkedPatrolId: true,
              reportedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      });

      res.json(logs);
    } catch (error) {
      console.error("GET /services/incident-logs/report failed:", error);
      res.status(500).json({ error: "Failed to fetch service report" });
    }
  }
);

router.post(
  "/incident/:incidentId/logs",
  requireAuth,
  requireRole(...OPERATION_ROLES),
  async (req, res) => {
    try {
      const { serviceId, status, refNumber, notes } = req.body;
      const cleanStatus = normalizeServiceStatus(status);

      if (!serviceId) {
        return res.status(400).json({ error: "serviceId is required" });
      }

      if (!cleanStatus) {
        return res.status(400).json({
          error: "Invalid service status",
          validStatuses: SERVICE_STATUSES,
        });
      }

      const incident = await prisma.incident.findUnique({
        where: { id: req.params.incidentId },
        select: { id: true },
      });

      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { id: true },
      });

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const existing = await prisma.incidentServiceLog.findFirst({
        where: {
          incidentId: req.params.incidentId,
          serviceId,
        },
      });

      if (existing) {
        const updateData = {
          status: cleanStatus,
          ...timestampData(cleanStatus, existing),
        };

        if (hasText(refNumber)) updateData.refNumber = String(refNumber).trim();
        if (hasText(notes)) updateData.notes = String(notes).trim();

        const updated = await prisma.incidentServiceLog.update({
          where: { id: existing.id },
          data: updateData,
          include: {
            service: true,
            incident: {
              select: {
                id: true,
                incidentCode: true,
                title: true,
                status: true,
                severity: true,
                sector: true,
                linkedPatrolId: true,
                reportedAt: true,
                createdAt: true,
              },
            },
          },
        });

        return res.json(updated);
      }

      const created = await prisma.incidentServiceLog.create({
        data: {
          incidentId: req.params.incidentId,
          serviceId,
          status: cleanStatus,
          refNumber: toNullableString(refNumber),
          notes: toNullableString(notes),
          ...timestampData(cleanStatus),
        },
        include: {
          service: true,
          incident: {
            select: {
              id: true,
              incidentCode: true,
              title: true,
              status: true,
              severity: true,
              sector: true,
              linkedPatrolId: true,
              reportedAt: true,
              createdAt: true,
            },
          },
        },
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("SERVICE LOG UPSERT FAILED:", error);
      res.status(500).json({ error: "Failed to upsert service log" });
    }
  }
);

router.patch(
  "/incident-logs/:id",
  requireAuth,
  requireRole(...OPERATION_ROLES),
  async (req, res) => {
    try {
      const { status, refNumber, notes } = req.body;
      const existing = await prisma.incidentServiceLog.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Service log not found" });
      }

      const data = {};

      if (status !== undefined) {
        const cleanStatus = normalizeServiceStatus(status);
        if (!cleanStatus) {
          return res.status(400).json({
            error: "Invalid service status",
            validStatuses: SERVICE_STATUSES,
          });
        }
        data.status = cleanStatus;
        Object.assign(data, timestampData(cleanStatus, existing));
      }

      if (hasText(refNumber)) data.refNumber = String(refNumber).trim();
      if (hasText(notes)) data.notes = String(notes).trim();

      const log = await prisma.incidentServiceLog.update({
        where: { id: req.params.id },
        data,
        include: {
          service: true,
          incident: {
            select: {
              id: true,
              incidentCode: true,
              title: true,
              status: true,
              severity: true,
              sector: true,
              linkedPatrolId: true,
              reportedAt: true,
              createdAt: true,
            },
          },
        },
      });

      res.json(log);
    } catch (error) {
      console.error("PATCH /services/incident-logs/:id failed:", error);
      res.status(500).json({ error: "Failed to update incident service log" });
    }
  }
);

router.delete(
  "/incident-logs/:id",
  requireAuth,
  requireRole(...OPERATION_ROLES),
  async (req, res) => {
    try {
      const log = await prisma.incidentServiceLog.delete({
        where: { id: req.params.id },
      });

      res.json(log);
    } catch (error) {
      console.error("DELETE /services/incident-logs/:id failed:", error);
      res.status(500).json({ error: "Failed to delete incident service log" });
    }
  }
);

export default router;
