import { verifyToken } from "../utils/jwt.js";
import { logSecurityWarn } from "../utils/auditLogger.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

export function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      logSecurityWarn("missing_bearer_token", req);
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    logSecurityWarn("invalid_or_expired_token", req);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
