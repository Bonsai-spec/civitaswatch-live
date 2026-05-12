export const ROLE_GROUPS = {
  MASTER: ["MASTER_ADMIN"],

  ADMIN_PANEL: ["MASTER_ADMIN", "ADMIN"],

  CONTROL_ROOM: ["MASTER_ADMIN", "CONTROL_ROOM"],

  PATROL_APP: ["MASTER_ADMIN", "PATROLLER", "PATROL"],

  REPORTS: ["MASTER_ADMIN", "ADMIN", "REPORTS", "SUPERVISOR"],

  REGISTERS: ["MASTER_ADMIN", "ADMIN"],

  OPERATIONS: ["MASTER_ADMIN", "ADMIN", "CONTROL_ROOM", "SUPERVISOR"],

  INTELLIGENCE: ["MASTER_ADMIN", "INTELLIGENCE", "INTELLIGENCE_ANALYST"],
};

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function roleMatches(userRole, allowedRoles = []) {
  const cleanUserRole = normalizeRole(userRole);
  const cleanAllowed = allowedRoles.map(normalizeRole);

  if (cleanUserRole === "MASTER_ADMIN") {
    return true;
  }

  if (cleanUserRole === "PATROL" && cleanAllowed.includes("PATROLLER")) {
    return true;
  }

  if (cleanUserRole === "PATROLLER" && cleanAllowed.includes("PATROL")) {
    return true;
  }

  return cleanAllowed.includes(cleanUserRole);
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!allowedRoles.length) {
      return next();
    }

    if (!roleMatches(req.user.role, allowedRoles)) {
      return res.status(403).json({
        error: "Forbidden",
        requiredRoles: allowedRoles,
        yourRole: req.user.role,
      });
    }

    return next();
  };
}

export function requireRoleGroup(groupName) {
  const roles = ROLE_GROUPS[groupName];

  if (!roles) {
    throw new Error(`Unknown role group: ${groupName}`);
  }

  return requireRole(...roles);
}
