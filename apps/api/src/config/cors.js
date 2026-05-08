const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGINS is required in production");
}

function validateOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  callback(null, allowedOrigins.includes(origin));
}

export const corsOptions = {
  origin: allowedOrigins.length ? validateOrigin : "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
