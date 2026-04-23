import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const API_BASE = "http://localhost:4000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("cw_token") || "");
  const [loginEmail, setLoginEmail] = useState("admin2@civitaswatch.com");
  const [loginPassword, setLoginPassword] = useState("Password123!");
  const [message, setMessage] = useState("");
  const [activeView, setActiveView] = useState("incidents");

  const [me, setMe] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activePatrol, setActivePatrol] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [latestChecklistId, setLatestChecklistId] = useState("");
  const [endedPatrolSummary, setEndedPatrolSummary] = useState(null);
  const [adminReport, setAdminReport] = useState([]);

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSector, setIncidentSector] = useState("Sector 1");
  const [incidentSeverity, setIncidentSeverity] = useState("HIGH");
  const [incidentLinkedPatrolId, setIncidentLinkedPatrolId] = useState("");
  const [incidentOccurredAt, setIncidentOccurredAt] = useState("");

  const [startVehicleId, setStartVehicleId] = useState("");
  const [sector, setSector] = useState("Sector 1");
  const [startKm, setStartKm] = useState("120900");

  const [incidentCode, setIncidentCode] = useState("P01");
  const [standDownDescription, setStandDownDescription] = useState("Arrived at scene - medical emergency");
  const [assistance, setAssistance] = useState("AMBO");
  const [sceneActive, setSceneActive] = useState(true);

  const [resumeDescription, setResumeDescription] = useState("Scene cleared, patrol resumed");
  const [endKm, setEndKm] = useState("120940");
  const [endSummary, setEndSummary] = useState("Routine patrol completed.");

  const [filterPatroller, setFilterPatroller] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const filteredAdminReport = useMemo(() => {
    return adminReport.filter((row) => {
      const patrollerName = row.user?.fullName || "";
      const vehicleReg = row.vehicle?.registration || "";
      const status = row.status || "";
      const createdAt = row.createdAt ? new Date(row.createdAt) : null;

      const matchesPatroller =
        !filterPatroller || patrollerName.toLowerCase().includes(filterPatroller.toLowerCase());

      const matchesVehicle =
        !filterVehicle || vehicleReg.toLowerCase().includes(filterVehicle.toLowerCase());

      const matchesStatus = !filterStatus || status === filterStatus;

      let matchesDateFrom = true;
      if (filterDateFrom && createdAt) {
        const from = new Date(`${filterDateFrom}T00:00:00`);
        matchesDateFrom = createdAt >= from;
      }

      let matchesDateTo = true;
      if (filterDateTo && createdAt) {
        const to = new Date(`${filterDateTo}T23:59:59`);
        matchesDateTo = createdAt <= to;
      }

      return (
        matchesPatroller &&
        matchesVehicle &&
        matchesStatus &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [adminReport, filterPatroller, filterVehicle, filterStatus, filterDateFrom, filterDateTo]);

  async function authedFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function login() {
    try {
      setMessage("Logging in...");
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setToken(data.token);
      setMe(data.user);
      localStorage.setItem("cw_token", data.token);
      setMessage("Logged in.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("cw_token");
    setToken("");
    setMe(null);
    setVehicles([]);
    setActivePatrol(null);
    setTimeline([]);
    setLatestChecklistId("");
    setEndedPatrolSummary(null);
    setAdminReport([]);
    setIncidents([]);
    setSelectedIncidentId("");
    setSelectedIncident(null);
    setStartVehicleId("");
    setFilterPatroller("");
    setFilterVehicle("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setActiveView("incidents");
    setMessage("Logged out.");
  }

  async function loadMe() {
    try {
      const data = await authedFetch("/auth/me");
      setMe(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadVehicles() {
    try {
      const data = await authedFetch("/vehicles");
      setVehicles(data);
      if (data.length > 0 && !startVehicleId) {
        setStartVehicleId(data[0].id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadLatestChecklist() {
    try {
      const data = await authedFetch("/checklists/pre-patrol/latest");
      if (data?.id) {
        setLatestChecklistId(data.id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadActivePatrol() {
    try {
      const data = await authedFetch("/patrols/active");
      setActivePatrol(data);
      if (data?.id) {
        await loadTimeline(data.id);
      } else {
        setTimeline([]);
      }
    } catch {
      setActivePatrol(null);
      setTimeline([]);
    }
  }

  async function loadTimeline(patrolId) {
    try {
      const data = await authedFetch(`/patrol-events/${patrolId}`);
      setTimeline(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAdminReport() {
    try {
      const data = await authedFetch("/patrols/report/all");
      setAdminReport(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadIncidents() {
    try {
      const data = await authedFetch("/incidents");
      setIncidents(data);

      if (selectedIncidentId) {
        const match = data.find((item) => item.id === selectedIncidentId);
        if (match) {
          setSelectedIncident(match);
        }
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadIncidentDetail(incidentId) {
    try {
      setSelectedIncidentId(incidentId);
      const data = await authedFetch(`/incidents/${incidentId}`);
      setSelectedIncident(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createIncident() {
    try {
      if (!incidentTitle.trim()) {
        setMessage("Incident title is required.");
        return;
      }

      if (!incidentSector.trim()) {
        setMessage("Incident sector is required.");
        return;
      }

      setMessage("Creating incident...");

      const payload = {
        title: incidentTitle,
        description: incidentDescription || null,
        sector: incidentSector,
        severity: incidentSeverity,
        source: activePatrol ? "PATROL" : "ADMIN",
        linkedPatrolId: incidentLinkedPatrolId || activePatrol?.id || null,
        occurredAt: incidentOccurredAt || null,
      };

      const created = await authedFetch("/incidents/report", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIncidentTitle("");
      setIncidentDescription("");
      setIncidentSector(activePatrol?.sector || "Sector 1");
      setIncidentSeverity("HIGH");
      setIncidentLinkedPatrolId(activePatrol?.id || "");
      setIncidentOccurredAt("");
      setSelectedIncidentId(created.id);
      setSelectedIncident(created);
      setMessage("Incident created.");

      await loadIncidents();

      if (created.linkedPatrolId) {
        await loadTimeline(created.linkedPatrolId);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateIncidentStatus(status) {
    if (!selectedIncidentId) {
      setMessage("Select an incident first.");
      return;
    }

    try {
      setMessage(`Updating incident to ${status}...`);
      const updated = await authedFetch(`/incidents/${selectedIncidentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelectedIncident(updated);
      setMessage(`Incident updated to ${status}.`);
      await loadIncidents();

      if (updated.linkedPatrolId) {
        await loadTimeline(updated.linkedPatrolId);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resolveIncident() {
    if (!selectedIncidentId) {
      setMessage("Select an incident first.");
      return;
    }

    try {
      setMessage("Resolving incident...");
      const updated = await authedFetch(`/incidents/${selectedIncidentId}/resolve`, {
        method: "PATCH",
      });
      setSelectedIncident(updated);
      setMessage("Incident resolved.");
      await loadIncidents();

      if (updated.linkedPatrolId) {
        await loadTimeline(updated.linkedPatrolId);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  function exportCsv() {
    const rows = filteredAdminReport.map((row) => ({
      date: row.createdAt ? new Date(row.createdAt).toLocaleString() : "",
      patroller: row.user?.fullName || "",
      patrollerEmail: row.user?.email || "",
      vehicle: row.vehicle?.registration || "",
      vehicleMake: row.vehicle?.make || "",
      vehicleType: row.vehicle?.type || "",
      sector: row.sector || "",
      startKm: row.startKm ?? "",
      endKm: row.endKm ?? "",
      totalKm: row.totalKm ?? "",
      status: row.status || "",
      summary: row.summary || "",
      startTime: row.startTime || "",
      endTime: row.endTime || "",
    }));

    if (rows.length === 0) {
      setMessage("No filtered report rows to export.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute("download", `civitaswatch_patrol_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage("CSV export downloaded.");
  }

  function clearFilters() {
    setFilterPatroller("");
    setFilterVehicle("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  async function startPatrol() {
    try {
      setMessage("Starting patrol...");
      setEndedPatrolSummary(null);

      const data = await authedFetch("/patrols/start", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: startVehicleId,
          sector,
          startKm: Number(startKm),
          checklistId: latestChecklistId || null,
        }),
      });

      setActivePatrol(data);
      setIncidentLinkedPatrolId(data.id);
      setIncidentSector(data.sector || "Sector 1");
      setMessage("Patrol started.");
      await loadTimeline(data.id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function standDown() {
    if (!activePatrol) {
      setMessage("No active patrol.");
      return;
    }

    try {
      setMessage("Logging stand down...");
      await authedFetch("/patrol-events", {
        method: "POST",
        body: JSON.stringify({
          patrolId: activePatrol.id,
          type: "STAND_DOWN",
          incidentCode,
          description: standDownDescription,
          assistance,
          sceneActive,
        }),
      });

      setMessage("Stand down logged.");
      await loadTimeline(activePatrol.id);
      await loadIncidents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resumePatrol() {
    if (!activePatrol) {
      setMessage("No active patrol.");
      return;
    }

    try {
      setMessage("Logging resume...");
      await authedFetch("/patrol-events", {
        method: "POST",
        body: JSON.stringify({
          patrolId: activePatrol.id,
          type: "RESUME",
          description: resumeDescription,
          sceneActive: false,
        }),
      });

      setMessage("Patrol resumed.");
      await loadTimeline(activePatrol.id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function endPatrol() {
    if (!activePatrol) {
      setMessage("No active patrol.");
      return;
    }

    try {
      setMessage("Ending patrol...");
      const data = await authedFetch(`/patrols/${activePatrol.id}/end`, {
        method: "POST",
        body: JSON.stringify({
          endKm: Number(endKm),
          summary: endSummary,
        }),
      });

      setEndedPatrolSummary(data);
      setMessage(`Patrol ended. Total KM: ${data.totalKm}`);
      setActivePatrol(null);
      await loadTimeline(data.id);
      await loadIncidents();

      if (me?.role === "ADMIN") {
        await loadAdminReport();
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadMe();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadVehicles();
    loadLatestChecklist();
    loadActivePatrol();
    loadIncidents();

    if (me?.role === "ADMIN") {
      loadAdminReport();
    }
  }, [token, me?.role]);

  useEffect(() => {
    if (activePatrol?.id) {
      setIncidentLinkedPatrolId(activePatrol.id);
      if (activePatrol.sector) {
        setIncidentSector(activePatrol.sector);
      }
    }
  }, [activePatrol?.id, activePatrol?.sector]);

  return (
    <div className="container" style={{ maxWidth: "1200px" }}>
      <h1 style={titleStyle}>CivitasWatch Live</h1>
      <p style={messageStyle}>{message}</p>

      {!token ? (
        <div className="card">
          <h2>Login</h2>
          <div className="grid">
            <input
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
            />
            <button onClick={login}>Login</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Session</h2>
            <p>Token loaded: Yes</p>
            <p>Role: {me?.role || "-"}</p>
            <div className="row">
              <button
                className="secondary"
                onClick={() => {
                  loadIncidents();
                  if (selectedIncidentId) loadIncidentDetail(selectedIncidentId);
                  if (activePatrol?.id) loadTimeline(activePatrol.id);
                  if (me?.role === "ADMIN") loadAdminReport();
                }}
              >
                Refresh
              </button>
              <button className="secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="card">
            <h2>Workspace</h2>
            <div style={tabBarStyle}>
              <button
                type="button"
                onClick={() => setActiveView("incidents")}
                style={getTabStyle(activeView === "incidents")}
              >
                Incidents
              </button>
              <button
                type="button"
                onClick={() => setActiveView("patrols")}
                style={getTabStyle(activeView === "patrols")}
              >
                Patrols
              </button>
              <button
                type="button"
                onClick={() => setActiveView("reports")}
                style={getTabStyle(activeView === "reports")}
              >
                Reports
              </button>
            </div>
          </div>

          {activeView === "incidents" && (
            <div className="card">
              <h2>Incident Workspace</h2>
              <div className="grid grid-2">
                <div>
                  <h3>Create Incident</h3>
                  <input
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    placeholder="Incident title"
                  />
                  <textarea
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    placeholder="Description"
                  />
                  <input
                    value={incidentSector}
                    onChange={(e) => setIncidentSector(e.target.value)}
                    placeholder="Sector"
                  />
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                  <input
                    value={incidentLinkedPatrolId}
                    onChange={(e) => setIncidentLinkedPatrolId(e.target.value)}
                    placeholder="Linked patrol ID (optional)"
                  />
                  <input
                    type="datetime-local"
                    value={incidentOccurredAt}
                    onChange={(e) => setIncidentOccurredAt(e.target.value)}
                  />
                  <div className="row">
                    <button onClick={createIncident}>Create Incident</button>
                    {activePatrol?.id ? (
                      <button
                        className="secondary"
                        onClick={() => setIncidentLinkedPatrolId(activePatrol.id)}
                      >
                        Use Active Patrol
                      </button>
                    ) : null}
                  </div>
                  <p className="small">
                    Active patrol: {activePatrol?.id || "None"}
                  </p>
                </div>

                <div>
                  <h3>Selected Incident</h3>
                  {!selectedIncident ? (
                    <p className="small">Select an incident from the list below.</p>
                  ) : (
                    <>
                      <p><strong>Code:</strong> {selectedIncident.incidentCode}</p>
                      <p><strong>Title:</strong> {selectedIncident.title}</p>
                      <p><strong>Sector:</strong> {selectedIncident.sector}</p>
                      <p><strong>Severity:</strong> {selectedIncident.severity}</p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <StatusPill status={selectedIncident.status} />
                      </p>
                      <p><strong>Source:</strong> {selectedIncident.source}</p>
                      <p><strong>Reported By:</strong> {selectedIncident.createdBy?.fullName || "-"}</p>
                      <p><strong>Linked Patrol:</strong> {selectedIncident.linkedPatrolId || "-"}</p>
                      <p><strong>Reported At:</strong> {formatDate(selectedIncident.reportedAt)}</p>
                      <p><strong>Description:</strong> {selectedIncident.description || "-"}</p>

                      <div className="row">
                        <button
                          className="secondary"
                          onClick={() => updateIncidentStatus("OPEN")}
                        >
                          Mark Open
                        </button>
                        <button
                          className="secondary"
                          onClick={() => updateIncidentStatus("IN_PROGRESS")}
                        >
                          Mark In Progress
                        </button>
                        <button className="danger" onClick={resolveIncident}>
                          Resolve Incident
                        </button>
                      </div>

                      <div style={{ marginTop: "16px" }}>
                        <h3 style={{ marginBottom: "8px" }}>Linked Patrol Events</h3>
                        {selectedIncident.patrolEvents?.length ? (
                          [...selectedIncident.patrolEvents].map((event) => (
                            <div key={event.id} style={timelineItemStyle}>
                              <div style={getBadgeStyle(event.type)}>{formatType(event.type)}</div>
                              <div style={{ flex: 1 }}>
                                <div style={timelineTitleStyle}>
                                  {event.description || event.incidentCode || event.type}
                                </div>
                                <div style={timelineMetaStyle}>
                                  {formatDate(event.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="small">No linked patrol events yet.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <h3>Incident List</h3>
                {incidents.length === 0 ? (
                  <p className="small">No incidents found.</p>
                ) : (
                  <div className="grid">
                    {incidents.map((incident) => (
                      <button
                        key={incident.id}
                        type="button"
                        onClick={() => loadIncidentDetail(incident.id)}
                        style={{
                          ...incidentRowStyle,
                          border:
                            selectedIncidentId === incident.id
                              ? "2px solid #111827"
                              : "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 700 }}>
                              {incident.incidentCode} — {incident.title}
                            </div>
                            <div className="small">
                              {incident.sector} • {incident.severity} • {formatDate(incident.reportedAt)}
                            </div>
                          </div>
                          <StatusPill status={incident.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "patrols" && (
            <>
              <div className="card">
                <h2>Current Patrol</h2>
                {activePatrol ? (
                  <>
                    <p>Patrol ID: {activePatrol.id}</p>
                    <p>Status: {activePatrol.status}</p>
                    <p>Sector: {activePatrol.sector}</p>
                    <p>Start KM: {activePatrol.startKm}</p>
                  </>
                ) : (
                  <p>No active patrol.</p>
                )}
              </div>

              {me?.role !== "ADMIN" && (
                <>
                  <div className="card">
                    <h2>Start Patrol</h2>
                    <div className="grid">
                      <label>Vehicle</label>
                      <select
                        value={startVehicleId}
                        onChange={(e) => setStartVehicleId(e.target.value)}
                      >
                        <option value="">Select vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.registration} - {v.make} {v.type}
                          </option>
                        ))}
                      </select>
                      <input
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        placeholder="Sector"
                      />
                      <input
                        value={startKm}
                        onChange={(e) => setStartKm(e.target.value)}
                        placeholder="Start KM"
                      />
                      <p className="small">Latest checklist ID: {latestChecklistId || "None"}</p>
                      <button onClick={startPatrol} disabled={!!activePatrol}>
                        {activePatrol ? "Patrol Already Active" : "Start Patrol"}
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <h2>Stand Down</h2>
                    <input
                      value={incidentCode}
                      onChange={(e) => setIncidentCode(e.target.value)}
                      placeholder="Incident Code"
                    />
                    <textarea
                      value={standDownDescription}
                      onChange={(e) => setStandDownDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <select
                      value={assistance}
                      onChange={(e) => setAssistance(e.target.value)}
                    >
                      <option value="AMBO">AMBO</option>
                      <option value="SAPS">SAPS</option>
                      <option value="FIRE">FIRE</option>
                      <option value="BACKUP_PATROL">BACKUP_PATROL</option>
                      <option value="CONTROL_ROOM_SUPPORT">CONTROL_ROOM_SUPPORT</option>
                    </select>
                    <label className="small">
                      <input
                        type="checkbox"
                        checked={sceneActive}
                        onChange={(e) => setSceneActive(e.target.checked)}
                        style={{ width: "auto", marginRight: "8px" }}
                      />
                      Scene still active
                    </label>
                    <button onClick={standDown} disabled={!activePatrol}>
                      Stand Down
                    </button>
                  </div>

                  <div className="card">
                    <h2>Resume Patrol</h2>
                    <textarea
                      value={resumeDescription}
                      onChange={(e) => setResumeDescription(e.target.value)}
                      placeholder="Resume description"
                    />
                    <button className="secondary" onClick={resumePatrol} disabled={!activePatrol}>
                      Resume
                    </button>
                  </div>

                  <div className="card">
                    <h2>End Patrol</h2>
                    <input
                      value={endKm}
                      onChange={(e) => setEndKm(e.target.value)}
                      placeholder="End KM"
                    />
                    <textarea
                      value={endSummary}
                      onChange={(e) => setEndSummary(e.target.value)}
                      placeholder="Summary"
                    />
                    <button className="danger" onClick={endPatrol} disabled={!activePatrol}>
                      End Patrol
                    </button>
                  </div>

                  {endedPatrolSummary ? (
                    <div className="card">
                      <h2>Last Ended Patrol Summary</h2>
                      <p>Patrol ID: {endedPatrolSummary.id}</p>
                      <p>Start KM: {endedPatrolSummary.startKm ?? "-"}</p>
                      <p>End KM: {endedPatrolSummary.endKm ?? "-"}</p>
                      <p>Total KM: {endedPatrolSummary.totalKm ?? "-"}</p>
                      <p>Status: {endedPatrolSummary.status ?? "-"}</p>
                      <p>Summary: {endedPatrolSummary.summary || "-"}</p>
                    </div>
                  ) : null}
                </>
              )}

              <div className="card">
                <h2>Patrol Timeline</h2>
                {timeline.length === 0 ? (
                  <p className="small">No patrol events yet.</p>
                ) : (
                  <div>
                    {[...timeline].reverse().map((event) => (
                      <div key={event.id} style={timelineItemStyle}>
                        <div style={getBadgeStyle(event.type)}>{formatType(event.type)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={timelineTitleStyle}>{buildTimelineTitle(event)}</div>
                          <div style={timelineMetaStyle}>{formatDate(event.createdAt)}</div>
                          {event.description ? (
                            <div style={timelineDescStyle}>{event.description}</div>
                          ) : null}
                          {event.assistance ? (
                            <div style={timelineAssistStyle}>Assistance: {event.assistance}</div>
                          ) : null}
                          {typeof event.sceneActive === "boolean" ? (
                            <div style={timelineSceneStyle}>
                              Scene Active: {event.sceneActive ? "Yes" : "No"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeView === "reports" && (
            <div className="card">
              <h2>Reports</h2>
              <p className="small" style={{ marginBottom: "16px" }}>
                This view is structured for patrol summaries now, and ready for CPF-style incident summaries,
                shift handover reporting, and formal exports next.
              </p>

              <h3>Admin Patrol Report</h3>

              <div className="grid grid-2" style={{ marginTop: "12px" }}>
                <input
                  value={filterPatroller}
                  onChange={(e) => setFilterPatroller(e.target.value)}
                  placeholder="Filter by patroller"
                />
                <input
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                  placeholder="Filter by vehicle"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ACTIVE">ACTIVE</option>
                </select>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>

              <div className="row" style={{ marginTop: "12px" }}>
                <button className="secondary" onClick={loadAdminReport}>
                  Refresh Report
                </button>
                <button className="secondary" onClick={clearFilters}>
                  Clear Filters
                </button>
                <button onClick={exportCsv}>Export CSV</button>
              </div>

              <p className="small" style={{ marginTop: "12px" }}>
                Showing {filteredAdminReport.length} of {adminReport.length} patrol records
              </p>

              {filteredAdminReport.length === 0 ? (
                <p>No patrol records found.</p>
              ) : (
                <div style={{ overflowX: "auto", marginTop: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                    <thead>
                      <tr>
                        {["Date", "Patroller", "Vehicle", "Sector", "Start KM", "End KM", "Total KM", "Status", "Summary"].map((header) => (
                          <th key={header} style={thStyle}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminReport.map((row) => (
                        <tr key={row.id}>
                          <td style={tdStyle}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                          <td style={tdStyle}>{row.user?.fullName || "-"}</td>
                          <td style={tdStyle}>{row.vehicle?.registration || "-"}</td>
                          <td style={tdStyle}>{row.sector || "-"}</td>
                          <td style={tdStyle}>{String(row.startKm ?? "-")}</td>
                          <td style={tdStyle}>{String(row.endKm ?? "-")}</td>
                          <td style={tdStyle}>{String(row.totalKm ?? "-")}</td>
                          <td style={tdStyle}>{row.status || "-"}</td>
                          <td style={tdStyle}>{row.summary || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const background =
    status === "OPEN"
      ? "#dbeafe"
      : status === "IN_PROGRESS"
        ? "#fef3c7"
        : status === "RESOLVED"
          ? "#dcfce7"
          : "#e5e7eb";

  const color =
    status === "OPEN"
      ? "#1d4ed8"
      : status === "IN_PROGRESS"
        ? "#92400e"
        : status === "RESOLVED"
          ? "#166534"
          : "#374151";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background,
        color,
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}

function formatType(type) {
  return String(type || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function buildTimelineTitle(event) {
  if (event.type === "STAND_DOWN") {
    return event.incidentCode ? `Stand Down – ${event.incidentCode}` : "Stand Down";
  }

  if (event.type === "RESUME") {
    return "Resume Patrol";
  }

  if (event.type === "INCIDENT_REPORTED") {
    return event.incidentCode ? `Incident Reported – ${event.incidentCode}` : "Incident Reported";
  }

  if (event.type === "ON_SCENE") {
    return event.incidentCode ? `On Scene – ${event.incidentCode}` : "On Scene";
  }

  return formatType(event.type);
}

function getBadgeStyle(type) {
  const base = {
    minWidth: "140px",
    padding: "8px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center",
    marginRight: "16px",
  };

  if (type === "INCIDENT_REPORTED") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (type === "STAND_DOWN") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (type === "ON_SCENE") {
    return {
      ...base,
      background: "#fde68a",
      color: "#78350f",
    };
  }

  if (type === "RESUME") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

function getTabStyle(isActive) {
  return {
    width: "auto",
    minWidth: "140px",
    padding: "12px 18px",
    borderRadius: "10px",
    border: isActive ? "2px solid #111827" : "1px solid #d1d5db",
    background: isActive ? "#111827" : "#ffffff",
    color: isActive ? "#ffffff" : "#111827",
    fontWeight: 700,
    cursor: "pointer",
  };
}

const tabBarStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "48px",
  fontWeight: "bold",
  marginBottom: "10px",
};

const messageStyle = {
  fontWeight: "bold",
  color: "#444",
  fontSize: "18px",
  marginBottom: "20px",
};

const timelineItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "14px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  marginBottom: "12px",
  background: "#fafafa",
};

const timelineTitleStyle = {
  fontWeight: "bold",
  fontSize: "16px",
  marginBottom: "4px",
};

const timelineMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "6px",
};

const timelineDescStyle = {
  fontSize: "14px",
  marginBottom: "6px",
};

const timelineAssistStyle = {
  fontSize: "13px",
  color: "#1d4ed8",
  marginBottom: "4px",
};

const timelineSceneStyle = {
  fontSize: "13px",
  color: "#b91c1c",
};

const incidentRowStyle = {
  width: "100%",
  textAlign: "left",
  background: "#fff",
  color: "#111827",
  borderRadius: "12px",
  padding: "14px",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "10px",
  background: "#f9fafb",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "10px",
  verticalAlign: "top",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);