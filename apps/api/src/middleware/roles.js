function logRoleEvent(event, req) {
  const logEntry = {
    event,
    method: req.method,
    originalUrl: req.originalUrl,
    ip: req.ip,
  };

  if (req.user?.id) {
    logEntry.userId = req.user.id;
  }

  console.warn(logEntry);
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.role) {
      logRoleEvent("forbidden_role_access", req);
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logRoleEvent("forbidden_role_access", req);
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    next();
  };
}
