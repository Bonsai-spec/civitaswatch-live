import { prisma } from "../config/db.js";
import { logSecurityWarn } from "../utils/auditLogger.js";

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function requireRole(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const tokenRole = normalizeRole(req.user.role);

    if (normalizedAllowedRoles.includes(tokenRole)) {
      return next();
    }

    if (req.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, isActive: true },
      });

      const currentRole = normalizeRole(currentUser?.role);

      if (currentUser?.isActive && normalizedAllowedRoles.includes(currentRole)) {
        req.user.role = currentRole;
        return next();
      }
    }

    logSecurityWarn("forbidden_role_access", req);
    return res.status(403).json({ error: "Forbidden: insufficient role" });
  };
}
