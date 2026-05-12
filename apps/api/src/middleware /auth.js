import { prisma } from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "User inactive or not found",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

export function optionalAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}
