import { logSecurityWarn } from "../utils/auditLogger.js";

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.role) {
      logSecurityWarn("forbidden_role_access", req);
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logSecurityWarn("forbidden_role_access", req);
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    next();
  };
}
