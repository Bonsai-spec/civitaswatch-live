export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getJsonAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
