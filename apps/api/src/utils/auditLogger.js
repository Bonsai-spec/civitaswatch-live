function buildAuditEvent(event, req, extra = {}) {
  const logEntry = {
    event,
    method: req.method,
    originalUrl: req.originalUrl,
    ip: req.ip,
  };

  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) {
      logEntry[key] = value;
    }
  }

  if (req.user?.id && !logEntry.userId) {
    logEntry.userId = req.user.id;
  }

  return logEntry;
}

export function logSecurityWarn(event, req, extra = {}) {
  console.warn(buildAuditEvent(event, req, extra));
}

export function logSecurityInfo(event, req, extra = {}) {
  console.info(buildAuditEvent(event, req, extra));
}
