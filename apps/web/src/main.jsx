import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MEMBER_ROLES, ROLE_MARKER } from "./auth/memberRoles";
import { PERMISSIONS_BY_ROLE } from "./auth/permissions";
import {
  INTELLIGENCE_ENDPOINTS,
} from "./core/endpoints";
import {
  getAuthHeaders as buildAuthHeaders,
  getJsonAuthHeaders as buildJsonAuthHeaders,
} from "./core/http.utils";
import { useAdminData } from "./hooks/useAdminData";
import { useAuth } from "./hooks/useAuth";
import { useIncidents } from "./hooks/useIncidents";
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
  buildAutoLinkSuggestions,
  getAutoLinkSuggestionKey,
  getEntityLatLng,
  getIntelRiskBadge,
} from "./modules/intelligence/intelligence.utils";
import IntelligenceSection from "./modules/intelligence/IntelligenceSection";
import IntelGeoMap from "./modules/intelligence/IntelGeoMap";
import IntelSpiderGraph from "./modules/intelligence/IntelSpiderGraph";
import { getMemberRoles } from "./modules/members/member.utils";
import {
  getIntelAgeDays,
  getIntelAgeLabel,
  getIntelTimeFilterLabel,
  getRecordTimestamp,
  parseIntelDate,
} from "./utils/date.utils";
import {
  getDisplayName,
  getVehicleLabel,
} from "./modules/vehicles/vehicle.utils";
import OrganisationsSection from "./modules/organisations/OrganisationsSection";
import {
  getPatrolOptionLabel,
  getPatrolVehicleLabel,
} from "./modules/patrols/patrol.utils";
import PatrolsSection from "./modules/patrols/PatrolsSection";
import {
  filterRegisterIncidents,
  filterRegisterMembers,
  filterRegisterOrganisations,
  filterRegisterPatrollers,
  filterRegisterPatrols,
  filterRegisterVehicles,
} from "./modules/registers/register.utils";
import { REGISTER_TABS } from "./modules/registers/register.constants";
import RegistersSection from "./modules/registers/RegistersSection";
import {
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function emptyIntelForm() {
  return {
    entityType: "PERSON",
    displayName: "",
    description: "",
    riskLevel: "LOW",
    status: "ACTIVE",
    address: "",
    suburb: "",
    sector: "",
    latitude: "",
    longitude: "",
    vehicleRegistration: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColour: "",
    vehicleType: "",
    vehicleMarks: "",
    vehicleNotes: "",
  };
}

function getIntelTimeWindowStart(preset) {
  const now = new Date();

  if (preset === "24H") {
    now.setHours(now.getHours() - 24);
    return now;
  }

  if (preset === "7D") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (preset === "30D") {
    now.setDate(now.getDate() - 30);
    return now;
  }

  if (preset === "90D") {
    now.setDate(now.getDate() - 90);
    return now;
  }

  return null;
}

function isWithinIntelTimeFilter(record, timeFilter) {
  if (!timeFilter || timeFilter.preset === "ALL") return true;

  const timestamp = getRecordTimestamp(record);
  const recordDate = parseIntelDate(timestamp);

  // Keep legacy records visible when using ALL only. For a time window,
  // records without dates are hidden so the timeline stays meaningful.
  if (!recordDate) return false;

  if (timeFilter.preset === "CUSTOM") {
    const from = parseIntelDate(timeFilter.from);
    const to = parseIntelDate(timeFilter.to);

    if (from && recordDate < from) return false;

    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (recordDate > endOfDay) return false;
    }

    return true;
  }

  const start = getIntelTimeWindowStart(timeFilter.preset);
  return start ? recordDate >= start : true;
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
  const [registerTab, setRegisterTab] = useState("Incidents");
  const [registerSearch, setRegisterSearch] = useState("");
  const [intelligenceEntities, setIntelligenceEntities] = useState([]);
  const [selectedIntelEntity, setSelectedIntelEntity] = useState(null);
  const [intelForm, setIntelForm] = useState(null);
  const [isEditingIntel, setIsEditingIntel] = useState(false);
  const [intelSearch, setIntelSearch] = useState("");
  const [intelTimeFilter, setIntelTimeFilter] = useState({
    preset: "ALL",
    from: "",
    to: "",
  });
  const [intelLinkForm, setIntelLinkForm] = useState({
    fromEntityId: "",
    toEntityId: "",
    relationship: "LINKED_TO",
    strength: "",
    notes: "",
  });
  const [hiddenAutoLinkSuggestionKeys, setHiddenAutoLinkSuggestionKeys] = useState(new Set());

  function scrollToIntelSpiderMap(delay = 250) {
    window.setTimeout(() => {
      document.getElementById("intel-spider-map")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, delay);
  }

  const {
    userRole,
    canCreateIncidents,
    canUpdateIncidents,
    canAssignPatrol,
    canViewPatrols,
    canViewRegisters,
    canManageMembers,
    canViewReports,
    canViewOrganisations,
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
    setLoading,
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
    setData,
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

  const navSections = useMemo(() => {
    return getNavigationSectionsForRole(ADMIN_NAV_SECTIONS, PERMISSIONS_BY_ROLE, userRole);
  }, [userRole]);

  const navItems = useMemo(
    () => flattenNavigationSections(navSections).map((item) => item.label),
    [navSections]
  );

  function getAuthHeaders(customToken = token) {
    return buildAuthHeaders(customToken);
  }

  function getJsonAuthHeaders(customToken = token) {
    return buildJsonAuthHeaders(customToken);
  }

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
    active,
    canViewReports,
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

  function handleLogout() {
    logout();
    resetIncidents();
    setActive("Dashboard");
    resetAdminData();
    setIntelligenceEntities([]);
    setSelectedIntelEntity(null);
    setIntelForm(null);
    setHiddenAutoLinkSuggestionKeys(new Set());
  }

useEffect(() => {
  if (active === "Registers") {
    setRegisterTab("Incidents");
  }
}, [active]);

  useEffect(() => {
    if (active === "Intelligence" && canViewIntelligence) {
      loadIntelligence();
    }
  }, [active, canViewIntelligence]);

  useEffect(() => {
    if (!navItems.includes(active)) {
      setActive("Dashboard");
    }
  }, [navItems, active]);

async function loadIntelligence() {
  if (!token || !canViewIntelligence) return;

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.list, {
      headers: getAuthHeaders(),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to load intelligence");
      return;
    }

    setIntelligenceEntities(Array.isArray(json) ? json : json.entities || []);
  } catch (err) {
    console.error(err);
    alert("Failed to load intelligence");
  }
}

async function refreshIntelligence() {
  await loadIntelligence();

  if (selectedIntelEntity?.id) {
    await viewIntelEntity(selectedIntelEntity);
  }
}

function startAddIntelEntity() {
  if (!canViewIntelligence) return;
  setSelectedIntelEntity(null);
  setIsEditingIntel(false);
  setIntelForm(emptyIntelForm());
}

function startEditIntelEntity(entity) {
  if (!canViewIntelligence) return;
  setSelectedIntelEntity(null);
  setIsEditingIntel(true);
  setIntelForm({
    ...emptyIntelForm(),
    ...entity,
    address: entity.address || "",
    suburb: entity.suburb || "",
    sector: entity.sector || "",
    latitude: entity.latitude ?? "",
    longitude: entity.longitude ?? "",
    vehicleRegistration: entity.voivehicleDetails?.registrationNumber || "",
    vehicleMake: entity.voivehicleDetails?.make || "",
    vehicleModel: entity.voivehicleDetails?.model || "",
    vehicleColour: entity.voivehicleDetails?.colour || "",
    vehicleType: entity.voivehicleDetails?.vehicleType || "",
    vehicleMarks: entity.voivehicleDetails?.distinguishingMarks || "",
    vehicleNotes: entity.voivehicleDetails?.notes || "",
  });
}

function cancelIntelForm() {
  setIntelForm(null);
  setIsEditingIntel(false);
}

async function saveIntelEntity(e) {
  e.preventDefault();

  if (!canViewIntelligence) {
    alert("You do not have permission to save intelligence.");
    return;
  }

  if (!intelForm.displayName.trim()) {
    alert("Display name is required.");
    return;
  }

  const hasLatitude = intelForm.latitude !== "" && intelForm.latitude !== null && intelForm.latitude !== undefined;
  const hasLongitude = intelForm.longitude !== "" && intelForm.longitude !== null && intelForm.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    alert("Latitude and longitude must be entered together.");
    return;
  }

  if (hasLatitude && (Number.isNaN(Number(intelForm.latitude)) || Number(intelForm.latitude) < -90 || Number(intelForm.latitude) > 90)) {
    alert("Latitude must be a valid number between -90 and 90.");
    return;
  }

  if (hasLongitude && (Number.isNaN(Number(intelForm.longitude)) || Number(intelForm.longitude) < -180 || Number(intelForm.longitude) > 180)) {
    alert("Longitude must be a valid number between -180 and 180.");
    return;
  }

  try {
    const url = isEditingIntel
      ? INTELLIGENCE_ENDPOINTS.detail(intelForm.id)
      : INTELLIGENCE_ENDPOINTS.list;

    const method = isEditingIntel ? "PATCH" : "POST";

    const payload = {
      entityType: intelForm.entityType,
      displayName: intelForm.displayName.trim(),
      description: intelForm.description || null,
      address: intelForm.address || null,
      suburb: intelForm.suburb || null,
      sector: intelForm.sector || null,
      latitude: intelForm.latitude === "" || intelForm.latitude === null ? null : Number(intelForm.latitude),
      longitude: intelForm.longitude === "" || intelForm.longitude === null ? null : Number(intelForm.longitude),
      riskLevel: intelForm.riskLevel || "LOW",
      status: intelForm.status || "ACTIVE",
      vehicleDetails:
        intelForm.entityType === "VEHICLE"
          ? {
              registrationNumber: intelForm.vehicleRegistration || "UNKNOWN",
              make: intelForm.vehicleMake || null,
              model: intelForm.vehicleModel || null,
              colour: intelForm.vehicleColour || null,
              vehicleType: intelForm.vehicleType || null,
              distinguishingMarks: intelForm.vehicleMarks || null,
              notes: intelForm.vehicleNotes || null,
            }
          : null,
    };

    const res = await fetch(url, {
      method,
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to save intelligence entity");
      return;
    }

    setIntelForm(null);
    setIsEditingIntel(false);
    setSelectedIntelEntity(json);
    await loadIntelligence();
  } catch (err) {
    console.error(err);
    alert("Failed to save intelligence entity");
  }
}

async function viewIntelEntity(entity) {
  if (!entity?.id) return;

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.connections(entity.id), {
      headers: getAuthHeaders(),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || json.message || "Failed to load intelligence profile");
      return;
    }

    setIntelForm(null);
    setSelectedIntelEntity(json);
    setHiddenAutoLinkSuggestionKeys(new Set());
    setIntelLinkForm((prev) => ({
      ...prev,
      fromEntityId: json.id,
    }));

    scrollToIntelSpiderMap();
  } catch (err) {
    console.error(err);
    alert("Failed to load intelligence profile");
  }
}

async function deleteIntelEntity(entity) {
  if (!canViewIntelligence || !entity?.id) return;
  if (!confirm(`Archive intelligence entity: ${entity.displayName}?`)) return;

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.detail(entity.id), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to archive intelligence entity");
      return;
    }

    if (selectedIntelEntity?.id === entity.id) {
      setSelectedIntelEntity(null);
    }

    await loadIntelligence();
  } catch (err) {
    console.error(err);
    alert("Failed to archive intelligence entity");
  }
}

async function createIntelLink(e) {
  e.preventDefault();

  if (!canViewIntelligence) {
    alert("You do not have permission to link intelligence.");
    return;
  }

  if (!intelLinkForm.fromEntityId || !intelLinkForm.toEntityId) {
    alert("Select both source and target entities.");
    return;
  }

  if (intelLinkForm.fromEntityId === intelLinkForm.toEntityId) {
    alert("An entity cannot link to itself.");
    return;
  }

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.links, {
      method: "POST",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        fromEntityId: intelLinkForm.fromEntityId,
        toEntityId: intelLinkForm.toEntityId,
        relationship: intelLinkForm.relationship,
        strength: intelLinkForm.strength === "" ? null : Number(intelLinkForm.strength),
        notes: intelLinkForm.notes || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to create intelligence link");
      return;
    }

    setIntelLinkForm({
      fromEntityId: intelLinkForm.fromEntityId,
      toEntityId: "",
      relationship: "LINKED_TO",
      strength: "",
      notes: "",
    });

    const source = intelligenceEntities.find((item) => item.id === intelLinkForm.fromEntityId) || selectedIntelEntity;
    if (source?.id) await viewIntelEntity(source);
    await loadIntelligence();
  } catch (err) {
    console.error(err);
    alert("Failed to create intelligence link");
  }
}

async function deleteIntelLink(link) {
  if (!canViewIntelligence || !link?.id) return;

  const fromName = link.fromEntity?.displayName || link.fromEntityId || "source";
  const toName = link.toEntity?.displayName || link.toEntityId || "target";

  if (!confirm(`Delete link ${fromName} → ${toName} (${link.relationship || "LINK"})?`)) {
    return;
  }

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.linkDetail(link.id), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to delete intelligence link");
      return;
    }

    const currentProfileId = selectedIntelEntity?.id;
    await loadIntelligence();

    if (currentProfileId) {
      await viewIntelEntity({ id: currentProfileId });
    }
  } catch (err) {
    console.error(err);
    alert("Failed to delete intelligence link");
  }
}


async function createSuggestedIntelLink(suggestion) {
  if (!canViewIntelligence || !selectedIntelEntity?.id || !suggestion?.targetEntity?.id) return;

  if (!confirm(`Accept suggestion and create ${suggestion.relationship} link to ${suggestion.targetEntity.displayName}?`)) {
    return;
  }

  try {
    const res = await fetch(INTELLIGENCE_ENDPOINTS.links, {
      method: "POST",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        fromEntityId: selectedIntelEntity.id,
        toEntityId: suggestion.targetEntity.id,
        relationship: suggestion.relationship,
        strength: suggestion.strength,
        notes: suggestion.notes,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to create suggested link");
      return;
    }

    setHiddenAutoLinkSuggestionKeys((current) => {
      const next = new Set(current);
      next.add(suggestion.key || getAutoLinkSuggestionKey(selectedIntelEntity, suggestion.targetEntity));
      return next;
    });

    await loadIntelligence();
    await viewIntelEntity({ id: selectedIntelEntity.id });
    scrollToIntelSpiderMap(450);
  } catch (err) {
    console.error(err);
    alert("Failed to create suggested link");
  }
}

function hideAutoLinkSuggestion(suggestion) {
  if (!selectedIntelEntity?.id || !suggestion?.targetEntity?.id) return;

  setHiddenAutoLinkSuggestionKeys((current) => {
    const next = new Set(current);
    next.add(suggestion.key || getAutoLinkSuggestionKey(selectedIntelEntity, suggestion.targetEntity));
    return next;
  });
}

function rejectAutoLinkSuggestion(suggestion) {
  if (!suggestion?.targetEntity?.displayName) return;

  if (!confirm(`Reject auto-link suggestion for ${suggestion.targetEntity.displayName}?`)) {
    return;
  }

  hideAutoLinkSuggestion(suggestion);
}

const autoLinkSuggestions = useMemo(
  () =>
    buildAutoLinkSuggestions(selectedIntelEntity, intelligenceEntities).filter(
      (suggestion) => !hiddenAutoLinkSuggestionKeys.has(suggestion.key)
    ),
  [selectedIntelEntity, intelligenceEntities, hiddenAutoLinkSuggestionKeys]
);

const filteredIntelligenceEntities = intelligenceEntities.filter((entity) =>
  isWithinIntelTimeFilter(entity, intelTimeFilter) &&
  [
    entity.entityType,
    entity.displayName,
    entity.description,
    entity.riskLevel,
    entity.status,
    entity.address,
    entity.suburb,
    entity.sector,
    entity.voivehicleDetails?.registrationNumber,
    entity.voivehicleDetails?.make,
    entity.voivehicleDetails?.model,
    entity.voivehicleDetails?.colour,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(intelSearch.toLowerCase())
);

const registerSearchText = registerSearch.toLowerCase();

const filteredRegisterIncidents = filterRegisterIncidents(data.incidents, registerSearchText);
const filteredRegisterVehicles = filterRegisterVehicles(data.vehicles, registerSearchText);
const filteredRegisterPatrols = filterRegisterPatrols(data.patrols, registerSearchText);
const filteredRegisterMembers = filterRegisterMembers(data.members, registerSearchText);
const filteredRegisterPatrollers = filterRegisterPatrollers(data.members, registerSearchText);
const filteredRegisterOrganisations = filterRegisterOrganisations(
  data.organisations,
  registerSearchText
);


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

        {(active === "Dashboard" || active === "Incidents") && (
          <IncidentsSection
            data={data}
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
            selectedIncident={selectedIncident}
            onCloseSelectedIncident={() => setSelectedIncident(null)}
            getAssignedPatrolName={getAssignedPatrolName}
            getAssignedVehicleName={getAssignedVehicleName}
            onUpdateStatus={updateStatus}
            canAssignPatrol={canAssignPatrol}
            onAutoAssignIncident={autoAssignIncident}
            getIncidentLinkedPatrolId={getIncidentLinkedPatrolId}
            onAssignSelectedIncidentPatrol={(patrolId) =>
              assignPatrol(
                selectedIncident.id,
                patrolId,
                selectedIncident.assignedVehicleId ||
                  selectedIncident.vehicleId ||
                  selectedIncident.linkedVehicleId
              )
            }
            onAssignSelectedIncidentVehicle={(vehicleId) =>
              assignPatrol(
                selectedIncident.id,
                selectedIncident.assignedPatrolId ||
                  selectedIncident.patrolId ||
                  selectedIncident.linkedPatrolId,
                vehicleId
              )
            }
            activePatrols={getActivePatrols(data.patrols)}
            getPatrolOptionLabel={getPatrolOptionLabel}
            getVehicleLabel={getVehicleLabel}
            onUnassignPatrol={unassignPatrol}
            onArchiveIncident={archiveIncident}
            onDeleteIncident={deleteIncident}
            onSelectIncident={setSelectedIncident}
          >
            {canViewPatrols && active === "Dashboard" && (
              <div className="panel">
                <h2>Patrol Workload</h2>

                {workload.length === 0 && <p>No patrol workload to show yet.</p>}

                {workload.map((patrol) => (
                  <div key={patrol.id} className="item">
                    <div>
                      <strong>{getDisplayName(patrol)}</strong>
                      <div>{patrol.sector || patrol.email || "Patrol user"}</div>
                    </div>
                    <span className="badge">
                      {patrol.activeIncidentCount || 0} active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </IncidentsSection>
        )}

        {active === "Patrols" && canViewPatrols && (
          <PatrolsSection
            activePatrols={getActivePatrols(data.patrols)}
            getDisplayName={getDisplayName}
            getPatrolVehicleLabel={getPatrolVehicleLabel}
          />
        )}

{active === "Registers" && canViewRegisters && (
          <RegistersSection
            data={data}
            registerSearch={registerSearch}
            onRegisterSearchChange={setRegisterSearch}
            onClearRegisterSearch={() => setRegisterSearch("")}
            registerTabs={REGISTER_TABS}
            registerTab={registerTab}
            onRegisterTabChange={setRegisterTab}
            filteredRegisterIncidents={filteredRegisterIncidents}
            filteredRegisterVehicles={filteredRegisterVehicles}
            filteredRegisterMembers={filteredRegisterMembers}
            filteredRegisterPatrollers={filteredRegisterPatrollers}
            filteredRegisterPatrols={filteredRegisterPatrols}
            filteredRegisterOrganisations={filteredRegisterOrganisations}
            viewIncident={viewIncident}
            editIncident={editIncident}
            deleteIncident={deleteIncident}
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
            getDisplayName={getDisplayName}
            getVehicleLabel={getVehicleLabel}
          />
        )}



        {active === "Intelligence" && canViewIntelligence && (
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

        {active === "Reports" && canViewReports && (
          <ReportsSection
            data={data}
            reportFilters={reportFilters}
            onReportFiltersChange={setReportFilters}
            onClearReportFilters={clearReportFilters}
            onRefreshReports={loadPatrolReports}
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
          />
        )}

        {active === "Organisations" && canViewOrganisations && (
          <OrganisationsSection organisations={data.organisations} />
        )}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
