function normalizeApiBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

export const API = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ""
);
