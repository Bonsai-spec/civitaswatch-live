import { API } from "./api";

export const AUTH_ENDPOINTS = {
  login: `${API}/auth/login`,
  me: `${API}/auth/me`,
};

export const DASHBOARD_ENDPOINTS = {
  dashboard: (status, mine = false) =>
    `${API}/admin/dashboard?status=${status}${mine ? "&mine=true" : ""}`,
};

export const INCIDENT_ENDPOINTS = {
  create: `${API}/admin/incidents`,
  detail: (id) => `${API}/admin/incidents/${id}`,
  updateStatus: (id) => `${API}/admin/incidents/${id}/status`,
  archive: (id) => `${API}/admin/incidents/${id}/archive`,
  assignPatrol: (id) => `${API}/admin/incidents/${id}/assign-patrol`,
  unassignPatrol: (id) => `${API}/admin/incidents/${id}/unassign-patrol`,
  autoAssign: (id) => `${API}/incidents/${id}/auto-assign`,
};

export const MEMBER_ENDPOINTS = {
  list: `${API}/members`,
  patrollers: `${API}/members/patrollers`,
  detail: (id) => `${API}/members/${id}`,
  createPatrollerLogin: (id) => `${API}/members/${id}/create-patroller-login`,
  patrollerStatus: (id) => `${API}/members/${id}/patroller-status`,
};

export const PATROL_ENDPOINTS = {
  start: `${API}/patrols/start`,
  myActive: `${API}/patrols/me/active`,
  reports: (query = "") => `${API}/patrols/report/all${query ? `?${query}` : ""}`,
  adminUpdate: (id) => `${API}/patrols/${id}/admin-update`,
  audit: (id) => `${API}/patrols/${id}/audit`,
  end: (id) => `${API}/patrols/${id}/end`,
  events: `${API}/patrol-events`,
  assistanceRequests: `${API}/patrol-events/assistance/requests`,
};

export const ADMIN_REGISTER_ENDPOINTS = {
  incidentCodes: `${API}/admin/incident-codes`,
  incidentSubcodes: `${API}/admin/incident-subcodes`,
  serviceTypes: `${API}/admin/service-types`,
  emergencyContactTypes: `${API}/admin/emergency-contact-types`,
};

export const SERVICE_ENDPOINTS = {
  list: `${API}/services`,
};

export const VEHICLE_ENDPOINTS = {
  list: `${API}/vehicles`,
};

export const INTELLIGENCE_ENDPOINTS = {
  list: `${API}/intelligence`,
  detail: (id) => `${API}/intelligence/${id}`,
  connections: (id) => `${API}/intelligence/${id}/connections`,
  links: `${API}/intelligence/links`,
  linkDetail: (id) => `${API}/intelligence/links/${id}`,
};
