export function parseIntelDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRecordTimestamp(record) {
  if (!record) return null;

  return (
    record.observedAt ||
    record.reportedAt ||
    record.createdAt ||
    record.updatedAt ||
    record.timestamp ||
    record.date ||
    null
  );
}

export function getIntelAgeDays(record) {
  const timestamp = getRecordTimestamp(record);
  const date = parseIntelDate(timestamp);
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getIntelAgeLabel(record) {
  const days = getIntelAgeDays(record);

  if (days === null) return "No date";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export function getIntelTimeFilterLabel(timeFilter) {
  if (!timeFilter || timeFilter.preset === "ALL") return "All time";
  if (timeFilter.preset === "24H") return "Last 24 hours";
  if (timeFilter.preset === "7D") return "Last 7 days";
  if (timeFilter.preset === "30D") return "Last 30 days";
  if (timeFilter.preset === "90D") return "Last 90 days";

  const from = timeFilter.from || "start";
  const to = timeFilter.to || "today";
  return `Custom: ${from} → ${to}`;
}
