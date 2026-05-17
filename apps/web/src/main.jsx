import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MEMBER_ROLES, ROLE_MARKER } from "./auth/memberRoles";
import { PERMISSIONS_BY_ROLE, SYSTEM_ROLES } from "./auth/permissions";
import {
  getAuthHeaders as buildAuthHeaders,
  getJsonAuthHeaders as buildJsonAuthHeaders,
} from "./core/http.utils";
import {
  ADMIN_REGISTER_ENDPOINTS,
  MEMBER_ENDPOINTS,
  PATROL_ENDPOINTS,
  SERVICE_ENDPOINTS,
} from "./core/endpoints";
import { useAdminData } from "./hooks/useAdminData";
import { useAuth } from "./hooks/useAuth";
import { useIncidents } from "./hooks/useIncidents";
import { useIntelligence } from "./hooks/useIntelligence";
import { useMembers } from "./hooks/useMembers";
import { usePermissions } from "./hooks/usePermissions";
import { useReports } from "./hooks/useReports";
import AppShell from "./layout/AppShell";
import { ADMIN_NAV_SECTIONS } from "./navigation/admin.navigation";
import {
  flattenNavigationSections,
  getNavigationSectionsForRole,
} from "./navigation/navigation.helpers";
import IncidentsSection from "./modules/incidents/IncidentsSection";
import { getIncidentLinkedPatrolId } from "./modules/incidents/incident.utils";
import {
  INTEL_ENTITY_TYPES,
  INTEL_RELATIONSHIPS,
  INTEL_RISK_LEVELS,
  INTEL_STATUSES,
} from "./modules/intelligence/intelligence.constants";
import {
  getEntityLatLng,
  getIntelRiskBadge,
} from "./modules/intelligence/intelligence.utils";
import IntelligenceSection from "./modules/intelligence/IntelligenceSection";
import IntelGeoMap from "./modules/intelligence/IntelGeoMap";
import IntelSpiderGraph from "./modules/intelligence/IntelSpiderGraph";
import { getMemberRoles } from "./modules/members/member.utils";
import {
  getIntelAgeLabel,
  getIntelTimeFilterLabel,
} from "./utils/date.utils";
import {
  getDisplayName,
  getVehicleLabel,
} from "./modules/vehicles/vehicle.utils";
import {
  getPatrolOptionLabel,
  getPatrolVehicleLabel,
} from "./modules/patrols/patrol.utils";
import PatrolOperationsSection from "./modules/patrols/PatrolOperationsSection";
import PatrolsSection from "./modules/patrols/PatrolsSection";
import {
  filterRegisterIncidents,
  filterRegisterMembers,
  filterRegisterOrganisations,
  filterRegisterPatrollers,
  filterRegisterResidents,
  filterRegisterVehicles,
} from "./modules/registers/register.utils";
import { REGISTER_TABS } from "./modules/registers/register.constants";
import RegistersSection from "./modules/registers/RegistersSection";
import {
  REPORT_CATEGORIES,
  REPORT_SECTOR_FILTER_OPTIONS,
  REPORT_STATUS_FILTER_OPTIONS,
} from "./modules/reports/report.constants";
import ReportsSection from "./modules/reports/ReportsSection";
import {
  OPERATION_INCIDENT_TYPE_OPTIONS,
  OPERATION_SECTOR_OPTIONS,
  OPERATION_SEVERITY_OPTIONS,
  OPERATION_STATUS_FILTER_OPTIONS,
} from "./modules/operations/operations.constants";
import {
  getActiveIncidentCount,
  getActivePatrols,
  getAssignedPatrolName,
  getAssignedVehicleName,
  getOpenIncidentCount,
} from "./modules/operations/operations.utils";
import "./index.css";

const CONTROL_ROOM_TABS = [
  "Live Overview",
  "Assistance Requests",
  "Incidents",
  "Incident Codes Reference",
  "Active Patrols",
  "Patroller Directory",
  "Emergency Services",
  "Selected Incident Services",
  "Patrol Reports",
  "Selected Patrol Timeline",
  "Map",
];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function getPreferredLandingRoute(role) {
  switch (role) {
    case SYSTEM_ROLES.PATROLLER:
    case SYSTEM_ROLES.PATROL:
      return "Patrol Operations";
    case SYSTEM_ROLES.CONTROL_ROOM:
      return "Incidents";
    case SYSTEM_ROLES.INTELLIGENCE_ANALYST:
      return "Intelligence";
    case SYSTEM_ROLES.ADMIN:
    case SYSTEM_ROLES.MASTER_ADMIN:
    default:
      return "Dashboard";
  }
}

function formatOperationalTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatClassificationRecord(record, valueKey) {
  if (!record || typeof record !== "object") return null;

  const value = record[valueKey] || record.code || record.subcode || record.type;
  if (!value) return null;

  return [value, record.name].filter(Boolean).join(" - ");
}

function formatPatrolEventClassificationRecord(record, valueKey) {
  return formatClassificationRecord(record, valueKey);
}

const SERVICE_TYPE_LABELS = {
  POLICE: "SAPS",
  FIRE: "Fire Services",
  AMBULANCE: "Ambulance / Medical",
  METRO: "Metro / Municipality",
  SECURITY_BACKUP: "Sector Contacts",
  CONTROL_ROOM: "Internal / Community",
  TRAFFIC: "Traffic",
  TOWING: "Towing",
  MEDICAL_AID: "Medical Aid",
  OTHER: "Other",
};

function formatServiceTypeLabel(type) {
  return SERVICE_TYPE_LABELS[type] || type || "Other";
}

function getIncidentClassificationLines(item) {
  const incident = item?.incident || null;
  const codeLabel = formatClassificationRecord(
    item?.incidentCodeRef || incident?.incidentCodeRef,
    "code"
  );
  const subcodeLabel = formatClassificationRecord(
    item?.incidentSubcodeRef || incident?.incidentSubcodeRef,
    "subcode"
  );

  return [
    codeLabel ? `Incident Code: ${codeLabel}` : null,
    subcodeLabel ? `Incident Subcode: ${subcodeLabel}` : null,
  ].filter(Boolean);
}

function getIncidentClassificationFallback(item) {
  const incident = item?.incident || null;

  return (
    item?.incidentType ||
    (typeof item?.incidentCode === "string" ? item.incidentCode : null) ||
    item?.type ||
    incident?.incidentType ||
    (typeof incident?.incidentCode === "string" ? incident.incidentCode : null) ||
    incident?.type ||
    null
  );
}

function getIncidentClassificationLabel(item) {
  const classificationLines = getIncidentClassificationLines(item);
  if (classificationLines.length) return classificationLines.join(" • ");

  return getIncidentClassificationFallback(item) || "N/A";
}

function formatPatrolEventServiceLabel(event) {
  const serviceType = event?.serviceTypeRef;
  const infrastructureType = event?.infrastructureTypeRef;

  if (serviceType?.type) {
    return [serviceType.type, serviceType.category].filter(Boolean).join(" - ");
  }

  if (infrastructureType?.type) {
    return [infrastructureType.type, infrastructureType.riskLevel].filter(Boolean).join(" - ");
  }

  return event?.assistance || event?.infrastructureType || "";
}

function formatPatrolEventLocation(event) {
  const street = [event?.streetNumber, event?.streetName].filter(Boolean).join(" ");
  const parts = [
    street,
    event?.suburb,
    event?.locationNotes,
    event?.latitude !== null && event?.latitude !== undefined && event?.longitude !== null && event?.longitude !== undefined
      ? `${event.latitude}, ${event.longitude}`
      : null,
  ].filter(Boolean);

  if (parts.length) return parts.join(" - ");

  const description = String(event?.description || "");
  const locationLine = description
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^Location:/i.test(line));

  return locationLine ? locationLine.replace(/^Location:\s*/i, "") : "";
}

function getPatrolEventLocationDetails(event) {
  if (!event) return [];

  return [
    event.streetNumber ? `Street Number: ${event.streetNumber}` : null,
    event.streetName ? `Street Name: ${event.streetName}` : null,
    event.suburb ? `Suburb: ${event.suburb}` : null,
    event.locationNotes ? `Landmark / Location Notes: ${event.locationNotes}` : null,
    event.latitude !== null && event.latitude !== undefined ? `Latitude: ${event.latitude}` : null,
    event.longitude !== null && event.longitude !== undefined ? `Longitude: ${event.longitude}` : null,
  ].filter(Boolean);
}

function decorateIncidentForControlRoom(incident) {
  if (!incident) return incident;

  return {
    ...incident,
    incidentType: getIncidentClassificationLabel(incident),
    patrolEvents: (incident.patrolEvents || []).map((event) => ({
      ...event,
      type: getIncidentClassificationLabel(event),
    })),
  };
}

function decorateAssistanceRequestForControlRoom(request) {
  const classification = getIncidentClassificationLabel(request);
  const service = formatPatrolEventServiceLabel(request);
  const location = formatPatrolEventLocation(request);
  const description = [
    classification !== "N/A" ? classification : null,
    service ? `Service: ${service}` : null,
    request.referenceNumber ? `Reference: ${request.referenceNumber}` : null,
    location ? `Location: ${location}` : null,
    request.description,
  ].filter(Boolean).join(" | ");

  return {
    ...request,
    description: description || request.description,
  };
}

function getPatrolTimelineEvents(patrol) {
  return patrol?.patrolEvents || patrol?.events || [];
}

function getPatrolClassificationItems(patrol) {
  return getPatrolTimelineEvents(patrol).map((event) => ({
    id: event.id,
    label: getIncidentClassificationLabel(event),
    at: event.createdAt,
  }));
}

function decoratePatrolReportForControlRoom(patrol) {
  const classifications = getPatrolClassificationItems(patrol)
    .map((item) => item.label)
    .filter(Boolean);
  const uniqueClassifications = Array.from(new Set(classifications));

  if (!uniqueClassifications.length) return patrol;

  return {
    ...patrol,
    summary: [uniqueClassifications.join(" • "), patrol.summary].filter(Boolean).join(" | "),
  };
}

function getCrewMemberName(crewMember) {
  return (
    crewMember?.user?.fullName ||
    [crewMember?.member?.firstName, crewMember?.member?.surname]
      .filter(Boolean)
      .join(" ") ||
    crewMember?.user?.email ||
    crewMember?.member?.email ||
    "Crew member"
  );
}

function getPatrolDriverName(patrol) {
  const driverCrew = (patrol?.crew || []).find((crewMember) => crewMember.role === "DRIVER");

  if (driverCrew) return getCrewMemberName(driverCrew);

  return (
    patrol?.user?.fullName ||
    [patrol?.user?.member?.firstName, patrol?.user?.member?.surname]
      .filter(Boolean)
      .join(" ") ||
    patrol?.user?.email ||
    patrol?.driverName ||
    "Driver not set"
  );
}

function getPatrolCallSign(patrol) {
  const driverCrew = (patrol?.crew || []).find((crewMember) => crewMember.role === "DRIVER");

  return (
    patrol?.callSign ||
    patrol?.callsign ||
    patrol?.patrolCallSign ||
    patrol?.radioCallSign ||
    patrol?.tempVehicleCallSign ||
    driverCrew?.member?.callSign ||
    patrol?.user?.member?.callSign ||
    patrol?.user?.callSign ||
    patrol?.vehicle?.callSign ||
    patrol?.vehicle?.callsign ||
    patrol?.vehicle?.registration ||
    "No call sign"
  );
}

function getOperationalVehicleLabel(patrol) {
  return (
    patrol?.vehicleLabel ||
    patrol?.vehicle?.registration ||
    [
      patrol?.tempVehicleRegistration,
      patrol?.tempVehicleMake,
      patrol?.tempVehicleModel,
      patrol?.tempVehicleColour,
      patrol?.tempVehicleType,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle not set"
  );
}

function getPatrolCrewSummary(patrol) {
  const crew = patrol?.crew || [];
  const crewOnly = crew.filter((crewMember) => crewMember.role !== "DRIVER");
  const names = crewOnly.map(getCrewMemberName).filter(Boolean);

  if (!names.length) return "0 crew";
  return `${names.length} crew: ${names.join(", ")}`;
}

function getPatrolStatusLabel(patrol) {
  const status = String(patrol?.status || "").trim().toUpperCase();

  if (patrol?.endTime || status === "COMPLETED" || status === "ENDED") {
    return "LOGGED_OFF / ENDED";
  }

  if (status === "ACTIVE") return "ON_PATROL";
  if (status === "MOBILE") return "RESUME_PATROL / MOBILE";
  if (["NOTIFIED", "EN_ROUTE", "ON_SCENE", "STAND_DOWN"].includes(status)) return status;
  if (status === "RESUME_PATROL") return "RESUME_PATROL / MOBILE";

  return status || "ON_PATROL";
}

function getLatestPatrolOperationalEvent(patrol) {
  const events = getPatrolTimelineEvents(patrol)
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return events.find((event) => !isPatrolStatusOnlyEvent(event)) || events[0] || null;
}

function isPatrolStatusOnlyEvent(event) {
  if (!event) return true;

  const description = String(event.description || "").trim();
  const type = String(event.type || "").trim().toUpperCase();

  if (/^(Patrol|Incident) status:/i.test(description)) return true;

  if (["NOTIFIED", "EN_ROUTE", "ON_SCENE", "STAND_DOWN", "RESUME_PATROL"].includes(type)) {
    return !(
      event.assistance ||
      event.serviceTypeId ||
      event.serviceTypeRef ||
      event.infrastructureTypeId ||
      event.infrastructureTypeRef ||
      event.referenceNumber ||
      event.streetName ||
      event.locationNotes
    );
  }

  return false;
}

function getPatrolEventTitle(event) {
  if (!event) return "No patrol events logged";
  if (event.assistance) return "Assistance Request";
  if (event.type === "INFRASTRUCTURE") return "Infrastructure";
  if (event.incidentCode || event.incidentCodeId || event.incidentCodeRef) return "Incident Response";
  if (event.type === "MOBILE") return "Observation";
  return event.type || "Patrol Event";
}

function getPatrolEventDescriptionSummary(event) {
  const description = String(event?.description || "").trim();
  if (!description) return "";

  return description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !/^Location:/i.test(line)) || "";
}

function getPatrolEventLocationSummary(event) {
  return formatPatrolEventLocation(event);
}

function getPatrolEventClassificationSummary(event) {
  const incidentCode = formatPatrolEventClassificationRecord(
    event?.incidentCodeRef || event?.incident?.incidentCodeRef,
    "code"
  );
  const incidentSubcode = formatPatrolEventClassificationRecord(
    event?.incidentSubcodeRef || event?.incident?.incidentSubcodeRef,
    "subcode"
  );
  const parts = [
    incidentCode || event?.incidentCode,
    incidentSubcode,
    event?.serviceTypeRef?.type,
    event?.infrastructureTypeRef?.type,
  ].filter(Boolean);

  return parts.join(" / ");
}

function getLatestActivityItems({ assistanceRequests, activePatrols, incidents }) {
  return [
    ...assistanceRequests.map((request) => ({
      id: `assistance-${request.id}`,
      title: `Assistance requested: ${request.assistance || "Unspecified"}`,
      detail: getPatrolCallSign(request.patrol),
      at: request.createdAt,
    })),
    ...activePatrols.map((patrol) => ({
      id: `patrol-${patrol.id}`,
      title: `Patrol ${patrol.status || "ACTIVE"}`,
      detail: getPatrolCallSign(patrol),
      at: patrol.updatedAt || patrol.startTime || patrol.createdAt,
    })),
    ...incidents.map((incident) => ({
      id: `incident-${incident.id}`,
      title: `Incident ${incident.status || "OPEN"}`,
      detail: incident.title || incident.incidentCode || "Incident",
      at: incident.updatedAt || incident.reportedAt || incident.createdAt,
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);
}

function App() {
  const {
    token,
    user,
    email,
    password,
    setEmail,
    setPassword,
    login,
    logout,
  } = useAuth();

  const [active, setActive] = useState("Dashboard");
  const [controlRoomTab, setControlRoomTab] = useState("Live Overview");
  const [registerTab, setRegisterTab] = useState("Members");
  const [registerSearch, setRegisterSearch] = useState("");
  const [controlRoomRefreshing, setControlRoomRefreshing] = useState(false);
  const [controlRoomDirectory, setControlRoomDirectory] = useState({
    services: [],
    serviceTypes: [],
    emergencyContactTypes: [],
  });
  const [controlRoomDirectoryLoading, setControlRoomDirectoryLoading] = useState(false);
  const [controlRoomDirectoryError, setControlRoomDirectoryError] = useState("");
  const [controlRoomIncidentReference, setControlRoomIncidentReference] = useState({
    incidentCodes: [],
    incidentSubcodes: [],
  });
  const [controlRoomIncidentCodeFilter, setControlRoomIncidentCodeFilter] = useState("ALL");
  const [controlRoomIncidentReferenceLoading, setControlRoomIncidentReferenceLoading] =
    useState(false);
  const [controlRoomIncidentReferenceError, setControlRoomIncidentReferenceError] =
    useState("");
  const [controlRoomPatrollerDirectory, setControlRoomPatrollerDirectory] = useState([]);
  const [controlRoomPatrollerDirectoryLoading, setControlRoomPatrollerDirectoryLoading] =
    useState(false);
  const [controlRoomPatrollerDirectoryError, setControlRoomPatrollerDirectoryError] =
    useState("");

  const {
    userRole,
    canCreateIncidents,
    canUpdateIncidents,
    canAssignPatrol,
    canViewPatrols,
    canViewPatrolOperations,
    canViewRegisters,
    canManageMembers,
    canViewReports,
    canViewIntelligence,
    isAdmin,
    isPatrol,
  } = usePermissions(user);

  const adminDataActionsRef = useRef({
    loadDashboard: async () => {},
    loadWorkload: async () => {},
  });

  const {
    loading,
    selectedIncident,
    setSelectedIncident,
    filter,
    setFilter,
    form,
    setForm,
    resetIncidents,
    autoAssignIncident,
    createIncident,
    updateStatus,
    archiveIncident,
    deleteIncident,
    assignPatrol,
    unassignPatrol,
    viewIncident,
    editIncident,
  } = useIncidents({
    canCreateIncidents,
    canUpdateIncidents,
    canAssignPatrol,
    getAuthHeaders,
    getJsonAuthHeaders,
    loadDashboard: (...args) => adminDataActionsRef.current.loadDashboard(...args),
    loadWorkload: (...args) => adminDataActionsRef.current.loadWorkload(...args),
    setActive,
  });

  const {
    data,
    workload,
    loadDashboard,
    loadWorkload,
    resetAdminData,
  } = useAdminData({
    token,
    user,
    filter,
    isPatrol,
    canViewPatrols,
    selectedIncident,
    setSelectedIncident,
    onUnauthorized: handleLogout,
  });

  adminDataActionsRef.current.loadDashboard = loadDashboard;
  adminDataActionsRef.current.loadWorkload = loadWorkload;

  // Admin navigation separates management views from the local Control Room
  // workflow. The Admin Dashboard is an overview, not a replacement for
  // operational dispatch functions.
  const navSections = useMemo(() => {
    return getNavigationSectionsForRole(ADMIN_NAV_SECTIONS, PERMISSIONS_BY_ROLE, userRole);
  }, [userRole]);

  const navItems = useMemo(
    () => flattenNavigationSections(navSections).map((item) => item.label),
    [navSections]
  );

  const landingRoute = useMemo(() => {
    const preferredRoute = getPreferredLandingRoute(userRole);
    return navItems.includes(preferredRoute) ? preferredRoute : navItems[0] || "Dashboard";
  }, [navItems, userRole]);

  function getAuthHeaders(customToken = token) {
    return buildAuthHeaders(customToken);
  }

  function getJsonAuthHeaders(customToken = token) {
    return buildJsonAuthHeaders(customToken);
  }

  const isControlRoomUser = userRole === SYSTEM_ROLES.CONTROL_ROOM;
  const canUseControlRoomReports = canViewReports || isControlRoomUser;
  const isRegisterRoute = REGISTER_TABS.includes(active);
  const isReportRoute = REPORT_CATEGORIES.includes(active);
  const activeRegisterTab = isRegisterRoute ? active : registerTab;
  const activeReportCategory = isReportRoute ? active : "Patrol Reports";
  // Control Room report summaries are part of the local overview, so loading follows
  // the active local tab instead of the global Reports route.
  const reportActiveRoute =
    isControlRoomUser &&
    ["Live Overview", "Patrol Reports", "Selected Patrol Timeline"].includes(controlRoomTab)
      ? "Reports"
      : isReportRoute
      ? "Reports"
      : active;

  const {
    reportFilters,
    setReportFilters,
    selectedPatrolReport,
    editPatrolForm,
    setEditPatrolForm,
    patrolAuditLogs,
    filteredPatrolReports,
    patrollerFilterOptions,
    reportTotalKm,
    completedReportCount,
    activeReportCount,
    loadPatrolReports,
    clearReportFilters,
    viewPatrolReport,
    editPatrolReport,
    closePatrolReport,
    savePatrolReportEdits,
    loadPatrolReportAudit,
    closeActivePatrol,
  } = useReports({
    token,
    active: reportActiveRoute,
    canViewReports: canUseControlRoomReports,
    data,
    getAuthHeaders,
    getJsonAuthHeaders,
    loadDashboard,
  });

  const {
    selectedMember,
    setSelectedMember,
    memberForm,
    setMemberForm,
    isEditingMember,
    startAddMember,
    startEditMember,
    cancelMemberForm,
    saveMember,
    disableMember,
    enableMember,
    createPatrollerLogin,
    updatePatrollerStatus,
  } = useMembers({
    canManageMembers,
    getJsonAuthHeaders,
    loadDashboard,
  });

  const {
    intelligenceEntities,
    selectedIntelEntity,
    setSelectedIntelEntity,
    intelForm,
    setIntelForm,
    isEditingIntel,
    intelSearch,
    setIntelSearch,
    intelTimeFilter,
    setIntelTimeFilter,
    intelLinkForm,
    setIntelLinkForm,
    autoLinkSuggestions,
    filteredIntelligenceEntities,
    refreshIntelligence,
    startAddIntelEntity,
    startEditIntelEntity,
    cancelIntelForm,
    saveIntelEntity,
    viewIntelEntity,
    deleteIntelEntity,
    createIntelLink,
    deleteIntelLink,
    createSuggestedIntelLink,
    hideAutoLinkSuggestion,
    rejectAutoLinkSuggestion,
    resetIntelligence,
  } = useIntelligence({
    token,
    active,
    canViewIntelligence,
    getAuthHeaders,
    getJsonAuthHeaders,
  });

  function handleLogout() {
    logout();
    resetIncidents();
    setActive("Dashboard");
    resetAdminData();
    resetIntelligence();
  }

  useEffect(() => {
    if (isRegisterRoute) {
      setRegisterTab(active);
    }
  }, [active, isRegisterRoute]);

  useEffect(() => {
    if (token && userRole) {
      setActive((current) => (current === "Dashboard" ? landingRoute : current));
    }
  }, [landingRoute, token, userRole]);

  useEffect(() => {
    if (!navItems.includes(active)) {
      setActive(landingRoute);
    }
  }, [navItems, active, landingRoute]);

const registerSearchText = registerSearch.toLowerCase();

const filteredRegisterIncidents = filterRegisterIncidents(data.incidents, registerSearchText);
const filteredRegisterVehicles = filterRegisterVehicles(data.vehicles, registerSearchText);
const filteredRegisterMembers = filterRegisterMembers(data.members, registerSearchText);
const filteredRegisterResidents = filterRegisterResidents(data.members, registerSearchText);
const filteredRegisterPatrollers = filterRegisterPatrollers(data.members, registerSearchText);
const filteredRegisterOrganisations = filterRegisterOrganisations(
  data.organisations,
  registerSearchText
);

  // Active Patrols include operational statuses such as ACTIVE, MOBILE,
  // NOTIFIED, EN_ROUTE, ON_SCENE, and STAND_DOWN.
  const activePatrols = getActivePatrols(data.patrols);
  // CONTROL_ROOM must always stay inside the local Control Room tabs; old route
  // sections below are explicitly suppressed for this role.
  const showControlRoomTabs = isControlRoomUser;
  const controlRoomData = useMemo(() => {
    if (!isControlRoomUser) return data;

    return {
      ...data,
      incidents: (data.incidents || []).map(decorateIncidentForControlRoom),
      assistanceRequests: (data.assistanceRequests || []).map(
        decorateAssistanceRequestForControlRoom
      ),
    };
  }, [data, isControlRoomUser]);
  const controlRoomSelectedIncident = isControlRoomUser
    ? decorateIncidentForControlRoom(selectedIncident)
    : selectedIncident;
  const controlRoomPatrolReports = useMemo(() => {
    if (!isControlRoomUser) return filteredPatrolReports;
    return filteredPatrolReports.map(decoratePatrolReportForControlRoom);
  }, [filteredPatrolReports, isControlRoomUser]);
  const controlRoomSelectedPatrolReport = isControlRoomUser
    ? decoratePatrolReportForControlRoom(selectedPatrolReport)
    : selectedPatrolReport;
  const latestActivityItems = getLatestActivityItems({
    assistanceRequests: controlRoomData.assistanceRequests || [],
    activePatrols,
    incidents: controlRoomData.incidents || [],
  });

  async function refreshControlRoom() {
    // Manual refresh reloads the operational data displayed in Live Overview:
    // active patrols/dashboard state, assistance requests, and patrol reports.
    try {
      setControlRoomRefreshing(true);
      await loadDashboard();
      await loadWorkload();

      if (canUseControlRoomReports) {
        await loadPatrolReports();
      }
    } finally {
      setControlRoomRefreshing(false);
    }
  }

  async function resolveAssistanceRequest(request) {
    if (!request?.id) return;

    try {
      setControlRoomRefreshing(true);
      const res = await fetch(`${PATROL_ENDPOINTS.assistanceRequests}/${request.id}/resolve`, {
        method: "POST",
        headers: getJsonAuthHeaders(),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json.error || "Failed to resolve assistance request");
        return;
      }

      await loadDashboard();
      await loadWorkload();

      if (canUseControlRoomReports) {
        await loadPatrolReports();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to resolve assistance request");
    } finally {
      setControlRoomRefreshing(false);
    }
  }

  async function loadControlRoomDirectory() {
    if (!token || !isControlRoomUser) return;

    try {
      setControlRoomDirectoryLoading(true);
      setControlRoomDirectoryError("");

      const servicesRes = await fetch(SERVICE_ENDPOINTS.list, {
        headers: getAuthHeaders(),
      });
      const servicesJson = await servicesRes.json().catch(() => null);

      if (!servicesRes.ok) {
        throw new Error(servicesJson?.error || "Failed to load services.");
      }

      setControlRoomDirectory({
        services: Array.isArray(servicesJson) ? servicesJson : [],
        serviceTypes: [],
        emergencyContactTypes: [],
      });
    } catch (error) {
      console.error(error);
      setControlRoomDirectoryError(error.message || "Failed to load service directory.");
    } finally {
      setControlRoomDirectoryLoading(false);
    }
  }

  useEffect(() => {
    if (isControlRoomUser && controlRoomTab === "Emergency Services") {
      loadControlRoomDirectory();
    }
  }, [isControlRoomUser, controlRoomTab, token]);

  async function loadControlRoomIncidentReference() {
    if (!token || !isControlRoomUser) return;

    try {
      setControlRoomIncidentReferenceLoading(true);
      setControlRoomIncidentReferenceError("");

      const [incidentCodesRes, incidentSubcodesRes] = await Promise.all([
        fetch(`${ADMIN_REGISTER_ENDPOINTS.incidentCodes}?active=true`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${ADMIN_REGISTER_ENDPOINTS.incidentSubcodes}?active=true`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const [incidentCodesJson, incidentSubcodesJson] = await Promise.all([
        incidentCodesRes.json().catch(() => null),
        incidentSubcodesRes.json().catch(() => null),
      ]);

      if (!incidentCodesRes.ok) {
        throw new Error(incidentCodesJson?.error || "Failed to load incident codes.");
      }

      if (!incidentSubcodesRes.ok) {
        throw new Error(incidentSubcodesJson?.error || "Failed to load incident subcodes.");
      }

      setControlRoomIncidentReference({
        incidentCodes: Array.isArray(incidentCodesJson) ? incidentCodesJson : [],
        incidentSubcodes: Array.isArray(incidentSubcodesJson) ? incidentSubcodesJson : [],
      });
    } catch (error) {
      console.error(error);
      setControlRoomIncidentReferenceError(
        error.message || "Failed to load incident code reference."
      );
    } finally {
      setControlRoomIncidentReferenceLoading(false);
    }
  }

  useEffect(() => {
    if (isControlRoomUser && controlRoomTab === "Incident Codes Reference") {
      loadControlRoomIncidentReference();
    }
  }, [isControlRoomUser, controlRoomTab, token]);

  async function loadControlRoomPatrollerDirectory() {
    if (!token || !isControlRoomUser) return;

    try {
      setControlRoomPatrollerDirectoryLoading(true);
      setControlRoomPatrollerDirectoryError("");

      const res = await fetch(MEMBER_ENDPOINTS.patrollers, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load patroller directory.");
      }

      setControlRoomPatrollerDirectory(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error(error);
      setControlRoomPatrollerDirectoryError(
        error.message || "Failed to load patroller directory."
      );
    } finally {
      setControlRoomPatrollerDirectoryLoading(false);
    }
  }

  useEffect(() => {
    if (isControlRoomUser && controlRoomTab === "Patroller Directory") {
      loadControlRoomPatrollerDirectory();
    }
  }, [isControlRoomUser, controlRoomTab, token]);

  function renderIncidentsSection(options = {}, sectionChildren = null) {
    const sectionData = isControlRoomUser ? controlRoomData : data;
    const sectionSelectedIncident = isControlRoomUser
      ? controlRoomSelectedIncident
      : selectedIncident;

    return (
      <IncidentsSection
        data={sectionData}
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setSelectedIncident(null);
        }}
        statusFilterOptions={OPERATION_STATUS_FILTER_OPTIONS}
        canCreateIncidents={canCreateIncidents}
        form={form}
        onIncidentFormFieldChange={(field, value) =>
          setForm({ ...form, [field]: value })
        }
        incidentTypeOptions={OPERATION_INCIDENT_TYPE_OPTIONS}
        sectorOptions={OPERATION_SECTOR_OPTIONS}
        severityOptions={OPERATION_SEVERITY_OPTIONS}
        onCreateIncident={createIncident}
        loading={loading}
        isPatrol={isPatrol}
        selectedIncident={sectionSelectedIncident}
        onCloseSelectedIncident={() => setSelectedIncident(null)}
        getAssignedPatrolName={getAssignedPatrolName}
        getAssignedVehicleName={getAssignedVehicleName}
        onUpdateStatus={updateStatus}
        canAssignPatrol={canAssignPatrol}
        onAutoAssignIncident={autoAssignIncident}
        getIncidentLinkedPatrolId={getIncidentLinkedPatrolId}
        onAssignSelectedIncidentPatrol={(patrolId) =>
          assignPatrol(
            sectionSelectedIncident.id,
            patrolId,
            sectionSelectedIncident.assignedVehicleId ||
              sectionSelectedIncident.vehicleId ||
              sectionSelectedIncident.linkedVehicleId
          )
        }
        onAssignSelectedIncidentVehicle={(vehicleId) =>
          assignPatrol(
            sectionSelectedIncident.id,
            sectionSelectedIncident.assignedPatrolId ||
              sectionSelectedIncident.patrolId ||
              sectionSelectedIncident.linkedPatrolId,
            vehicleId
          )
        }
        activePatrols={activePatrols}
        getPatrolOptionLabel={getPatrolOptionLabel}
        getVehicleLabel={getVehicleLabel}
        onUnassignPatrol={unassignPatrol}
        onArchiveIncident={archiveIncident}
        onDeleteIncident={deleteIncident}
        onSelectIncident={setSelectedIncident}
        onResolveAssistanceRequest={isControlRoomUser ? resolveAssistanceRequest : undefined}
        {...options}
      >
        {sectionChildren}
      </IncidentsSection>
    );
  }

  function renderReportsSection(options = {}) {
    return (
      <ReportsSection
        data={isControlRoomUser ? controlRoomData : data}
        reportFilters={reportFilters}
        onReportFiltersChange={setReportFilters}
        onClearReportFilters={clearReportFilters}
        onRefreshReports={loadPatrolReports}
        sectorFilterOptions={REPORT_SECTOR_FILTER_OPTIONS}
        statusFilterOptions={REPORT_STATUS_FILTER_OPTIONS}
        patrollerFilterOptions={patrollerFilterOptions}
        filteredPatrolReports={isControlRoomUser ? controlRoomPatrolReports : filteredPatrolReports}
        reportTotalKm={reportTotalKm}
        completedReportCount={completedReportCount}
        activeReportCount={activeReportCount}
        selectedPatrolReport={
          isControlRoomUser ? controlRoomSelectedPatrolReport : selectedPatrolReport
        }
        editPatrolForm={editPatrolForm}
        onEditPatrolFormChange={setEditPatrolForm}
        patrolAuditLogs={patrolAuditLogs}
        onClosePatrolReport={closePatrolReport}
        onSavePatrolReportEdits={savePatrolReportEdits}
        onViewPatrolReport={viewPatrolReport}
        onEditPatrolReport={editPatrolReport}
        onLoadPatrolReportAudit={loadPatrolReportAudit}
        onCloseActivePatrol={closeActivePatrol}
        getVehicleLabel={getVehicleLabel}
        {...options}
      />
    );
  }

  function renderPatrolWorkloadPanel() {
    return (
      <div className="panel active-patrols-panel">
        <h2>Active Patrols</h2>

        {activePatrols.length === 0 && <p>No active patrols to show yet.</p>}

        {activePatrols.map((patrol) => {
          const latestEvent = getLatestPatrolOperationalEvent(patrol);
          const classification = getPatrolEventClassificationSummary(latestEvent);
          const description = getPatrolEventDescriptionSummary(latestEvent);
          const location = getPatrolEventLocationSummary(latestEvent);
          const locationDetails = getPatrolEventLocationDetails(latestEvent);
          const service = formatPatrolEventServiceLabel(latestEvent);

          return (
            <div key={patrol.id} className="item">
              <div>
                <strong>Call Sign: {getPatrolCallSign(patrol)}</strong>
                <div>Driver: {getPatrolDriverName(patrol)}</div>
                <div>Crew: {getPatrolCrewSummary(patrol)}</div>
                <div>Vehicle: {getOperationalVehicleLabel(patrol)}</div>
                <div>Sector: {patrol.sector || "-"}</div>
                <div>Patrol Status: {getPatrolStatusLabel(patrol)}</div>
                <div>Last update: {formatOperationalTime(patrol.updatedAt || patrol.startTime || patrol.createdAt)}</div>
                {latestEvent && (
                  <div className="patrol-latest-event">
                    <div><strong>Latest Event:</strong> {getPatrolEventTitle(latestEvent)}</div>
                    {classification && <div>Code/Subcode: {classification}</div>}
                    {service && <div>Service / Type: {service}</div>}
                    {latestEvent.referenceNumber && <div>Reference number: {latestEvent.referenceNumber}</div>}
                    {description && <div>Description: {description}</div>}
                    {locationDetails.length > 0
                      ? locationDetails.map((line) => <div key={line}>{line}</div>)
                      : location && <div>Location: {location}</div>}
                    <div>Event time: {formatOperationalTime(latestEvent.createdAt)}</div>
                  </div>
                )}
              </div>
              <span className="badge">{getPatrolStatusLabel(patrol)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPatrolReportsOverviewPanel() {
    return (
      <div className="panel">
        <h2>Patrol Reports</h2>
        <div className="cards control-room-mini-cards">
          <div className="card">
            <div className="card-title">Reports</div>
            <div className="card-value">{filteredPatrolReports.length}</div>
            <div className="card-detail">Matching current filters</div>
          </div>
          <div className="card">
            <div className="card-title">Active</div>
            <div className="card-value">{activeReportCount}</div>
            <div className="card-detail">Currently on patrol</div>
          </div>
        </div>
      </div>
    );
  }

  function renderPatrolReportClassificationsPanel(reports) {
    const rows = reports
      .flatMap((report) =>
        getPatrolClassificationItems(report).map((item) => ({
          ...item,
          patrolId: report.id,
          patrolLabel: getPatrolCallSign(report),
        }))
      )
      .filter((item) => item.label && item.label !== "N/A")
      .slice(0, 12);

    if (!rows.length) return null;

    return (
      <div className="panel">
        <h2>Incident Classifications</h2>
        {rows.map((item) => (
          <div key={`${item.patrolId}-${item.id}`} className="item">
            <div>
              <strong>{item.patrolLabel}</strong>
              <div>{item.label}</div>
            </div>
            <span className="badge">{formatOperationalTime(item.at)}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderSelectedPatrolTimelineClassifications() {
    const events = getPatrolTimelineEvents(controlRoomSelectedPatrolReport);

    if (!controlRoomSelectedPatrolReport || !events.length) return null;

    return (
      <div className="panel">
        <h2>Incident Classifications</h2>
        {events.map((event) => (
          <div key={event.id} className="item">
            <div>
              <strong>{event.type || "Patrol event"}</strong>
              <div>{getIncidentClassificationLabel(event)}</div>
            </div>
            <span className="badge">{formatOperationalTime(event.createdAt)}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderLatestActivityPanel() {
    return (
      <div className="panel">
        <h2>Latest Activity</h2>

        {latestActivityItems.length === 0 && <p>No recent operational activity.</p>}

        {latestActivityItems.map((item) => (
          <div key={item.id} className="item">
            <div>
              <strong>{item.title}</strong>
              <div>{item.detail}</div>
            </div>
            <span className="badge">{formatOperationalTime(item.at)}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderControlRoomDirectoryPanel() {
    const { services } = controlRoomDirectory;
    const groupedServices = services.reduce((groups, service) => {
      const key = formatServiceTypeLabel(service.type);
      return {
        ...groups,
        [key]: [...(groups[key] || []), service],
      };
    }, {});

    return (
      <div className="panel">
        <div className="details-header">
          <h2>Emergency Services / Service Directory</h2>
          <button
            className="secondary-btn"
            type="button"
            onClick={loadControlRoomDirectory}
            disabled={controlRoomDirectoryLoading}
          >
            {controlRoomDirectoryLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {controlRoomDirectoryError && (
          <p className="error-text">{controlRoomDirectoryError}</p>
        )}

        <p className="card-detail">
          Read-only operational directory for Control Room coordination. Admin maintains the
          underlying registers and service/contact records.
        </p>

        <div className="cards control-room-mini-cards">
          <div className="card">
            <div className="card-title">Emergency Contacts</div>
            <div className="card-value">{services.length}</div>
            <div className="card-detail">Active phone directory records</div>
          </div>
        </div>

        <h3>Emergency Services / Contacts</h3>
        {services.length === 0 ? (
          <p>No active services or contacts available.</p>
        ) : (
          Object.entries(groupedServices).map(([type, rows]) => (
            <div key={type} className="table-group">
              <h4>{type}</h4>
              <table className="emergency-services-directory-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Primary Phone</th>
                    <th>Other Numbers / Notes</th>
                    <th>Sector / Area</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((service) => (
                    <tr key={service.id}>
                      <td className="wrap-cell service-name-cell">{service.name || "-"}</td>
                      <td>{formatServiceTypeLabel(service.type)}</td>
                      <td className="wrap-cell service-phone-cell">{service.phone || "-"}</td>
                      <td className="wrap-cell service-notes-cell">{service.radio || "-"}</td>
                      <td className="wrap-cell service-sector-cell">{service.sector || "-"}</td>
                      <td>{service.isActive ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    );
  }

  function renderControlRoomIncidentCodesReferencePanel() {
    const { incidentCodes, incidentSubcodes } = controlRoomIncidentReference;
    const visibleSubcodes =
      controlRoomIncidentCodeFilter === "ALL"
        ? incidentSubcodes
        : incidentSubcodes.filter(
            (subcode) => subcode.incidentCodeId === controlRoomIncidentCodeFilter
          );

    return (
      <div className="panel">
        <div className="details-header">
          <h2>Incident Codes Reference</h2>
          <button
            className="secondary-btn"
            type="button"
            onClick={loadControlRoomIncidentReference}
            disabled={controlRoomIncidentReferenceLoading}
          >
            {controlRoomIncidentReferenceLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {controlRoomIncidentReferenceError && (
          <p className="error-text">{controlRoomIncidentReferenceError}</p>
        )}

        <p className="card-detail">
          Read-only SAPS/master classification lookup for operators. Live operational
          incident records remain in the Incidents tab.
        </p>

        {incidentCodes.length === 0 ? (
          <p>No active incident codes available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {incidentCodes.map((incidentCode) => (
                <tr key={incidentCode.id}>
                  <td>{incidentCode.code || "-"}</td>
                  <td>{incidentCode.name || "-"}</td>
                  <td>
                    {incidentCode.description ||
                      (incidentCode.code && incidentCode.name
                        ? `SAPS incident code ${incidentCode.code} - ${incidentCode.name}`
                        : "-")}
                  </td>
                  <td>{incidentCode.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="filter-bar">
          <label>
            Filter subcodes by incident code
            <select
              value={controlRoomIncidentCodeFilter}
              onChange={(event) => setControlRoomIncidentCodeFilter(event.target.value)}
            >
              <option value="ALL">All Incident Codes</option>
              {incidentCodes.map((incidentCode) => (
                <option key={incidentCode.id} value={incidentCode.id}>
                  {[incidentCode.code, incidentCode.name].filter(Boolean).join(" - ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3>Incident Subcodes</h3>
        {visibleSubcodes.length === 0 ? (
          <p>No active subcodes available for the selected incident code.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Parent Code</th>
                <th>Subcode</th>
                <th>Name</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubcodes.map((subcode) => (
                <tr key={subcode.id}>
                  <td>
                    {[subcode.incidentCode?.code, subcode.incidentCode?.name]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </td>
                  <td>{subcode.subcode || "-"}</td>
                  <td>{subcode.name || "-"}</td>
                  <td>{subcode.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  function getPatrollerActivePatrolLabel(member) {
    const userId = member?.userId || member?.user?.id;
    const activePatrol = activePatrols.find((patrol) => patrol.userId === userId);

    if (!activePatrol) return "No";

    return getPatrolCallSign(activePatrol);
  }

  function renderControlRoomPatrollerDirectoryPanel() {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Patroller Directory</h2>
          <button
            className="secondary-btn"
            type="button"
            onClick={loadControlRoomPatrollerDirectory}
            disabled={controlRoomPatrollerDirectoryLoading}
          >
            {controlRoomPatrollerDirectoryLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {controlRoomPatrollerDirectoryError && (
          <p className="error-text">{controlRoomPatrollerDirectoryError}</p>
        )}

        <p className="card-detail">
          Read-only operational patroller lookup for Control Room. Admin maintains member
          and patroller records in Registers.
        </p>

        {controlRoomPatrollerDirectory.length === 0 ? (
          <p>No patrollers available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Call Sign</th>
                <th>Sector</th>
                <th>Patrol Status</th>
                <th>Active</th>
                <th>Contact Number</th>
                <th>Active Patrol</th>
              </tr>
            </thead>
            <tbody>
              {controlRoomPatrollerDirectory.map((member) => (
                <tr key={member.id}>
                  <td>
                    {[member.firstName, member.surname].filter(Boolean).join(" ") ||
                      member.name ||
                      member.user?.fullName ||
                      member.email ||
                      "-"}
                  </td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>{member.patrolStatus || member.status || "-"}</td>
                  <td>{member.isActive === false ? "No" : "Yes"}</td>
                  <td>{member.cellNumber || "-"}</td>
                  <td>{getPatrollerActivePatrolLabel(member)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  function renderControlRoomTab() {
    if (controlRoomTab === "Live Overview") {
      return (
        <>
          <div className="details-header control-room-overview-header">
            <h2>Live Overview</h2>
            <button
              className="secondary-btn"
              type="button"
              onClick={refreshControlRoom}
              disabled={controlRoomRefreshing}
            >
              {controlRoomRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="cards control-room-overview-cards">
            <div className="card">
              <div className="card-title">Active Incidents</div>
              <div className="card-value">{getActiveIncidentCount(data.incidents)}</div>
              <div className="card-detail">Open, assigned, or in progress</div>
            </div>

            <div className="card assistance-count-card">
              <div className="card-title">Assistance Requests</div>
              <div className="card-value">{data.assistanceRequests.length}</div>
              {/* This queue uses the same PatrolEvent.assistance source written by Patrol Emergency Assistance. */}
              <div className="card-detail">Submitted by patrol teams</div>
            </div>

            <div className="card">
              <div className="card-title">Active Patrols</div>
              <div className="card-value">{activePatrols.length}</div>
              <div className="card-detail">Currently available sessions</div>
            </div>
          </div>

          <div className="control-room-overview-grid">
            {canViewPatrols && renderPatrolWorkloadPanel()}
            {renderIncidentsSection(
              {
                showStatusFilter: false,
                showAssistanceRequests: true,
                showCreateIncident: false,
                showIncidentList: false,
                showSelectedIncidentServices: false,
                assistancePanelClassName: "panel assistance-queue-panel",
              }
            )}
            {renderLatestActivityPanel()}
          </div>
        </>
      );
    }

    if (controlRoomTab === "Assistance Requests") {
      return renderIncidentsSection({
        showStatusFilter: false,
        showAssistanceRequests: true,
        showCreateIncident: false,
        showIncidentList: false,
        showSelectedIncidentServices: false,
        assistancePanelClassName: "panel assistance-queue-panel",
      });
    }

    if (controlRoomTab === "Incidents") {
      return renderIncidentsSection({
        showAssistanceRequests: false,
        showSelectedIncidentServices: false,
      });
    }

    if (controlRoomTab === "Incident Codes Reference") {
      return renderControlRoomIncidentCodesReferencePanel();
    }

    if (controlRoomTab === "Active Patrols") {
      return renderPatrolWorkloadPanel();
    }

    if (controlRoomTab === "Patroller Directory") {
      return renderControlRoomPatrollerDirectoryPanel();
    }

    if (controlRoomTab === "Emergency Services") {
      return renderControlRoomDirectoryPanel();
    }

    if (controlRoomTab === "Selected Incident Services") {
      return (
        <>
          {!selectedIncident && (
            <div className="panel">
              <h2>Selected Incident Services</h2>
              <p>Select an incident from the Incidents tab to manage services.</p>
            </div>
          )}
          {renderIncidentsSection({
            showStatusFilter: false,
            showAssistanceRequests: false,
            showCreateIncident: false,
            showIncidentList: false,
            showSelectedIncidentServices: true,
          })}
        </>
      );
    }

    if (controlRoomTab === "Patrol Reports") {
      if (!canUseControlRoomReports) {
        return (
          <div className="panel">
            <h2>Patrol Reports</h2>
            <p>Report access is not enabled for this role.</p>
          </div>
        );
      }

      return (
        <>
          {renderPatrolReportClassificationsPanel(controlRoomPatrolReports)}
          {renderReportsSection({
            showSelectedPatrolReport: false,
          })}
        </>
      );
    }

    if (controlRoomTab === "Selected Patrol Timeline") {
      if (!canUseControlRoomReports) {
        return (
          <div className="panel">
            <h2>Selected Patrol Timeline</h2>
            <p>Report access is not enabled for this role.</p>
          </div>
        );
      }

      return (
        <>
          {!selectedPatrolReport && (
            <div className="panel">
              <h2>Selected Patrol Timeline</h2>
              <p>Select a patrol report from the Patrol Reports tab to view the timeline.</p>
            </div>
          )}
          {renderReportsSection({
            showFilters: false,
            showSummaryCards: false,
            showReportTable: false,
            showSelectedPatrolReport: true,
          })}
          {renderSelectedPatrolTimelineClassifications()}
        </>
      );
    }

    return (
      <div className="panel map-placeholder-panel">
        <h2>Map</h2>
        <p>Map data is not available in the current Control Room frontend data set.</p>
      </div>
    );
  }


  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>CivitasWatch</h1>
          <p>Dashboard Login</p>

          <form className="form" onSubmit={login}>
            <label>
              Email
              <input
                type="email"
                placeholder="admin@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="primary-btn">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      active={active}
      navSections={navSections}
      onNavigate={setActive}
      onLogout={handleLogout}
    >
      {/* Admin Dashboard summarizes management data only; operational dispatch remains in Control Room tabs. */}
      {/* Old route sections must remain suppressed for CONTROL_ROOM so the mixed Dashboard/Incidents layout cannot leak in. */}
      {active === "Dashboard" && !isControlRoomUser && (
        <div className="cards">
          <div className="card">
            <div className="card-title">
              {isPatrol ? "My Incidents" : "Total Incidents"}
            </div>
            <div className="card-value">{data.incidents.length}</div>
            <div className="card-detail">
              {getOpenIncidentCount(data.incidents)} open
            </div>
          </div>

          <div className="card">
            <div className="card-title">Active</div>
            <div className="card-value">
              {getActiveIncidentCount(data.incidents)}
            </div>
            <div className="card-detail">Open, assigned, or in progress</div>
          </div>

          {isAdmin && (
            <>
              <div className="card">
                <div className="card-title">Patrols</div>
                <div className="card-value">{data.patrols.length}</div>
                <div className="card-detail">Available patrol users/sessions</div>
              </div>

              <div className="card">
                <div className="card-title">Organisations</div>
                <div className="card-value">{data.organisations.length}</div>
                <div className="card-detail">Registered organisations</div>
              </div>
            </>
          )}
        </div>
      )}

        {showControlRoomTabs && (
          <div className="control-room-layout">
            <div className="control-room-tabs" role="tablist" aria-label="Control Room sections">
              {CONTROL_ROOM_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={controlRoomTab === tab}
                  className={controlRoomTab === tab ? "active" : ""}
                  onClick={() => setControlRoomTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="control-room-tab-panel">
              {renderControlRoomTab()}
            </div>
          </div>
        )}

        {active === "Incidents" && !showControlRoomTabs && renderIncidentsSection()}

        {/* Patrol sessions represent one vehicle/call-sign with one driver and optional crew members. */}
        {active === "Patrols" && !isControlRoomUser && canViewPatrols && (
          <PatrolsSection
            activePatrols={getActivePatrols(data.patrols)}
            getDisplayName={getDisplayName}
            getPatrolVehicleLabel={getPatrolVehicleLabel}
          />
        )}

        {active === "Patrol Operations" && !isControlRoomUser && canViewPatrolOperations && (
          <PatrolOperationsSection
            token={token}
            user={user}
            members={data.members}
            getAuthHeaders={getAuthHeaders}
            getJsonAuthHeaders={getJsonAuthHeaders}
          />
        )}

        {isRegisterRoute && !isControlRoomUser && canViewRegisters && (
          <RegistersSection
            data={data}
            registerSearch={registerSearch}
            onRegisterSearchChange={setRegisterSearch}
            onClearRegisterSearch={() => setRegisterSearch("")}
            registerTab={activeRegisterTab}
            filteredRegisterVehicles={filteredRegisterVehicles}
            filteredRegisterResidents={filteredRegisterResidents}
            filteredRegisterMembers={filteredRegisterMembers}
            filteredRegisterPatrollers={filteredRegisterPatrollers}
            filteredRegisterOrganisations={filteredRegisterOrganisations}
            onViewVehicle={(vehicle) => alert(vehicle.registration)}
            onEditVehicle={() => alert("Edit vehicle")}
            canManageMembers={canManageMembers}
            startAddMember={startAddMember}
            memberForm={memberForm}
            isEditingMember={isEditingMember}
            cancelMemberForm={cancelMemberForm}
            saveMember={saveMember}
            setMemberForm={setMemberForm}
            selectedMember={selectedMember}
            onViewMember={(member) => {
              setMemberForm(null);
              setSelectedMember(member);
            }}
            onCloseSelectedMember={() => setSelectedMember(null)}
            startEditMember={startEditMember}
            updatePatrollerStatus={updatePatrollerStatus}
            createPatrollerLogin={createPatrollerLogin}
            disableMember={disableMember}
            enableMember={enableMember}
            memberRoles={MEMBER_ROLES}
            roleMarker={ROLE_MARKER}
            getMemberRoles={getMemberRoles}
          />
        )}



        {active === "Intelligence" && !isControlRoomUser && canViewIntelligence && (
          <IntelligenceSection
            intelligenceEntities={intelligenceEntities}
            filteredIntelligenceEntities={filteredIntelligenceEntities}
            intelSearch={intelSearch}
            setIntelSearch={setIntelSearch}
            intelTimeFilter={intelTimeFilter}
            setIntelTimeFilter={setIntelTimeFilter}
            intelForm={intelForm}
            setIntelForm={setIntelForm}
            isEditingIntel={isEditingIntel}
            selectedIntelEntity={selectedIntelEntity}
            setSelectedIntelEntity={setSelectedIntelEntity}
            intelLinkForm={intelLinkForm}
            setIntelLinkForm={setIntelLinkForm}
            autoLinkSuggestions={autoLinkSuggestions}
            intelEntityTypes={INTEL_ENTITY_TYPES}
            intelRiskLevels={INTEL_RISK_LEVELS}
            intelStatuses={INTEL_STATUSES}
            intelRelationships={INTEL_RELATIONSHIPS}
            IntelSpiderGraph={IntelSpiderGraph}
            IntelGeoMap={IntelGeoMap}
            startAddIntelEntity={startAddIntelEntity}
            refreshIntelligence={refreshIntelligence}
            cancelIntelForm={cancelIntelForm}
            saveIntelEntity={saveIntelEntity}
            startEditIntelEntity={startEditIntelEntity}
            createIntelLink={createIntelLink}
            createSuggestedIntelLink={createSuggestedIntelLink}
            rejectAutoLinkSuggestion={rejectAutoLinkSuggestion}
            hideAutoLinkSuggestion={hideAutoLinkSuggestion}
            viewIntelEntity={viewIntelEntity}
            deleteIntelLink={deleteIntelLink}
            deleteIntelEntity={deleteIntelEntity}
            getIntelTimeFilterLabel={getIntelTimeFilterLabel}
            getIntelRiskBadge={getIntelRiskBadge}
            getEntityLatLng={getEntityLatLng}
            getIntelAgeLabel={getIntelAgeLabel}
          />
        )}

        {isReportRoute && !isControlRoomUser && canViewReports && (
          <ReportsSection
            data={data}
            reportCategory={activeReportCategory}
            reportFilters={reportFilters}
            onReportFiltersChange={setReportFilters}
            onClearReportFilters={clearReportFilters}
            onRefreshReports={loadPatrolReports}
            onRefreshOperationalData={loadDashboard}
            sectorFilterOptions={REPORT_SECTOR_FILTER_OPTIONS}
            statusFilterOptions={REPORT_STATUS_FILTER_OPTIONS}
            patrollerFilterOptions={patrollerFilterOptions}
            filteredPatrolReports={filteredPatrolReports}
            reportTotalKm={reportTotalKm}
            completedReportCount={completedReportCount}
            activeReportCount={activeReportCount}
            selectedPatrolReport={selectedPatrolReport}
            editPatrolForm={editPatrolForm}
            onEditPatrolFormChange={setEditPatrolForm}
            patrolAuditLogs={patrolAuditLogs}
            onClosePatrolReport={closePatrolReport}
            onSavePatrolReportEdits={savePatrolReportEdits}
            onViewPatrolReport={viewPatrolReport}
            onEditPatrolReport={editPatrolReport}
            onLoadPatrolReportAudit={loadPatrolReportAudit}
            onCloseActivePatrol={closeActivePatrol}
            getVehicleLabel={getVehicleLabel}
            filteredIncidentReports={filteredRegisterIncidents}
            onViewIncidentReport={viewIncident}
            onEditIncidentReport={editIncident}
            onDeleteIncidentReport={deleteIncident}
          />
        )}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
