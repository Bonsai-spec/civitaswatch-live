import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import ForceGraph2D from "react-force-graph-2d";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MEMBER_ROLES, ROLE_MARKER } from "./auth/memberRoles";
import { PERMISSIONS_BY_ROLE, SYSTEM_ROLES } from "./auth/permissions";
import { canAccess } from "./auth/permissions.helpers";
import {
  AUTH_ENDPOINTS,
  DASHBOARD_ENDPOINTS,
  INCIDENT_ENDPOINTS,
  INTELLIGENCE_ENDPOINTS,
  MEMBER_ENDPOINTS,
  PATROL_ENDPOINTS,
} from "./core/endpoints";
import {
  getAuthHeaders as buildAuthHeaders,
  getJsonAuthHeaders as buildJsonAuthHeaders,
} from "./core/http.utils";
import { ADMIN_NAV_SECTIONS } from "./navigation/admin.navigation";
import {
  flattenNavigationSections,
  getNavigationSectionsForRole,
} from "./navigation/navigation.helpers";
import IncidentsSection from "./modules/incidents/IncidentsSection";
import { getIncidentLinkedPatrolId } from "./modules/incidents/incident.utils";
import { buildIntelGraph } from "./modules/intelligence/graph.utils";
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
  getGraphNodeColor,
  getIntelRiskBadge,
  getShortRelationshipLabel,
} from "./modules/intelligence/intelligence.utils";
import IntelligenceSection from "./modules/intelligence/IntelligenceSection";
import { getMemberRoles, saveRolesIntoNotes } from "./modules/members/member.utils";
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
  buildLocalWorkload,
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
  DEFAULT_REPORT_FILTERS,
  REPORT_SECTOR_FILTER_OPTIONS,
  REPORT_STATUS_FILTER_OPTIONS,
} from "./modules/reports/report.constants";
import {
  filterPatrolReports,
  getPatrollerFilterOptions,
  getReportStatusCount,
  getReportTotalKm,
} from "./modules/reports/report.utils";
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

const emptyForm = {
  title: "",
  incidentType: "ASSAULT",
  street: "",
  suburb: "",
  description: "",
  sector: "Sector 1",
  severity: "MEDIUM",
  date: "",
  time: "",
};

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

function IntelSpiderGraph({ entity, allEntities = [], onOpenEntity, timeFilter, onDeleteLink }) {
  const graphRef = useRef(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const graphData = useMemo(
    () => buildIntelGraph(entity, timeFilter, allEntities, isWithinIntelTimeFilter),
    [entity, timeFilter, allEntities]
  );

  const focusNetwork = useMemo(() => {
    if (!focusedNodeId) {
      return {
        focusedNodeIds: new Set(),
        focusedLinkKeys: new Set(),
      };
    }

    const focusedNodeIds = new Set([focusedNodeId]);
    const focusedLinkKeys = new Set();

    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      if (sourceId === focusedNodeId || targetId === focusedNodeId) {
        focusedNodeIds.add(sourceId);
        focusedNodeIds.add(targetId);
        focusedLinkKeys.add(`${sourceId}->${targetId}`);
      }
    });

    return {
      focusedNodeIds,
      focusedLinkKeys,
    };
  }, [focusedNodeId, graphData.links]);

  function getLinkKey(link) {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    return `${sourceId}->${targetId}`;
  }

  function getNodeOpacity(node) {
    if (!focusedNodeId) return 1;
    if (node.id === focusedNodeId) return 1;
    if (focusNetwork.focusedNodeIds.has(node.id)) return 0.75;
    return 0.05;
  }

  function getLinkOpacity(link) {
    const baseOpacity = link.opacity || 0.8;
    if (!focusedNodeId) return baseOpacity;
    if (focusNetwork.focusedLinkKeys.has(getLinkKey(link))) return 0.95;
    return 0.05;
  }

  function isFocusedNode(node) {
    return Boolean(focusedNodeId && node.id === focusedNodeId);
  }

  useEffect(() => {
    if (!graphRef.current || !entity || graphData.nodes.length <= 1) return;

    const chargeForce = graphRef.current.d3Force("charge");
    if (chargeForce) chargeForce.strength(-990);

    const linkForce = graphRef.current.d3Force("link");
    if (linkForce) linkForce.distance(220);

    graphRef.current.d3ReheatSimulation();

    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit?.(600, 90);
    }, 700);

    return () => clearTimeout(timer);
  }, [entity?.id, graphData.nodes.length, graphData.links.length]);

  useEffect(() => {
    setFocusedNodeId(null);
  }, [entity?.id, timeFilter?.preset, timeFilter?.from, timeFilter?.to]);

  if (!entity) return null;

  if (graphData.nodes.length <= 1) {
    return (
      <div className="panel">
        <h3>Spider Map</h3>
        <p>No linked entities, incidents or patrol observations yet.</p>
        <p className="card-detail">Create links below to build the intelligence network.</p>
        <p className="card-detail">Time layer: {getIntelTimeFilterLabel(timeFilter)}</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="details-header">
        <div>
          <h3>Spider Map</h3>
          <p className="card-detail">
            Click a node to highlight its direct network. Unrelated context nodes fade. Click entity relationship lines to delete links. Time layer: {getIntelTimeFilterLabel(timeFilter)}.
          </p>
        </div>
        <div className="action-row">
          <button
            className={focusedNodeId ? "secondary-btn" : "secondary-btn"}
            disabled={!focusedNodeId}
            onClick={() => setFocusedNodeId(null)}
            title={focusedNodeId ? "Clear selected node focus" : "No focused node selected"}
          >
            Clear Focus
          </button>
          <span className="badge">{graphData.nodes.length} nodes / {graphData.links.length} links</span>
        </div>
      </div>

      <div className="action-row" style={{ marginBottom: 12, gap: 14, flexWrap: "wrap" }}>
        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
          ● Yellow ring = selected node
        </span>
        <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
          ● Blue halo = directly connected
        </span>
        <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>
          ● Faded = unrelated
        </span>
        <span className="badge">
          Click node = focus • Click again/background/Clear Focus = reset
        </span>
      </div>

      {focusedNodeId && (
        <p className="card-detail" style={{ marginTop: -4, marginBottom: 12 }}>
          Focus active: showing the selected node, its direct connections, and fading unrelated intelligence.
        </p>
      )}

      <div style={{ height: 620, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={1200}
          height={620}
          backgroundColor="#ffffff"
          nodeRelSize={8}
          nodeVal={(node) => (node.isCenter ? 12 : 6)}
          cooldownTicks={140}
          d3VelocityDecay={0.35}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.16}
          linkColor={(link) => `rgba(75, 85, 99, ${getLinkOpacity(link)})`}
          linkLabel={(link) => `${link.label || "LINKED_TO"} • ${link.ageLabel || "No date"}`}
          nodeLabel={(node) => `${node.label} (${node.entityType})`}
          nodeColor={getGraphNodeColor}
          linkWidth={(link) => {
            const normalWidth = link.strength ? Math.max(1.5, Number(link.strength) / 3) : 1.5;
            return focusedNodeId && focusNetwork.focusedLinkKeys.has(getLinkKey(link))
              ? normalWidth + 1.5
              : normalWidth;
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx, globalScale) => {
            const start = link.source;
            const end = link.target;
            if (!start || !end || typeof start !== "object" || typeof end !== "object") return;

            const linkOpacity = getLinkOpacity(link);
            if (linkOpacity < 0.15) return;

            const text = getShortRelationshipLabel(link.label);
            const midX = start.x + (end.x - start.x) / 2;
            const midY = start.y + (end.y - start.y) / 2;
            const fontSize = Math.max(5, Math.min(8, 7 / globalScale));
            const yOffset = Math.max(8, 12 / globalScale);

            ctx.save();
            ctx.globalAlpha = linkOpacity;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(midX - textWidth / 2 - 3, midY - yOffset - fontSize / 2 - 2, textWidth + 6, fontSize + 4);
            ctx.fillStyle = "rgba(31, 41, 55, 0.95)";
            ctx.fillText(text, midX, midY - yOffset);
            ctx.restore();
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const rawLabel = node.label || node.name || "Unknown";
            const label = rawLabel.length > 24 ? `${rawLabel.slice(0, 21)}...` : rawLabel;
            const radius = node.isCenter ? 11 : 7;
            const opacity = getNodeOpacity(node);
            const focused = isFocusedNode(node);
            const connected = Boolean(focusedNodeId && focusNetwork.focusedNodeIds.has(node.id));
            const fontSize = Math.max(6, Math.min(node.isCenter ? 13 : 10, (node.isCenter ? 10 : 8) / globalScale));

            ctx.save();
            ctx.globalAlpha = opacity;

            if (focused) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
              ctx.fill();
            } else if (connected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(147, 197, 253, 0.65)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = getGraphNodeColor(node);
            ctx.fill();
            ctx.lineWidth = focused ? 3 : node.isCenter ? 2 : 1;
            ctx.strokeStyle = focused ? "#facc15" : connected ? "#60a5fa" : "#ffffff";
            ctx.stroke();

            if (globalScale < 0.45 && !focused && !connected) {
              ctx.restore();
              return;
            }

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const textY = node.y + radius + 4;
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(node.x - textWidth / 2 - 3, textY - 1, textWidth + 6, fontSize + 3);
            ctx.fillStyle = focused ? "#111827" : connected ? "#1f2937" : "#374151";
            ctx.fillText(label, node.x, textY);
            ctx.restore();
          }}
          onNodeClick={(node) => {
            // Node click is focus-only. Use the Open Linked Profile buttons to change profiles.
            setFocusedNodeId((current) => (current === node.id ? null : node.id));
          }}
          onLinkClick={(link) => {
            const sourceObject = link?.sourceObject;

            if (!sourceObject?.id || !sourceObject?.fromEntityId || !sourceObject?.toEntityId) {
              alert("Only entity-to-entity links can be deleted from the Spider Map.");
              return;
            }

            if (typeof onDeleteLink === "function") {
              onDeleteLink(sourceObject);
            }
          }}
          onBackgroundClick={() => setFocusedNodeId(null)}
        />
      </div>

      <div className="cards">
        <div className="card"><div className="card-title">People</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "PERSON").length}</div><div className="card-detail">Person nodes</div></div>
        <div className="card"><div className="card-title">Vehicles</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "VEHICLE").length}</div><div className="card-detail">Vehicle nodes</div></div>
        <div className="card"><div className="card-title">Incidents</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "INCIDENT").length}</div><div className="card-detail">Incident nodes</div></div>
        <div className="card"><div className="card-title">Observations</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "PATROL_EVENT").length}</div><div className="card-detail">Patrol sightings</div></div>
      </div>
    </div>
  );
}

function IntelGeoMap({ entities, selectedEntity, onOpenEntity, timeFilter }) {
  const validEntities = (entities || [])
    .filter((entity) => isWithinIntelTimeFilter(entity, timeFilter))
    .map((entity) => ({ entity, position: getEntityLatLng(entity) }))
    .filter((item) => item.position);

  const selectedPosition = getEntityLatLng(selectedEntity);
  const mapCenter = selectedPosition || validEntities[0]?.position || [-33.9249, 18.4241];

  return (
    <div className="panel">
      <div className="details-header">
        <div>
          <h3>Geo Map Intelligence</h3>
          <p className="card-detail">
            Location layer for intelligence entities. Time layer: {getIntelTimeFilterLabel(timeFilter)}.
          </p>
        </div>
        <span className="badge">{validEntities.length} mapped</span>
      </div>

      {validEntities.length === 0 ? (
        <div>
          <p>No mapped entities yet.</p>
          <p className="card-detail">
            Next step: add coordinate fields to intelligence entities, incidents and patrol sightings.
          </p>
        </div>
      ) : (
        <div style={{ height: 520, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: "520px", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {validEntities.map(({ entity, position }) => (
              <Marker key={entity.id} position={position}>
                <Popup>
                  <strong>{entity.displayName || "Unnamed entity"}</strong>
                  <br />
                  {entity.entityType || "ENTITY"} • {getIntelRiskBadge(entity)}
                  <br />
                  {entity.description || "No description"}
                  <br />
                  {[entity.address, entity.suburb].filter(Boolean).join(", ") || "No address"}
                  <br />
                  <small>{position.join(", ")} • {getIntelAgeLabel(entity)}</small>
                  <br />
                  <button style={{ marginTop: 8 }} onClick={() => onOpenEntity(entity)}>
                    Open Profile
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}


function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [active, setActive] = useState("Dashboard");
  const [registerTab, setRegisterTab] = useState("Incidents");
  const [registerSearch, setRegisterSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberForm, setMemberForm] = useState(null);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filter, setFilter] = useState("ALL");
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

  const [data, setData] = useState({
  incidents: [],
  patrols: [],
  vehicles: [],
  organisations: [],
  members: [],
});

  const [workload, setWorkload] = useState([]);
  const [patrolReports, setPatrolReports] = useState([]);
  const [reportFilters, setReportFilters] = useState({ ...DEFAULT_REPORT_FILTERS });
  const [selectedPatrolReport, setSelectedPatrolReport] = useState(null);
  const [editPatrolForm, setEditPatrolForm] = useState(null);
  const [patrolAuditLogs, setPatrolAuditLogs] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const userRole = user?.role || "";

  function can(permission) {
    return canAccess(PERMISSIONS_BY_ROLE, userRole, permission);
  }

  const canCreateIncidents = can("CREATE_INCIDENT");
  const canUpdateIncidents = can("UPDATE_INCIDENT");
  const canAssignPatrol = can("ASSIGN_PATROL");
  const canViewPatrols = can("VIEW_PATROLS");
  const canViewRegisters = can("VIEW_REGISTERS");
  const canManageMembers = can("MANAGE_MEMBERS");
  const canViewReports = can("VIEW_REPORTS");
  const canViewOrganisations = can("VIEW_ORGANISATIONS");
  const canViewIntelligence = can("VIEW_INTELLIGENCE");

  const isAdmin = canViewRegisters || canViewPatrols || canViewReports || canViewOrganisations;
  const isPatrol = userRole === SYSTEM_ROLES.PATROL || userRole === SYSTEM_ROLES.PATROLLER;

  const navSections = useMemo(() => {
    return getNavigationSectionsForRole(ADMIN_NAV_SECTIONS, PERMISSIONS_BY_ROLE, userRole);
  }, [userRole]);

  const navItems = useMemo(
    () => flattenNavigationSections(navSections).map((item) => item.label),
    [navSections]
  );

  const filteredPatrolReports = useMemo(
    () => filterPatrolReports(patrolReports, reportFilters),
    [patrolReports, reportFilters]
  );

  const patrollerFilterOptions = useMemo(
    () => getPatrollerFilterOptions(patrolReports),
    [patrolReports]
  );
  const reportTotalKm = getReportTotalKm(filteredPatrolReports);
  const completedReportCount = getReportStatusCount(filteredPatrolReports, "COMPLETED");
  const activeReportCount = getReportStatusCount(filteredPatrolReports, "ACTIVE");

  function getAuthHeaders(customToken = token) {
    return buildAuthHeaders(customToken);
  }

  function getJsonAuthHeaders(customToken = token) {
    return buildJsonAuthHeaders(customToken);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setSelectedIncident(null);
    setWorkload([]);
    setActive("Dashboard");
   setData({
  incidents: [],
  patrols: [],
  vehicles: [],
  organisations: [],
  members: [],
});
    setIntelligenceEntities([]);
    setSelectedIntelEntity(null);
    setIntelForm(null);
    setHiddenAutoLinkSuggestionKeys(new Set());
  }

  async function login(e) {
    e.preventDefault();

    try {
      const res = await fetch(AUTH_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Login failed");
        return;
      }

      localStorage.setItem("token", json.token);
      setToken(json.token);
      setUser(json.user);
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  }

  async function loadUser() {
    try {
      const res = await fetch(AUTH_ENDPOINTS.me, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        logout();
        return;
      }

      setUser(json);
    } catch (err) {
      console.error(err);
      logout();
    }
  }

  async function loadDashboard() {
    if (!token) return;

    try {
      const dashboardUrl = DASHBOARD_ENDPOINTS.dashboard(filter, isPatrol);

      const res = await fetch(dashboardUrl, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) logout();
        else alert(json.error || "Failed to load dashboard");
        return;
      }

      let incidents = json.incidents || [];

      if (isPatrol && user?.id) {
        incidents = incidents.filter((incident) => {
          const patrolId =
            incident.assignedPatrolId ||
            incident.patrolId ||
            incident.linkedPatrolId;

          return patrolId === user.id;
        });
      }

      let members = [];

      try {
        const membersRes = await fetch(MEMBER_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        });

        if (membersRes.ok) {
          members = await membersRes.json();
        }
      } catch (err) {
        console.warn("Failed to load members", err);
      }

      const nextData = {
        incidents,
        patrols: json.patrols || [],
        vehicles: json.vehicles || [],
        organisations: json.organisations || [],
        members,
      };

      setData(nextData);

      if (selectedIncident) {
        const updatedSelected = nextData.incidents.find(
          (incident) => incident.id === selectedIncident.id
        );

        setSelectedIncident(updatedSelected || null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load dashboard");
    }
  }

  async function autoAssignIncident(id) {
    if (!canAssignPatrol) {
      alert("You do not have permission to auto assign incidents.");
      return;
    }

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.autoAssign(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Auto assign failed");
        return;
      }

      setSelectedIncident(json.incident);
      await loadDashboard();
      await loadWorkload();
    } catch (err) {
      console.error(err);
      alert("Auto assign failed");
    }
  }

  async function loadWorkload() {
    if (!token || !canViewPatrols) return;

    // Local workload keeps the console clean while the API workload route is not enabled.
    // Re-enable the fetch here only when /admin/patrols/workload exists on the API.
    setWorkload(buildLocalWorkload(data.patrols, data.incidents));
  }

  async function loadPatrolReports() {
    if (!token || !canViewReports) return;

    try {
      const params = new URLSearchParams();

      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value && value !== "ALL") {
          params.set(key, value);
        }
      });

      const query = params.toString();
      const url = PATROL_ENDPOINTS.reports(query);

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get("content-type") || "";
      const json = contentType.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        alert(json?.error || "Failed to load patrol reports");
        return;
      }

      setPatrolReports(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
      alert("Failed to load patrol reports");
    }
  }

  function clearReportFilters() {
    setReportFilters({ ...DEFAULT_REPORT_FILTERS });
  }

  function viewPatrolReport(patrol) {
    setSelectedPatrolReport(patrol);
    setEditPatrolForm(null);
    setPatrolAuditLogs([]);
  }

  function editPatrolReport(patrol) {
    setSelectedPatrolReport(patrol);
    setPatrolAuditLogs([]);
    setEditPatrolForm({
      sector: patrol.sector || "",
      startKm: patrol.startKm ?? "",
      endKm: patrol.endKm ?? "",
      summary: patrol.summary || "",
      editReason: "",
    });
  }

  function closePatrolReport() {
    setSelectedPatrolReport(null);
    setEditPatrolForm(null);
    setPatrolAuditLogs([]);
  }

  async function savePatrolReportEdits(patrolId) {
    if (!editPatrolForm) return;

    if (!editPatrolForm.editReason || editPatrolForm.editReason.trim().length < 5) {
      alert("Edit reason is required, minimum 5 characters.");
      return;
    }

    const startKm =
      editPatrolForm.startKm === "" ? null : Number(editPatrolForm.startKm);
    const endKm = editPatrolForm.endKm === "" ? null : Number(editPatrolForm.endKm);

    if (startKm !== null && Number.isNaN(startKm)) {
      alert("Start KM must be a valid number.");
      return;
    }

    if (endKm !== null && Number.isNaN(endKm)) {
      alert("End KM must be a valid number.");
      return;
    }

    if (startKm !== null && endKm !== null && endKm < startKm) {
      alert("End KM cannot be less than Start KM.");
      return;
    }

    try {
      const res = await fetch(PATROL_ENDPOINTS.adminUpdate(patrolId), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          updates: {
            sector: editPatrolForm.sector,
            startKm,
            endKm,
            summary: editPatrolForm.summary,
          },
          editReason: editPatrolForm.editReason.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to update patrol report");
        return;
      }

      const updatedPatrol = json.patrol || json.report || json;

      await loadPatrolReports();
      setSelectedPatrolReport(updatedPatrol);
      setEditPatrolForm(null);
      setPatrolAuditLogs([]);
      alert("Report updated and audit log saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to update patrol report");
    }
  }

  async function loadPatrolReportAudit(patrol) {
    if (!patrol?.id) return;

    setSelectedPatrolReport(patrol);
    setEditPatrolForm(null);

    try {
      const res = await fetch(PATROL_ENDPOINTS.audit(patrol.id), {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to load audit history");
        return;
      }

      setPatrolAuditLogs(Array.isArray(json) ? json : json.auditLogs || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load audit history");
    }
  }

  async function closeActivePatrol(patrol) {
    if (!patrol || patrol.status !== "ACTIVE") return;

    const endKm = prompt("Enter end KM:", patrol.startKm ?? "");

    if (endKm === null) return;

    try {
      const res = await fetch(PATROL_ENDPOINTS.end(patrol.id), {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          endKm: Number(endKm),
          summary: patrol.summary || "Closed by admin/control room",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to close patrol");
        return;
      }

      await loadPatrolReports();
      await loadDashboard();
      setSelectedPatrolReport(json);
      setEditPatrolForm(null);
    } catch (err) {
      console.error(err);
      alert("Failed to close patrol");
    }
  }

  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token]);

useEffect(() => {
  if (active === "Registers") {
    setRegisterTab("Incidents");
  }
}, [active]);

  useEffect(() => {
    if (token && user) {
      loadDashboard();
    }
  }, [token, user?.id, user?.role, filter]);

  useEffect(() => {
    if (canViewPatrols) {
      loadWorkload();
    }
  }, [canViewPatrols, data.incidents.length, data.patrols.length]);

  useEffect(() => {
    if (active === "Reports" && canViewReports) {
      loadPatrolReports();
    }
  }, [
    active,
    canViewReports,
    reportFilters.from,
    reportFilters.to,
    reportFilters.sector,
    reportFilters.vehicleId,
    reportFilters.patrollerId,
    reportFilters.status,
  ]);

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

  async function createIncident(e) {
    e.preventDefault();

    if (!canCreateIncidents) {
      alert("You do not have permission to create incidents.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.create, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create incident");
        return;
      }

      setForm(emptyForm);
      setSelectedIncident(json);
      setActive("Incidents");
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to create incident");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    if (!canUpdateIncidents) {
      alert("You do not have permission to update incident status.");
      return;
    }

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.updateStatus(id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to update status");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  async function archiveIncident(id) {
    if (!canCreateIncidents) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.archive(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to archive incident");
        return;
      }

      setSelectedIncident(null);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to archive incident");
    }
  }

  async function deleteIncident(id) {
    if (!canCreateIncidents) return;
    if (!confirm("Delete incident permanently?")) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.detail(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to delete incident");
        return;
      }

      setSelectedIncident(null);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to delete incident");
    }
  }

  async function assignPatrol(id, patrolId, vehicleId) {
    if (!canAssignPatrol || (!patrolId && !vehicleId)) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.assignPatrol(id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ patrolId, vehicleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to assign patrol");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to assign patrol");
    }
  }

  async function unassignPatrol(id) {
    if (!canAssignPatrol) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.unassignPatrol(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to unassign patrol");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to unassign patrol");
    }
  }

function viewIncident(incident) {
  alert(`Viewing: ${incident.title}`);
}

function editIncident(incident) {
  alert(`Edit: ${incident.title}`);
}

function emptyMemberForm() {
  return {
    firstName: "",
    surname: "",
    idNumber: "",
    cellNumber: "",
    email: "",
    address: "",
    suburb: "",
    sector: "Sector 1",
    callSign: "",
    vettingStatus: "PENDING",
    isActive: true,
    nextOfKinName: "",
    nextOfKinPhone: "",
    medicalNotes: "",
    allergies: "",
    medication: "",
    bloodType: "",
    driversLicence: false,
    licenceCode: "",
    pdp: false,
    firstAid: false,
    fireTraining: false,
    radioTraining: false,
    patrolTraining: false,
    controlRoomTraining: false,
    patrolApproved: false,
    patrolStatus: "NOT_PATROLLER",
    patrolNotes: "",
    patrollerPassword: "",
    notes: "",
    roles: [],
  };
}

function startAddMember() {
  if (!canManageMembers) {
    alert("You do not have permission to add members.");
    return;
  }

  setSelectedMember(null);
  setIsEditingMember(false);
  setMemberForm(emptyMemberForm());
}

function startEditMember(member) {
  if (!canManageMembers) {
    alert("You do not have permission to edit members.");
    return;
  }

  setSelectedMember(null);
  setIsEditingMember(true);
  setMemberForm({
    ...emptyMemberForm(),
    ...member,
    roles: getMemberRoles(member),
  });
}

function cancelMemberForm() {
  setMemberForm(null);
  setIsEditingMember(false);
}

async function saveMember(e) {
  e.preventDefault();

  if (!canManageMembers) {
    alert("You do not have permission to save members.");
    return;
  }

  if (!memberForm.firstName || !memberForm.surname) {
    alert("First name and surname are required.");
    return;
  }

  try {
    const url = isEditingMember
      ? MEMBER_ENDPOINTS.detail(memberForm.id)
      : MEMBER_ENDPOINTS.list;

    const method = isEditingMember ? "PATCH" : "POST";

    const payload = {
      ...memberForm,
      firstName: memberForm.firstName.trim(),
      surname: memberForm.surname.trim(),
      callSign: memberForm.callSign || null,
      cellNumber: memberForm.cellNumber || null,
      email: memberForm.email || null,
      address: memberForm.address || null,
      suburb: memberForm.suburb || null,
      idNumber: memberForm.idNumber || null,
      nextOfKinName: memberForm.nextOfKinName || null,
      nextOfKinPhone: memberForm.nextOfKinPhone || null,
      medicalNotes: memberForm.medicalNotes || null,
      allergies: memberForm.allergies || null,
      medication: memberForm.medication || null,
      bloodType: memberForm.bloodType || null,
      licenceCode: memberForm.licenceCode || null,
      patrolApproved: Boolean(memberForm.patrolApproved),
      patrolStatus: memberForm.patrolStatus || "NOT_PATROLLER",
      patrolNotes: memberForm.patrolNotes || null,
      notes: saveRolesIntoNotes(memberForm.notes, memberForm.roles),
    };

    delete payload.roles;
    delete payload.user;
    delete payload.userId;
    delete payload.patrollerPassword;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;

    const res = await fetch(url, {
      method,
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to save member");
      return;
    }

    setMemberForm(null);
    setIsEditingMember(false);
    setSelectedMember(json);
    await loadDashboard();
  } catch (err) {
    console.error(err);
    alert("Failed to save member");
  }
}

async function disableMember(member) {
  if (!canManageMembers) {
    alert("You do not have permission to disable members.");
    return;
  }

  if (!confirm(`Disable ${member.firstName || "this"} ${member.surname || "member"}?`)) {
    return;
  }

  try {
    const res = await fetch(MEMBER_ENDPOINTS.detail(member.id), {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ isActive: false }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to disable member");
      return;
    }

    if (selectedMember?.id === member.id) {
      setSelectedMember(json);
    }

    await loadDashboard();
  } catch (err) {
    console.error(err);
    alert("Failed to disable member");
  }
}

async function enableMember(member) {
  if (!canManageMembers) {
    alert("You do not have permission to enable members.");
    return;
  }

  try {
    const res = await fetch(MEMBER_ENDPOINTS.detail(member.id), {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ isActive: true }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to enable member");
      return;
    }

    if (selectedMember?.id === member.id) {
      setSelectedMember(json);
    }

    await loadDashboard();
  } catch (err) {
    console.error(err);
    alert("Failed to enable member");
  }
}
async function createPatrollerLogin(member) {
  if (!canManageMembers || !member?.id) return;

  const suggestedPassword = "password123";
  const password = prompt(
    `Create patroller login for ${[member.firstName, member.surname].filter(Boolean).join(" ") || "member"}?

Email: ${member.email || "NO EMAIL"}

Enter temporary password:`,
    suggestedPassword
  );

  if (password === null) return;

  if (!password || password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const res = await fetch(MEMBER_ENDPOINTS.createPatrollerLogin(member.id), {
      method: "POST",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ password }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to create patroller login");
      return;
    }

    setSelectedMember(json);
    await loadDashboard();
    alert("Patroller login created / linked.");
  } catch (err) {
    console.error(err);
    alert("Failed to create patroller login");
  }
}

async function updatePatrollerStatus(member, patrolStatus, patrolApproved = false) {
  if (!canManageMembers || !member?.id) return;

  try {
    const res = await fetch(MEMBER_ENDPOINTS.patrollerStatus(member.id), {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        patrolStatus,
        patrolApproved,
        patrolNotes: member.patrolNotes || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to update patroller status");
      return;
    }

    if (selectedMember?.id === member.id) {
      setSelectedMember(json);
    }

    await loadDashboard();
  } catch (err) {
    console.error(err);
    alert("Failed to update patroller status");
  }
}


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
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo">CivitasWatch</div>
        <div className="subtitle">{isPatrol ? "Patrol Console" : "Admin Dashboard"}</div>

        <nav className="nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActive(item.label)}
                  className={active === item.label ? "active" : ""}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="content">
        <div className="header header-row">
          <div>
            <h1>{active}</h1>
            <p>
              {user
                ? `Logged in as ${getDisplayName(user)} (${user.role})`
                : "Live CivitasWatch data"}
            </p>
          </div>

          <button className="secondary-btn" onClick={logout}>
            Logout
          </button>
        </div>

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
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
