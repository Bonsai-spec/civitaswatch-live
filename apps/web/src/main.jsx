import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

const API = "http://localhost:4000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("cw_token") || "");
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [selected, setSelected] = useState(null);
  const [screen, setScreen] = useState("Dashboard");

  const [loginEmail, setLoginEmail] = useState("admin2@civitaswatch.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    sector: "Sector 1",
    severity: "HIGH",
    linkedPatrolId: "",
  });

  const counts = useMemo(() => {
    return {
      total: incidents.length,
      open: incidents.filter((i) => i.status === "OPEN").length,
      progress: incidents.filter((i) => i.status === "IN_PROGRESS").length,
      resolved: incidents.filter((i) => i.status === "RESOLVED").length,
      closed: incidents.filter((i) => i.status === "CLOSED").length,
      activePatrols: patrols.filter((p) => p.status === "ACTIVE").length,
    };
  }, [incidents, patrols]);

  async function api(path, options = {}, overrideToken = token) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(overrideToken ? { Authorization: `Bearer ${overrideToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function login() {
    try {
      setMessage("Logging in...");
      const data = await api(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        },
        ""
      );

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("cw_token", data.token);
      setMessage("Logged in.");

      await loadAll(data.token);
    } catch (error) {
      setMessage(error.message || "Invalid credentials");
    }
  }

  function logout() {
    localStorage.removeItem("cw_token");
    setToken("");
    setUser(null);
    setIncidents([]);
    setPatrols([]);
    setSelected(null);
    setMessage("Logged out.");
  }

  async function loadAll(tok = token) {
    try {
      const [incidentData, patrolData] = await Promise.all([
        api("/incidents", {}, tok),
        api("/patrols/report/all", {}, tok),
      ]);

      setIncidents(incidentData);
      setPatrols(patrolData);
      setMessage("Live data refreshed.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadIncident(id) {
    try {
      const data = await api(`/incidents/${id}`);
      setSelected(data);
      setScreen("Incidents");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createIncident() {
    try {
      if (!form.title.trim()) {
        setMessage("Title is required.");
        return;
      }

      const created = await api("/incidents/report", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          sector: form.sector,
          severity: form.severity,
          linkedPatrolId: form.linkedPatrolId || null,
          source: form.linkedPatrolId ? "PATROL" : "CONTROL_ROOM",
        }),
      });

      setForm({
        title: "",
        description: "",
        sector: "Sector 1",
        severity: "HIGH",
        linkedPatrolId: "",
      });

      setSelected(created);
      await loadAll();
      setMessage("Incident created and linked if patrol was selected.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateIncident() {
    if (!selected) return;

    try {
      const updated = await api(`/incidents/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: selected.title,
          description: selected.description || null,
          sector: selected.sector,
          severity: selected.severity,
          linkedPatrolId: selected.linkedPatrolId || null,
        }),
      });

      setSelected(updated);
      await loadAll();
      setMessage("Incident updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function applyStatus(status) {
    if (!selected) return;

    try {
      const updated = await api(`/incidents/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setSelected(updated);
      await loadAll();
      setMessage(`Incident marked ${status}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function closeIncident() {
    if (!selected) return;

    try {
      const updated = await api(`/incidents/${selected.id}/close`, {
        method: "PATCH",
      });

      setSelected(updated);
      await loadAll();
      setMessage("Incident closed.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createPatrolEvent(type) {
    if (!selected?.linkedPatrolId) {
      setMessage("This incident is not linked to a patrol.");
      return;
    }

    try {
      await api("/patrol-events", {
        method: "POST",
        body: JSON.stringify({
          patrolId: selected.linkedPatrolId,
          incidentId: selected.id,
          type,
          incidentCode: selected.incidentCode,
          description:
            type === "ON_SCENE"
              ? `Patrol on scene: ${selected.title}`
              : `Patrol stood down: ${selected.title}`,
          assistance: type === "ON_SCENE" ? "RESPONDING" : "COMPLETED",
          sceneActive: type === "ON_SCENE",
        }),
      });

      await loadIncident(selected.id);
      await loadAll();
      setMessage(type === "ON_SCENE" ? "Patrol marked on scene." : "Patrol stood down.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (token) loadAll(token);
  }, []);

  if (!token) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>CivitasWatch</h1>
          <p style={styles.loginSubtitle}>Control Room / Admin Portal</p>

          <input
            style={styles.input}
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />

          <button style={styles.button} onClick={login}>
            Login
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brandTitle}>CivitasWatch</div>
          <div style={styles.brandSub}>Control Room</div>
        </div>

        {["Dashboard", "Incidents", "Patrols"].map((item) => (
          <button
            key={item}
            style={{
              ...styles.navButton,
              ...(screen === item ? styles.navButtonActive : {}),
            }}
            onClick={() => setScreen(item)}
          >
            {item}
          </button>
        ))}

        <div style={styles.sidebarFooter}>
          <button style={styles.sidebarButton} onClick={() => loadAll()}>
            Refresh
          </button>
          <button style={styles.sidebarButton} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>{screen}</h1>
            {message && <div style={styles.message}>{message}</div>}
          </div>
          <div style={styles.userPill}>{user?.role || "ADMIN"}</div>
        </div>

        {screen === "Dashboard" && (
          <>
            <div style={styles.stats}>
              <Stat label="Total Incidents" value={counts.total} />
              <Stat label="Open" value={counts.open} />
              <Stat label="In Progress" value={counts.progress} />
              <Stat label="Resolved" value={counts.resolved} />
              <Stat label="Closed" value={counts.closed} />
              <Stat label="Active Patrols" value={counts.activePatrols} />
            </div>

            <div style={styles.grid}>
              <Card title="Active Patrols">
                {patrols.filter((p) => p.status === "ACTIVE").length === 0 ? (
                  <p style={styles.small}>No active patrols.</p>
                ) : (
                  patrols
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <div key={p.id} style={styles.miniRow}>
                        <strong>{p.user?.fullName || "Patroller"}</strong>
                        <span>{p.sector}</span>
                        <span>{p.vehicle?.registration || "No vehicle"}</span>
                      </div>
                    ))
                )}
              </Card>

              <Card title="Open / Active Incidents">
                {incidents
                  .filter((i) => i.status !== "CLOSED" && i.status !== "RESOLVED")
                  .map((i) => (
                    <button
                      key={i.id}
                      style={styles.incidentButton}
                      onClick={() => loadIncident(i.id)}
                    >
                      <strong>{i.incidentCode}</strong>
                      <span>{i.title}</span>
                      <small>{i.status}</small>
                    </button>
                  ))}
              </Card>
            </div>
          </>
        )}

        {screen === "Incidents" && (
          <>
            <div style={styles.grid}>
              <Card title="Create Incident">
                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <textarea
                  style={styles.textarea}
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div style={styles.formRow}>
                  <select
                    style={styles.select}
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  >
                    <option>Sector 1</option>
                    <option>Sector 2</option>
                    <option>Sector 3</option>
                  </select>

                  <select
                    style={styles.select}
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  >
                    <option>LOW</option>
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                  </select>
                </div>

                <select
                  style={styles.selectFull}
                  value={form.linkedPatrolId}
                  onChange={(e) => setForm({ ...form, linkedPatrolId: e.target.value })}
                >
                  <option value="">No linked patrol</option>
                  {patrols
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.user?.fullName || "Patroller"} — {p.sector} —{" "}
                        {p.vehicle?.registration || "No vehicle"}
                      </option>
                    ))}
                </select>

                <button style={styles.button} onClick={createIncident}>
                  Create Incident
                </button>
              </Card>

              <Card title="Selected Incident">
                {!selected ? (
                  <p style={styles.small}>Select an incident from the register.</p>
                ) : (
                  <>
                    <div style={styles.incidentCode}>{selected.incidentCode}</div>

                    <input
                      style={styles.input}
                      value={selected.title || ""}
                      onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                    />

                    <textarea
                      style={styles.textarea}
                      value={selected.description || ""}
                      onChange={(e) =>
                        setSelected({ ...selected, description: e.target.value })
                      }
                    />

                    <div style={styles.formRow}>
                      <select
                        style={styles.select}
                        value={selected.sector || "Sector 1"}
                        onChange={(e) =>
                          setSelected({ ...selected, sector: e.target.value })
                        }
                      >
                        <option>Sector 1</option>
                        <option>Sector 2</option>
                        <option>Sector 3</option>
                      </select>

                      <select
                        style={styles.select}
                        value={selected.severity || "HIGH"}
                        onChange={(e) =>
                          setSelected({ ...selected, severity: e.target.value })
                        }
                      >
                        <option>LOW</option>
                        <option>MEDIUM</option>
                        <option>HIGH</option>
                        <option>CRITICAL</option>
                      </select>
                    </div>

                    <select
                      style={styles.selectFull}
                      value={selected.linkedPatrolId || ""}
                      onChange={(e) =>
                        setSelected({ ...selected, linkedPatrolId: e.target.value })
                      }
                    >
                      <option value="">No linked patrol</option>
                      {patrols
                        .filter((p) => p.status === "ACTIVE")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.user?.fullName || "Patroller"} — {p.sector} —{" "}
                            {p.vehicle?.registration || "No vehicle"}
                          </option>
                        ))}
                    </select>

                    <div style={styles.actionRow}>
                      <button style={styles.button} onClick={updateIncident}>
                        Save
                      </button>
                      <button
                        style={styles.secondaryButton}
                        onClick={() => applyStatus("IN_PROGRESS")}
                      >
                        In Progress
                      </button>
                      <button
                        style={styles.secondaryButton}
                        onClick={() => applyStatus("RESOLVED")}
                      >
                        Resolve
                      </button>
                      <button style={styles.dangerButton} onClick={closeIncident}>
                        Close
                      </button>
                    </div>

                    <div style={styles.actionRow}>
                      <button
                        style={styles.secondaryButton}
                        onClick={() => createPatrolEvent("ON_SCENE")}
                      >
                        Patrol On Scene
                      </button>
                      <button
                        style={styles.secondaryButton}
                        onClick={() => createPatrolEvent("STAND_DOWN")}
                      >
                        Patrol Stand Down
                      </button>
                    </div>

                    <h4>Linked Patrol Events</h4>
                    {(selected.patrolEvents || []).length === 0 ? (
                      <p style={styles.small}>No linked patrol events yet.</p>
                    ) : (
                      selected.patrolEvents.map((event) => (
                        <div key={event.id} style={styles.eventRow}>
                          <strong>{event.type}</strong>
                          <span>{event.description || "-"}</span>
                          <small>{new Date(event.createdAt).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </>
                )}
              </Card>
            </div>

            <Card title="Incident Register">
              <div style={styles.headerRow}>
                <div>Code</div>
                <div>Title</div>
                <div>Sector</div>
                <div>Severity</div>
                <div>Status</div>
              </div>

              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  style={{
                    ...styles.row,
                    ...(selected?.id === incident.id ? styles.selectedRow : {}),
                  }}
                  onClick={() => loadIncident(incident.id)}
                >
                  <div>{incident.incidentCode}</div>
                  <div>{incident.title}</div>
                  <div>{incident.sector}</div>
                  <div>{incident.severity}</div>
                  <div>{incident.status}</div>
                </div>
              ))}
            </Card>
          </>
        )}

        {screen === "Patrols" && (
          <Card title="Patrol Register">
            <div style={styles.patrolHeader}>
              <div>Patroller</div>
              <div>Vehicle</div>
              <div>Sector</div>
              <div>Status</div>
              <div>Start</div>
              <div>End</div>
            </div>

            {patrols.map((p) => (
              <div key={p.id} style={styles.patrolRow}>
                <div>{p.user?.fullName || "-"}</div>
                <div>{p.vehicle?.registration || "-"}</div>
                <div>{p.sector || "-"}</div>
                <div>{p.status}</div>
                <div>{p.startTime ? new Date(p.startTime).toLocaleString() : "-"}</div>
                <div>{p.endTime ? new Date(p.endTime).toLocaleString() : "-"}</div>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },
  loginCard: {
    width: 520,
    background: "#fff",
    padding: 34,
    borderRadius: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  loginTitle: { fontSize: 42, margin: "0 0 8px" },
  loginSubtitle: { color: "#475569", fontSize: 20, marginBottom: 18 },
  sidebar: {
    width: 280,
    background: "#0f172a",
    color: "#fff",
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  brandTitle: { fontSize: 26, fontWeight: 700 },
  brandSub: { fontSize: 13, color: "#94a3b8", marginBottom: 16 },
  navButton: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #243145",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: 700,
  },
  navButtonActive: { background: "#1e293b", color: "#fff" },
  sidebarFooter: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sidebarButton: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #243145",
    background: "#111c2f",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "left",
  },
  main: { flex: 1, padding: 30 },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  pageTitle: { margin: 0, fontSize: 36 },
  userPill: {
    background: "#fff",
    border: "1px solid #dbe3ef",
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 700,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  stat: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  statLabel: { color: "#64748b", fontSize: 13, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 800 },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1fr)",
    gap: 20,
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  cardTitle: { marginTop: 0 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginBottom: 10,
    fontSize: 15,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginBottom: 10,
    fontSize: 15,
    minHeight: 86,
    resize: "vertical",
  },
  select: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginBottom: 10,
    fontSize: 15,
    background: "#fff",
  },
  selectFull: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginBottom: 10,
    fontSize: 15,
    background: "#fff",
  },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  button: {
    padding: "11px 16px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    padding: "11px 16px",
    borderRadius: 10,
    border: "none",
    background: "#475569",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    padding: "11px 16px",
    borderRadius: 10,
    border: "none",
    background: "#991b1b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  actionRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  incidentCode: { fontWeight: 800, marginBottom: 10, color: "#334155" },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "230px 1fr 130px 130px 130px",
    padding: "12px 10px",
    fontWeight: 700,
    borderBottom: "2px solid #dbe3ef",
    color: "#475569",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "230px 1fr 130px 130px 130px",
    padding: "13px 10px",
    borderBottom: "1px solid #e5e7eb",
    cursor: "pointer",
    alignItems: "center",
    fontSize: 14,
  },
  selectedRow: { background: "#eff6ff" },
  patrolHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 150px 130px 120px 220px 220px",
    padding: "12px 10px",
    fontWeight: 700,
    borderBottom: "2px solid #dbe3ef",
    color: "#475569",
  },
  patrolRow: {
    display: "grid",
    gridTemplateColumns: "1fr 150px 130px 120px 220px 220px",
    padding: "13px 10px",
    borderBottom: "1px solid #e5e7eb",
    alignItems: "center",
    fontSize: 14,
  },
  miniRow: {
    display: "grid",
    gridTemplateColumns: "1fr 120px 140px",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  incidentButton: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "180px 1fr 110px",
    gap: 10,
    alignItems: "center",
    padding: "12px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 8,
    textAlign: "left",
  },
  eventRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 180px",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  small: { color: "#64748b" },
  message: { color: "#475569", marginTop: 8 },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);