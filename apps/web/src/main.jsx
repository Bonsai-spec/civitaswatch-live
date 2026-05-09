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
  getAuthHeaders as buildAuthHeaders,
  getJsonAuthHeaders as buildJsonAuthHeaders,
} from "./core/http.utils";
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
  if (active === "Registers") {
    setRegisterTab("Incidents");
  }
}, [active]);

  useEffect(() => {
    if (!navItems.includes(active)) {
      setActive("Dashboard");
    }
  }, [navItems, active]);

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
