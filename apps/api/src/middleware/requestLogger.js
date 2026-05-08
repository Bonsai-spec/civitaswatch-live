export function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const logEntry = {
      method: req.method,
      originalUrl: req.originalUrl,
      status: res.statusCode,
      durationMs,
    };

    if (req.user?.id) {
      logEntry.userId = req.user.id;
    }

    console.info(logEntry);
  });

  next();
}
