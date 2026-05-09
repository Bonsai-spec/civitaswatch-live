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
import {
  buildLocalWorkload,
  getPatrolOptionLabel,
  getPatrolVehicleLabel,
} from "./modules/patrols/patrol.utils";
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
          <>
            <div className="filter-bar">
              <label>
                Filter status
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setSelectedIncident(null);
                  }}
                >
                  {OPERATION_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

            <div className="grid">
              {canCreateIncidents && (
                <div className="panel">
                  <h2>Create Incident</h2>

                  <form className="form" onSubmit={createIncident}>
                    <label>
                      Title
                      <input
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        placeholder="Example: Suspicious activity"
                        required
                      />
                    </label>

                    <label>
                      Incident Type
                      <select
                        value={form.incidentType}
                        onChange={(e) =>
                          setForm({ ...form, incidentType: e.target.value })
                        }
                      >
                        {OPERATION_INCIDENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Street
                      <input
                        value={form.street}
                        onChange={(e) =>
                          setForm({ ...form, street: e.target.value })
                        }
                        placeholder="Street name"
                        required
                      />
                    </label>

                    <label>
                      Suburb
                      <input
                        value={form.suburb}
                        onChange={(e) =>
                          setForm({ ...form, suburb: e.target.value })
                        }
                        placeholder="Suburb"
                        required
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        placeholder="Optional details"
                      />
                    </label>

                    <label>
                      Sector
                      <select
                        value={form.sector}
                        onChange={(e) =>
                          setForm({ ...form, sector: e.target.value })
                        }
                      >
                        {OPERATION_SECTOR_OPTIONS.map((sector) => (
                          <option key={sector}>{sector}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Severity
                      <select
                        value={form.severity}
                        onChange={(e) =>
                          setForm({ ...form, severity: e.target.value })
                        }
                      >
                        {OPERATION_SEVERITY_OPTIONS.map((severity) => (
                          <option key={severity} value={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Date
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                        required
                      />
                    </label>

                    <label>
                      Time
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) =>
                          setForm({ ...form, time: e.target.value })
                        }
                        required
                      />
                    </label>

                    <button className="primary-btn" disabled={loading}>
                      {loading ? "Creating..." : "Create Incident"}
                    </button>
                  </form>
                </div>
              )}

              <div className="panel">
                <h2>{isPatrol ? "My Assigned Incidents" : "Incidents"}</h2>

                {selectedIncident && (
                  <div className="incident-details">
                    <div className="details-header">
                      <h3>{selectedIncident.title}</h3>
                      <button
                        className="secondary-btn"
                        onClick={() => setSelectedIncident(null)}
                      >
                        Close
                      </button>
                    </div>

                    <p>
                      <strong>Code:</strong> {selectedIncident.incidentCode || "N/A"}
                    </p>
                    <p>
                      <strong>Type:</strong> {selectedIncident.incidentType || "N/A"}
                    </p>
                    <p>
                      <strong>Address:</strong> {selectedIncident.street || "N/A"},{" "}
                      {selectedIncident.suburb || "N/A"}
                    </p>
                    <p>
                      <strong>Sector:</strong> {selectedIncident.sector || "N/A"}
                    </p>
                    <p>
                      <strong>Status:</strong> {selectedIncident.status || "N/A"}
                    </p>
                    <p>
                      <strong>Severity:</strong> {selectedIncident.severity || "N/A"}
                    </p>
                    <p>
                      <strong>Assigned Patrol:</strong>{" "}
                      {getAssignedPatrolName(selectedIncident, data.patrols)}
                    </p>
                    <p>
                      <strong>Assigned Vehicle:</strong>{" "}
                      {getAssignedVehicleName(selectedIncident)}
                    </p>
                    <p>
                      <strong>Description:</strong>{" "}
                      {selectedIncident.description || "No description"}
                    </p>

                    <div className="action-row">
                      <button onClick={() => updateStatus(selectedIncident.id, "OPEN")}>
                        Open
                      </button>
                      <button
                        onClick={() => updateStatus(selectedIncident.id, "IN_PROGRESS")}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => updateStatus(selectedIncident.id, "RESOLVED")}
                      >
                        Resolved
                      </button>
                      <button onClick={() => updateStatus(selectedIncident.id, "CLOSED")}>
                        Closed
                      </button>
                    </div>

{canAssignPatrol && (
  <button onClick={() => autoAssignIncident(selectedIncident.id)}>
    Auto Assign
  </button>
)}

                    {canAssignPatrol && (
                      <div className="action-row">
                        <select
                          value={getIncidentLinkedPatrolId(selectedIncident)}
                          onChange={(e) =>
                            assignPatrol(
                              selectedIncident.id,
                              e.target.value,
                              selectedIncident.assignedVehicleId ||
                                selectedIncident.vehicleId ||
                                selectedIncident.linkedVehicleId
                            )
                          }
                        >
                          <option value="">Assign Patrol</option>
                          {getActivePatrols(data.patrols)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {getPatrolOptionLabel(p)}
                              </option>
                            ))}
                        </select>

                        {data.vehicles.length > 0 && (
                          <select
                            value={
                              selectedIncident.assignedVehicleId ||
                              selectedIncident.vehicleId ||
                              selectedIncident.linkedVehicleId ||
                              ""
                            }
                            onChange={(e) =>
                              assignPatrol(
                                selectedIncident.id,
                                selectedIncident.assignedPatrolId ||
                                  selectedIncident.patrolId ||
                                  selectedIncident.linkedPatrolId,
                                e.target.value
                              )
                            }
                          >
                            <option value="">Assign Vehicle</option>
                            {data.vehicles.map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {getVehicleLabel(vehicle)}
                              </option>
                            ))}
                          </select>
                        )}

                        <button onClick={() => unassignPatrol(selectedIncident.id)}>
                          Unassign Patrol
                        </button>

                        <button onClick={() => archiveIncident(selectedIncident.id)}>
                          Archive
                        </button>

                        <button onClick={() => deleteIncident(selectedIncident.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {data.incidents.length === 0 && (
                  <p>{isPatrol ? "No incidents assigned to you." : "No incidents found."}</p>
                )}

                {data.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="item"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div>
                      <strong>{incident.title}</strong>
                      <div>
                        {incident.sector} • {incident.incidentType || "No type"}
                      </div>
                      <div>
                        Patrol: {getAssignedPatrolName(incident, data.patrols)} • Vehicle:{" "}
                        {getAssignedVehicleName(incident)}
                      </div>
                    </div>

                    <span className="badge">{incident.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {active === "Patrols" && canViewPatrols && (
          <div className="panel">
            <h2>Active Patrols</h2>

            {getActivePatrols(data.patrols).length === 0 && (
              <p>No active patrols found.</p>
            )}

            {getActivePatrols(data.patrols)
              .map((p) => (
                <div key={p.id} className="item">
                  <div>
                    <strong>{getDisplayName(p)}</strong>
                    <div>{p.sector || "No sector"}</div>
                    <div>{getPatrolVehicleLabel(p)}</div>
                  </div>

                  <span className="badge">{p.status}</span>
                </div>
              ))}
          </div>
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
          <div className="panel">
            <div className="details-header">
              <div>
                <h2>Crime Intelligence</h2>
                <p className="card-detail">
                  Restricted workspace for persons, vehicles, locations and linked intelligence.
                </p>
              </div>
              <button className="primary-btn" onClick={startAddIntelEntity}>
                Add Entity
              </button>
            </div>

            <div className="filter-bar">
              <label>
                Search intelligence
                <input
                  value={intelSearch}
                  onChange={(e) => setIntelSearch(e.target.value)}
                  placeholder="Search person, vehicle, location, risk, status..."
                />
              </label>
              <button onClick={() => setIntelSearch("")}>Clear</button>
              <button className="secondary-btn" onClick={refreshIntelligence}>Refresh Intelligence</button>

              <label>
                Time layer
                <select
                  value={intelTimeFilter.preset}
                  onChange={(e) =>
                    setIntelTimeFilter({
                      ...intelTimeFilter,
                      preset: e.target.value,
                    })
                  }
                >
                  <option value="ALL">All time</option>
                  <option value="24H">Last 24 hours</option>
                  <option value="7D">Last 7 days</option>
                  <option value="30D">Last 30 days</option>
                  <option value="90D">Last 90 days</option>
                  <option value="CUSTOM">Custom range</option>
                </select>
              </label>

              {intelTimeFilter.preset === "CUSTOM" && (
                <>
                  <label>
                    From
                    <input
                      type="date"
                      value={intelTimeFilter.from}
                      onChange={(e) =>
                        setIntelTimeFilter({ ...intelTimeFilter, from: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      value={intelTimeFilter.to}
                      onChange={(e) =>
                        setIntelTimeFilter({ ...intelTimeFilter, to: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <div className="cards">
              <div className="card">
                <div className="card-title">Entities</div>
                <div className="card-value">{intelligenceEntities.length}</div>
                <div className="card-detail">Total intelligence records</div>
              </div>
              <div className="card">
                <div className="card-title">Time Layer</div>
                <div className="card-value">{filteredIntelligenceEntities.length}</div>
                <div className="card-detail">{getIntelTimeFilterLabel(intelTimeFilter)}</div>
              </div>
              <div className="card">
                <div className="card-title">High / Critical</div>
                <div className="card-value">
                  {intelligenceEntities.filter((item) => ["HIGH", "CRITICAL"].includes(item.riskLevel)).length}
                </div>
                <div className="card-detail">Priority attention</div>
              </div>
              <div className="card">
                <div className="card-title">Vehicles</div>
                <div className="card-value">
                  {intelligenceEntities.filter((item) => item.entityType === "VEHICLE").length}
                </div>
                <div className="card-detail">Vehicles of interest</div>
              </div>
              <div className="card">
                <div className="card-title">Watchlist</div>
                <div className="card-value">
                  {intelligenceEntities.filter((item) => item.status === "WATCHLIST").length}
                </div>
                <div className="card-detail">Currently monitored</div>
              </div>
            </div>

            {intelForm && (
              <div className="incident-details">
                <div className="details-header">
                  <h3>{isEditingIntel ? "Edit Intelligence Entity" : "Add Intelligence Entity"}</h3>
                  <button className="secondary-btn" onClick={cancelIntelForm}>Close</button>
                </div>

                <form className="form" onSubmit={saveIntelEntity}>
                  <label>
                    Entity Type
                    <select
                      value={intelForm.entityType}
                      onChange={(e) => setIntelForm({ ...intelForm, entityType: e.target.value })}
                    >
                      {INTEL_ENTITY_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Display Name
                    <input
                      value={intelForm.displayName}
                      onChange={(e) => setIntelForm({ ...intelForm, displayName: e.target.value })}
                      placeholder="Example: White Toyota Quantum / John Doe / Hotspot"
                      required
                    />
                  </label>

                  <label>
                    Description / Notes
                    <textarea
                      value={intelForm.description || ""}
                      onChange={(e) => setIntelForm({ ...intelForm, description: e.target.value })}
                      placeholder="Source notes, observations, behaviour, identifying details"
                    />
                  </label>

                  <label>
                    Risk Level
                    <select
                      value={intelForm.riskLevel}
                      onChange={(e) => setIntelForm({ ...intelForm, riskLevel: e.target.value })}
                    >
                      {INTEL_RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Status
                    <select
                      value={intelForm.status}
                      onChange={(e) => setIntelForm({ ...intelForm, status: e.target.value })}
                    >
                      {INTEL_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <div className="panel">
                    <h3>Location / Geo Data</h3>
                    <p className="card-detail">
                      Address is human-readable. Latitude/longitude powers the Geo Map pin.
                    </p>

                    <label>
                      Street / Address
                      <input
                        value={intelForm.address || ""}
                        onChange={(e) => setIntelForm({ ...intelForm, address: e.target.value })}
                        placeholder="Example: 12 Main Road"
                      />
                    </label>

                    <label>
                      Suburb / Area
                      <input
                        value={intelForm.suburb || ""}
                        onChange={(e) => setIntelForm({ ...intelForm, suburb: e.target.value })}
                        placeholder="Example: Claremont"
                      />
                    </label>

                    <label>
                      Sector
                      <select
                        value={intelForm.sector || ""}
                        onChange={(e) => setIntelForm({ ...intelForm, sector: e.target.value })}
                      >
                        <option value="">No sector</option>
                        <option>Sector 1</option>
                        <option>Sector 2</option>
                        <option>Sector 3</option>
                        <option>Sector 4</option>
                      </select>
                    </label>

                    <label>
                      Latitude
                      <input
                        type="number"
                        step="any"
                        value={intelForm.latitude ?? ""}
                        onChange={(e) => setIntelForm({ ...intelForm, latitude: e.target.value })}
                        placeholder="Example: -33.9249"
                      />
                    </label>

                    <label>
                      Longitude
                      <input
                        type="number"
                        step="any"
                        value={intelForm.longitude ?? ""}
                        onChange={(e) => setIntelForm({ ...intelForm, longitude: e.target.value })}
                        placeholder="Example: 18.4241"
                      />
                    </label>
                  </div>

                  {intelForm.entityType === "VEHICLE" && (
                    <div className="panel">
                      <h3>Vehicle of Interest Details</h3>
                      <label>
                        Registration Number
                        <input
                          value={intelForm.vehicleRegistration || ""}
                          onChange={(e) => setIntelForm({ ...intelForm, vehicleRegistration: e.target.value })}
                          placeholder="Unknown allowed"
                        />
                      </label>
                      <label>Make<input value={intelForm.vehicleMake || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleMake: e.target.value })} /></label>
                      <label>Model<input value={intelForm.vehicleModel || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleModel: e.target.value })} /></label>
                      <label>Colour<input value={intelForm.vehicleColour || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleColour: e.target.value })} /></label>
                      <label>Vehicle Type<input value={intelForm.vehicleType || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleType: e.target.value })} /></label>
                      <label>Distinguishing Marks<textarea value={intelForm.vehicleMarks || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleMarks: e.target.value })} /></label>
                      <label>Vehicle Notes<textarea value={intelForm.vehicleNotes || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleNotes: e.target.value })} /></label>
                    </div>
                  )}

                  <div className="action-row">
                    <button className="primary-btn" type="submit">{isEditingIntel ? "Update Entity" : "Create Entity"}</button>
                    <button className="secondary-btn" type="button" onClick={cancelIntelForm}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {selectedIntelEntity && (
              <div className="incident-details">
                <div className="details-header">
                  <div>
                    <h3>Intel Profile: {selectedIntelEntity.displayName}</h3>
                    <p className="card-detail">
                      {selectedIntelEntity.entityType} • {getIntelRiskBadge(selectedIntelEntity)}
                    </p>
                  </div>
                  <div className="action-row">
                    <button className="secondary-btn" onClick={() => startEditIntelEntity(selectedIntelEntity)}>
                      Edit Profile
                    </button>
                    <button className="secondary-btn" onClick={() => setSelectedIntelEntity(null)}>
                      Close
                    </button>
                  </div>
                </div>

                <div className="cards">
                  <div className="card">
                    <div className="card-title">Risk</div>
                    <div className="card-value">{selectedIntelEntity.riskLevel || "LOW"}</div>
                    <div className="card-detail">Current risk level</div>
                  </div>

                  <div className="card">
                    <div className="card-title">Status</div>
                    <div className="card-value">{selectedIntelEntity.status || "ACTIVE"}</div>
                    <div className="card-detail">Intel record status</div>
                  </div>

                  <div className="card">
                    <div className="card-title">Links</div>
                    <div className="card-value">
                      {(selectedIntelEntity.outgoingLinks || []).length +
                        (selectedIntelEntity.incomingLinks || []).length}
                    </div>
                    <div className="card-detail">Known entity relationships</div>
                  </div>

                  <div className="card">
                    <div className="card-title">Activity</div>
                    <div className="card-value">
                      {(selectedIntelEntity.incidentVOILinks || []).length +
                        (selectedIntelEntity.patrolEventVOILinks || []).length}
                    </div>
                    <div className="card-detail">Incident / patrol references</div>
                  </div>
                </div>

                <div className="grid">
                  <div className="panel">
                    <h3>Profile Summary</h3>
                    <p><strong>Name / Label:</strong> {selectedIntelEntity.displayName}</p>
                    <p><strong>Type:</strong> {selectedIntelEntity.entityType}</p>
                    <p><strong>Risk / Status:</strong> {getIntelRiskBadge(selectedIntelEntity)}</p>
                    <p><strong>Description:</strong> {selectedIntelEntity.description || "-"}</p>
                    <p><strong>Address:</strong> {[selectedIntelEntity.address, selectedIntelEntity.suburb].filter(Boolean).join(", ") || "-"}</p>
                    <p><strong>Sector:</strong> {selectedIntelEntity.sector || "-"}</p>
                    <p><strong>Coordinates:</strong>{" "}{getEntityLatLng(selectedIntelEntity) ? getEntityLatLng(selectedIntelEntity).join(", ") : "-"}</p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {selectedIntelEntity.createdAt
                        ? new Date(selectedIntelEntity.createdAt).toLocaleString()
                        : "-"}
                    </p>
                    <p>
                      <strong>Updated:</strong>{" "}
                      {selectedIntelEntity.updatedAt
                        ? new Date(selectedIntelEntity.updatedAt).toLocaleString()
                        : "-"}
                    </p>
                    <p><strong>Timeline:</strong> {getIntelAgeLabel(selectedIntelEntity)}</p>
                  </div>

                  {selectedIntelEntity.voivehicleDetails && (
                    <div className="panel">
                      <h3>Vehicle of Interest</h3>
                      <p><strong>Registration:</strong> {selectedIntelEntity.voivehicleDetails.registrationNumber || "-"}</p>
                      <p>
                        <strong>Make / Model:</strong>{" "}
                        {[selectedIntelEntity.voivehicleDetails.make, selectedIntelEntity.voivehicleDetails.model]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </p>
                      <p><strong>Colour:</strong> {selectedIntelEntity.voivehicleDetails.colour || "-"}</p>
                      <p><strong>Type:</strong> {selectedIntelEntity.voivehicleDetails.vehicleType || "-"}</p>
                      <p><strong>Marks:</strong> {selectedIntelEntity.voivehicleDetails.distinguishingMarks || "-"}</p>
                      <p><strong>Notes:</strong> {selectedIntelEntity.voivehicleDetails.notes || "-"}</p>
                    </div>
                  )}
                </div>

                <div className="panel">
                  <h3>Create Intelligence Link</h3>
                  <form className="form" onSubmit={createIntelLink}>
                    <label>
                      From
                      <select
                        value={intelLinkForm.fromEntityId || selectedIntelEntity.id}
                        onChange={(e) => setIntelLinkForm({ ...intelLinkForm, fromEntityId: e.target.value })}
                      >
                        <option value={selectedIntelEntity.id}>{selectedIntelEntity.displayName}</option>
                        {intelligenceEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>{entity.displayName}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      To
                      <select
                        value={intelLinkForm.toEntityId}
                        onChange={(e) => setIntelLinkForm({ ...intelLinkForm, toEntityId: e.target.value })}
                      >
                        <option value="">Select target entity</option>
                        {intelligenceEntities
                          .filter((entity) => entity.id !== (intelLinkForm.fromEntityId || selectedIntelEntity.id))
                          .map((entity) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.displayName} ({entity.entityType})
                            </option>
                          ))}
                      </select>
                    </label>

                    <label>
                      Relationship
                      <select
                        value={intelLinkForm.relationship}
                        onChange={(e) => setIntelLinkForm({ ...intelLinkForm, relationship: e.target.value })}
                      >
                        {INTEL_RELATIONSHIPS.map((relationship) => (
                          <option key={relationship} value={relationship}>{relationship}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Strength 1-10
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={intelLinkForm.strength}
                        onChange={(e) => setIntelLinkForm({ ...intelLinkForm, strength: e.target.value })}
                      />
                    </label>

                    <label>
                      Link Notes
                      <textarea
                        value={intelLinkForm.notes}
                        onChange={(e) => setIntelLinkForm({ ...intelLinkForm, notes: e.target.value })}
                      />
                    </label>

                    <button className="primary-btn" type="submit">Create Link</button>
                  </form>
                </div>

                <div className="panel">
                  <div className="details-header">
                    <div>
                      <h3>Auto Link Suggestions</h3>
                      <p className="card-detail">
                        Suggested matches are based on registration, names, address, suburb and sector. Analyst approval is required: Accept, Reject, or Ignore.
                      </p>
                    </div>
                    <span className="badge">{autoLinkSuggestions.length} suggestions</span>
                  </div>

                  {autoLinkSuggestions.length === 0 ? (
                    <div>
                      <p>No new auto-link suggestions for this profile.</p>
                      <p className="card-detail">All strong matches may already be linked, ignored, or rejected.</p>
                    </div>
                  ) : (
                    autoLinkSuggestions.map((suggestion) => (
                      <div key={suggestion.targetEntity.id} className="item">
                        <div>
                          <strong>{suggestion.targetEntity.displayName}</strong>
                          <div>
                            {suggestion.targetEntity.entityType || "ENTITY"} • Suggested relationship: {suggestion.relationship}
                          </div>
                          <div>
                            Confidence: {suggestion.strength}/10 • Score: {suggestion.score}
                          </div>
                          <div className="card-detail">
                            {suggestion.reasons.join(" • ")}
                          </div>
                        </div>
                        <div className="action-row">
                          <button
                            className="primary-btn"
                            onClick={() => createSuggestedIntelLink(suggestion)}
                          >
                            Accept
                          </button>
                          <button
                            className="secondary-btn"
                            onClick={() => rejectAutoLinkSuggestion(suggestion)}
                          >
                            Reject
                          </button>
                          <button
                            className="secondary-btn"
                            onClick={() => hideAutoLinkSuggestion(suggestion)}
                          >
                            Ignore
                          </button>
                          <button
                            className="secondary-btn"
                            onClick={() => viewIntelEntity(suggestion.targetEntity)}
                          >
                            Open Target
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid">
                  <div className="panel">
                    <h3>Outgoing Links</h3>
                    {(selectedIntelEntity.outgoingLinks || []).length === 0 && <p>No outgoing links.</p>}
                    {(selectedIntelEntity.outgoingLinks || []).map((link) => (
                      <div key={link.id} className="item">
                        <div>
                          <strong>{link.relationship}</strong>
                          <div>{link.toEntity?.displayName || link.toEntityId}</div>
                          <div>{link.toEntity?.entityType || "Linked entity"}</div>
                          <div>{link.notes || "No notes"}</div>
                          <div className="card-detail">{getIntelAgeLabel(link)}</div>
                          <div className="action-row">
                            <button
                              className="secondary-btn"
                              onClick={() => viewIntelEntity(link.toEntity || { id: link.toEntityId })}
                            >
                              Open Linked Profile
                            </button>
                            <button
                              className="secondary-btn danger"
                              onClick={() => deleteIntelLink(link)}
                            >
                              Delete Link
                            </button>
                          </div>
                        </div>
                        <span className="badge">{link.strength || "-"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="panel">
                    <h3>Incoming Links</h3>
                    {(selectedIntelEntity.incomingLinks || []).length === 0 && <p>No incoming links.</p>}
                    {(selectedIntelEntity.incomingLinks || []).map((link) => (
                      <div key={link.id} className="item">
                        <div>
                          <strong>{link.relationship}</strong>
                          <div>{link.fromEntity?.displayName || link.fromEntityId}</div>
                          <div>{link.fromEntity?.entityType || "Linked entity"}</div>
                          <div>{link.notes || "No notes"}</div>
                          <div className="card-detail">{getIntelAgeLabel(link)}</div>
                          <div className="action-row">
                            <button
                              className="secondary-btn"
                              onClick={() => viewIntelEntity(link.fromEntity || { id: link.fromEntityId })}
                            >
                              Open Linked Profile
                            </button>
                            <button
                              className="secondary-btn danger"
                              onClick={() => deleteIntelLink(link)}
                            >
                              Delete Link
                            </button>
                          </div>
                        </div>
                        <span className="badge">{link.strength || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid">
                  <div className="panel">
                    <h3>Linked Incidents</h3>
                    {(selectedIntelEntity.incidentVOILinks || []).length === 0 && <p>No incident links yet.</p>}
                    {(selectedIntelEntity.incidentVOILinks || []).map((item) => (
                      <div key={item.id} className="item">
                        <div>
                          <strong>{item.incident?.incidentCode || "Incident"}</strong>
                          <div>{item.incident?.title || "-"}</div>
                          <div>{item.incident?.status || "-"} • {item.incident?.severity || "-"}</div>
                          <div>{item.roleInIncident || item.notes || "-"}</div>
                          <div className="card-detail">{getIntelAgeLabel({ ...item, ...(item.incident || {}) })}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="panel">
                    <h3>Patrol Observations</h3>
                    {(selectedIntelEntity.patrolEventVOILinks || []).length === 0 && <p>No patrol observations yet.</p>}
                    {(selectedIntelEntity.patrolEventVOILinks || []).map((item) => (
                      <div key={item.id} className="item">
                        <div>
                          <strong>{item.observationType || "Observation"}</strong>
                          <div>{item.patrolEvent?.type || "Patrol event"}</div>
                          <div>{item.notes || item.patrolEvent?.description || "-"}</div>
                          <div className="card-detail">{getIntelAgeLabel({ ...item, ...(item.patrolEvent || {}) })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div id="intel-spider-map">
                  <IntelSpiderGraph
                    entity={selectedIntelEntity}
                    allEntities={intelligenceEntities}
                    onOpenEntity={viewIntelEntity}
                    onDeleteLink={deleteIntelLink}
                    timeFilter={intelTimeFilter}
                  />
                </div>

                <IntelGeoMap
                  entities={intelligenceEntities}
                  selectedEntity={selectedIntelEntity}
                  onOpenEntity={viewIntelEntity}
                  timeFilter={intelTimeFilter}
                />

                <div className="panel">
                  <h3>Relationship Summary</h3>
                  <p className="card-detail">
                    The Spider Map above uses outgoing links, incoming links, incident links and patrol observations
                    to show the live intelligence network around this profile.
                  </p>
                </div>
              </div>
            )}

            <h3>Intelligence Entity Register</h3>
            {filteredIntelligenceEntities.length === 0 ? (<p>No intelligence entities found.</p>) : (
              <table>
                <thead><tr><th>Type</th><th>Name</th><th>Risk</th><th>Status</th><th>Age</th><th>Vehicle Reg</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>{filteredIntelligenceEntities.map((entity) => (<tr key={entity.id}><td>{entity.entityType}</td><td>{entity.displayName}</td><td>{entity.riskLevel || "LOW"}</td><td>{entity.status || "ACTIVE"}</td><td>{getIntelAgeLabel(entity)}</td><td>{entity.voivehicleDetails?.registrationNumber || "-"}</td><td>{entity.description || "-"}</td><td><button onClick={() => viewIntelEntity(entity)}>View</button><button onClick={() => startEditIntelEntity(entity)}>Edit</button><button onClick={() => deleteIntelEntity(entity)}>Archive</button></td></tr>))}</tbody>
              </table>
            )}
          </div>
        )}

        {active === "Reports" && canViewReports && (
          <div className="panel">
            <div className="details-header">
              <h2>Patrol / KM Reports</h2>
              <button className="secondary-btn" onClick={loadPatrolReports}>
                Refresh
              </button>
            </div>

            <div className="action-row">
              <input
                type="date"
                value={reportFilters.from}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, from: e.target.value })
                }
              />

              <input
                type="date"
                value={reportFilters.to}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, to: e.target.value })
                }
              />

              <select
                value={reportFilters.sector}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, sector: e.target.value })
                }
              >
                {REPORT_SECTOR_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={reportFilters.vehicleId}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, vehicleId: e.target.value })
                }
              >
                <option value="ALL">All Vehicles</option>
                {data.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration || getVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>

              <select
                value={reportFilters.patrollerId}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, patrollerId: e.target.value })
                }
              >
                <option value="ALL">All Patrollers</option>
                {patrollerFilterOptions.map((patroller) => (
                  <option key={patroller.id} value={patroller.id}>
                    {patroller.fullName || patroller.email || "Unnamed"}
                  </option>
                ))}
              </select>

              <select
                value={reportFilters.status}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, status: e.target.value })
                }
              >
                {REPORT_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button onClick={clearReportFilters}>Clear</button>
            </div>

            <div className="cards">
              <div className="card">
                <div className="card-title">Reports</div>
                <div className="card-value">{filteredPatrolReports.length}</div>
                <div className="card-detail">Matching filters</div>
              </div>

              <div className="card">
                <div className="card-title">Total KM</div>
                <div className="card-value">{getReportTotalKm(filteredPatrolReports)}</div>
                <div className="card-detail">Completed distance captured</div>
              </div>

              <div className="card">
                <div className="card-title">Completed</div>
                <div className="card-value">
                  {getReportStatusCount(filteredPatrolReports, "COMPLETED")}
                </div>
                <div className="card-detail">Closed patrol sessions</div>
              </div>

              <div className="card">
                <div className="card-title">Active</div>
                <div className="card-value">
                  {getReportStatusCount(filteredPatrolReports, "ACTIVE")}
                </div>
                <div className="card-detail">Currently on patrol</div>
              </div>
            </div>

            {selectedPatrolReport && (
              <div className="incident-details">
                <div className="details-header">
                  <h3>Patrol Detail</h3>
                  <button className="secondary-btn" onClick={closePatrolReport}>
                    Close
                  </button>
                </div>

                <p>
                  <strong>Patroller:</strong>{" "}
                  {selectedPatrolReport.user?.fullName ||
                    selectedPatrolReport.user?.email ||
                    "Unnamed"}
                </p>
                <p>
                  <strong>Vehicle:</strong>{" "}
                  {selectedPatrolReport.vehicle?.registration ||
                    getVehicleLabel(selectedPatrolReport.vehicle)}
                </p>
                <p>
                  <strong>Sector:</strong> {selectedPatrolReport.sector || "No sector"}
                </p>
                <p>
                  <strong>Status:</strong> {selectedPatrolReport.status || "-"}
                </p>
                {(selectedPatrolReport.editCount || selectedPatrolReport.edit_count) > 0 && (
                  <p>
                    <strong>Edited:</strong>{" "}
                    {selectedPatrolReport.editCount || selectedPatrolReport.edit_count} change(s)
                  </p>
                )}
                <p>
                  <strong>KM:</strong> {selectedPatrolReport.startKm ?? "-"} →{" "}
                  {selectedPatrolReport.endKm ?? "-"} ={" "}
                  {selectedPatrolReport.totalKm ?? "-"}
                </p>
                <p>
                  <strong>Summary:</strong>{" "}
                  {selectedPatrolReport.summary || "No summary"}
                </p>

                {editPatrolForm && (
                  <div className="form">
                    <label>
                      Sector
                      <select
                        value={editPatrolForm.sector}
                        onChange={(e) =>
                          setEditPatrolForm({
                            ...editPatrolForm,
                            sector: e.target.value,
                          })
                        }
                      >
                        <option value="">No sector</option>
                        <option value="Sector 1">Sector 1</option>
                        <option value="Sector 2">Sector 2</option>
                        <option value="Sector 3">Sector 3</option>
                        <option value="Sector 4">Sector 4</option>
                      </select>
                    </label>

                    <label>
                      Start KM
                      <input
                        type="number"
                        value={editPatrolForm.startKm}
                        onChange={(e) =>
                          setEditPatrolForm({
                            ...editPatrolForm,
                            startKm: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      End KM
                      <input
                        type="number"
                        value={editPatrolForm.endKm}
                        onChange={(e) =>
                          setEditPatrolForm({
                            ...editPatrolForm,
                            endKm: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Summary
                      <textarea
                        value={editPatrolForm.summary}
                        onChange={(e) =>
                          setEditPatrolForm({
                            ...editPatrolForm,
                            summary: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Edit Reason
                      <textarea
                        value={editPatrolForm.editReason}
                        onChange={(e) =>
                          setEditPatrolForm({
                            ...editPatrolForm,
                            editReason: e.target.value,
                          })
                        }
                        placeholder="Required: explain why this report is being edited"
                        required
                      />
                    </label>

                    <button onClick={() => savePatrolReportEdits(selectedPatrolReport.id)}>
                      Save Changes
                    </button>
                  </div>
                )}

                {patrolAuditLogs.length > 0 && (
                  <div className="panel">
                    <h3>Audit History</h3>

                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>User</th>
                          <th>Role</th>
                          <th>Field</th>
                          <th>Old</th>
                          <th>New</th>
                          <th>Reason</th>
                        </tr>
                      </thead>

                      <tbody>
                        {patrolAuditLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              {log.createdAt || log.created_at
                                ? new Date(log.createdAt || log.created_at).toLocaleString()
                                : "-"}
                            </td>
                            <td>
                              {log.editedBy?.fullName ||
                                log.editedBy?.email ||
                                log.editedByName ||
                                log.edited_by_name ||
                                log.editedById ||
                                log.edited_by ||
                                "-"}
                            </td>
                            <td>{log.editedByRole || log.edited_by_role || "-"}</td>
                            <td>{log.fieldName || log.field_name || "-"}</td>
                            <td>{String(log.oldValue ?? log.old_value ?? "")}</td>
                            <td>{String(log.newValue ?? log.new_value ?? "")}</td>
                            <td>{log.editReason || log.edit_reason || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {filteredPatrolReports.length === 0 ? (
              <p>No patrol reports match these filters.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Patroller</th>
                    <th>Vehicle</th>
                    <th>Sector</th>
                    <th>Start KM</th>
                    <th>End KM</th>
                    <th>Total KM</th>
                    <th>Status</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatrolReports.map((patrol) => (
                    <tr key={patrol.id}>
                      <td>{patrol.user?.fullName || patrol.user?.email || "Unnamed"}</td>
                      <td>{patrol.vehicle?.registration || getVehicleLabel(patrol.vehicle)}</td>
                      <td>{patrol.sector || "No sector"}</td>
                      <td>{patrol.startKm ?? "-"}</td>
                      <td>{patrol.endKm ?? "-"}</td>
                      <td>{patrol.totalKm ?? "-"}</td>
                      <td>
                        {patrol.status || "-"}
                        {(patrol.editCount || patrol.edit_count) > 0 && (
                          <div className="card-detail">
                            Edited · {patrol.editCount || patrol.edit_count}
                          </div>
                        )}
                      </td>
                      <td>
                        {patrol.startTime
                          ? new Date(patrol.startTime).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        {patrol.endTime
                          ? new Date(patrol.endTime).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        <button onClick={() => viewPatrolReport(patrol)}>View</button>
                        <button onClick={() => editPatrolReport(patrol)}>Edit</button>
                        <button onClick={() => loadPatrolReportAudit(patrol)}>Audit</button>
                        {patrol.status === "ACTIVE" && (
                          <button onClick={() => closeActivePatrol(patrol)}>
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {active === "Organisations" && canViewOrganisations && (
          <div className="panel">
            <h2>Organisations</h2>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Sectors</th>
                </tr>
              </thead>

              <tbody>
                {data.organisations.map((org) => (
                  <tr key={org.id}>
                    <td>{org.name}</td>
                    <td>{org.code}</td>
                    <td>{org.sectors?.map((s) => s.name).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
