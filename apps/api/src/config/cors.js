const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localDevOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGINS is required in production");
}

function validateOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  if (process.env.NODE_ENV !== "production" && localDevOriginPattern.test(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

export const corsOptions = {
  origin: process.env.NODE_ENV === "production" && allowedOrigins.length === 0 ? false : validateOrigin,
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
