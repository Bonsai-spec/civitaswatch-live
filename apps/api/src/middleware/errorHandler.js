export function errorHandler(error, req, res, next) {
  const logEntry = {
    method: req.method,
    originalUrl: req.originalUrl,
    error: {
      name: error?.name,
      message: error?.message,
    },
  };

  if (process.env.NODE_ENV !== "production") {
    logEntry.error.stack = error?.stack;
  }

  console.error(logEntry);

  res.status(500).json({ error: "Internal server error" });
}
