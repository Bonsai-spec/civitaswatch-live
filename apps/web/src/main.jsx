import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = "http://localhost:4000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("cw_token") || "");
  const [loginEmail, setLoginEmail] = useState("patroller@civitaswatch.com");
  const [loginPassword, setLoginPassword] = useState("Password123!");
  const [message, setMessage] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [activePatrol, setActivePatrol] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [latestChecklistId, setLatestChecklistId] = useState("");

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

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

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
      localStorage.setItem("cw_token", data.token);
      setMessage("Logged in.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("cw_token");
    setToken("");
    setVehicles([]);
    setActivePatrol(null);
    setTimeline([]);
    setLatestChecklistId("");
    setStartVehicleId("");
    setMessage("Logged out.");
  }

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
      if (data && data.id) {
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
      if (data && data.id) {
        await loadTimeline(data.id);
      } else {
        setTimeline([]);
      }
    } catch (error) {
      setMessage(error.message);
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

  async function startPatrol() {
    try {
      setMessage("Starting patrol...");
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

      setMessage(`Patrol ended. Total KM: ${data.totalKm}`);
      setActivePatrol(null);
      setTimeline([]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadVehicles();
    loadLatestChecklist();
    loadActivePatrol();
  }, [token]);

  return React.createElement(
    "div",
    {
      style: {
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
      },
    },
    [
      React.createElement("h1", { key: "title" }, "CivitasWatch Patrol"),
      React.createElement(
        "p",
        { key: "msg", style: { fontWeight: "bold", color: "#444" } },
        message
      ),

      !token
        ? React.createElement(
            "div",
            {
              key: "login",
              style: boxStyle,
            },
            [
              React.createElement("h2", { key: "h2" }, "Login"),
              React.createElement("input", {
                key: "email",
                value: loginEmail,
                onChange: (e) => setLoginEmail(e.target.value),
                placeholder: "Email",
                style: inputStyle,
              }),
              React.createElement("input", {
                key: "password",
                type: "password",
                value: loginPassword,
                onChange: (e) => setLoginPassword(e.target.value),
                placeholder: "Password",
                style: inputStyle,
              }),
              React.createElement(
                "button",
                { key: "loginBtn", onClick: login, style: buttonStyle },
                "Login"
              ),
            ]
          )
        : React.createElement(
            React.Fragment,
            { key: "app" },
            [
              React.createElement(
                "div",
                { key: "topbar", style: boxStyle },
                [
                  React.createElement("h2", { key: "session" }, "Session"),
                  React.createElement(
                    "p",
                    { key: "tokenState" },
                    `Token loaded: ${token ? "Yes" : "No"}`
                  ),
                  React.createElement(
                    "button",
                    { key: "logout", onClick: logout, style: secondaryButtonStyle },
                    "Logout"
                  ),
                ]
              ),

              React.createElement(
                "div",
                { key: "startCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Start Patrol"),
                  React.createElement(
                    "label",
                    { key: "vehicleLabel" },
                    "Vehicle"
                  ),
                  React.createElement(
                    "select",
                    {
                      key: "vehicleSelect",
                      value: startVehicleId,
                      onChange: (e) => setStartVehicleId(e.target.value),
                      style: inputStyle,
                    },
                    [
                      React.createElement(
                        "option",
                        { key: "blank", value: "" },
                        "Select vehicle"
                      ),
                      ...vehicles.map((v) =>
                        React.createElement(
                          "option",
                          { key: v.id, value: v.id },
                          `${v.registration} - ${v.make} ${v.type}`
                        )
                      ),
                    ]
                  ),
                  React.createElement("input", {
                    key: "sector",
                    value: sector,
                    onChange: (e) => setSector(e.target.value),
                    placeholder: "Sector",
                    style: inputStyle,
                  }),
                  React.createElement("input", {
                    key: "startKm",
                    value: startKm,
                    onChange: (e) => setStartKm(e.target.value),
                    placeholder: "Start KM",
                    style: inputStyle,
                  }),
                  React.createElement(
                    "p",
                    { key: "checklist", style: smallTextStyle },
                    `Latest checklist ID: ${latestChecklistId || "None"}`
                  ),
                  React.createElement(
                    "button",
                    {
                      key: "startBtn",
                      onClick: startPatrol,
                      style: buttonStyle,
                      disabled: !!activePatrol,
                    },
                    activePatrol ? "Patrol Already Active" : "Start Patrol"
                  ),
                ]
              ),

              React.createElement(
                "div",
                { key: "activeCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Current Patrol"),
                  activePatrol
                    ? React.createElement(
                        "div",
                        { key: "activeData" },
                        [
                          React.createElement(
                            "p",
                            { key: "id" },
                            `Patrol ID: ${activePatrol.id}`
                          ),
                          React.createElement(
                            "p",
                            { key: "status" },
                            `Status: ${activePatrol.status}`
                          ),
                          React.createElement(
                            "p",
                            { key: "sector" },
                            `Sector: ${activePatrol.sector}`
                          ),
                          React.createElement(
                            "p",
                            { key: "km" },
                            `Start KM: ${activePatrol.startKm}`
                          ),
                        ]
                      )
                    : React.createElement(
                        "p",
                        { key: "none" },
                        "No active patrol."
                      ),
                ]
              ),

              React.createElement(
                "div",
                { key: "standDownCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Stand Down"),
                  React.createElement("input", {
                    key: "incidentCode",
                    value: incidentCode,
                    onChange: (e) => setIncidentCode(e.target.value),
                    placeholder: "Incident Code",
                    style: inputStyle,
                  }),
                  React.createElement("textarea", {
                    key: "standDownDesc",
                    value: standDownDescription,
                    onChange: (e) => setStandDownDescription(e.target.value),
                    placeholder: "Description",
                    style: textAreaStyle,
                  }),
                  React.createElement(
                    "select",
                    {
                      key: "assistance",
                      value: assistance,
                      onChange: (e) => setAssistance(e.target.value),
                      style: inputStyle,
                    },
                    [
                      React.createElement("option", { key: "AMBO", value: "AMBO" }, "AMBO"),
                      React.createElement("option", { key: "SAPS", value: "SAPS" }, "SAPS"),
                      React.createElement("option", { key: "FIRE", value: "FIRE" }, "FIRE"),
                      React.createElement(
                        "option",
                        { key: "BACKUP_PATROL", value: "BACKUP_PATROL" },
                        "BACKUP_PATROL"
                      ),
                      React.createElement(
                        "option",
                        { key: "CONTROL_ROOM_SUPPORT", value: "CONTROL_ROOM_SUPPORT" },
                        "CONTROL_ROOM_SUPPORT"
                      ),
                    ]
                  ),
                  React.createElement(
                    "label",
                    { key: "sceneLabel", style: smallTextStyle },
                    [
                      React.createElement("input", {
                        key: "sceneCheckbox",
                        type: "checkbox",
                        checked: sceneActive,
                        onChange: (e) => setSceneActive(e.target.checked),
                        style: { marginRight: "8px" },
                      }),
                      "Scene still active",
                    ]
                  ),
                  React.createElement(
                    "button",
                    {
                      key: "standDownBtn",
                      onClick: standDown,
                      style: buttonStyle,
                      disabled: !activePatrol,
                    },
                    "Stand Down"
                  ),
                ]
              ),

              React.createElement(
                "div",
                { key: "resumeCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Resume Patrol"),
                  React.createElement("textarea", {
                    key: "resumeDesc",
                    value: resumeDescription,
                    onChange: (e) => setResumeDescription(e.target.value),
                    placeholder: "Resume description",
                    style: textAreaStyle,
                  }),
                  React.createElement(
                    "button",
                    {
                      key: "resumeBtn",
                      onClick: resumePatrol,
                      style: secondaryButtonStyle,
                      disabled: !activePatrol,
                    },
                    "Resume"
                  ),
                ]
              ),

              React.createElement(
                "div",
                { key: "endCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "End Patrol"),
                  React.createElement("input", {
                    key: "endKm",
                    value: endKm,
                    onChange: (e) => setEndKm(e.target.value),
                    placeholder: "End KM",
                    style: inputStyle,
                  }),
                  React.createElement("textarea", {
                    key: "endSummary",
                    value: endSummary,
                    onChange: (e) => setEndSummary(e.target.value),
                    placeholder: "Summary",
                    style: textAreaStyle,
                  }),
                  React.createElement(
                    "button",
                    {
                      key: "endBtn",
                      onClick: endPatrol,
                      style: dangerButtonStyle,
                      disabled: !activePatrol,
                    },
                    "End Patrol"
                  ),
                ]
              ),

              React.createElement(
                "div",
                { key: "timelineCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Patrol Timeline"),
                  React.createElement(
                    "pre",
                    { key: "timelinePre", style: preStyle },
                    JSON.stringify(timeline, null, 2)
                  ),
                ]
              ),
            ]
          ),
    ]
  );
}

const boxStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
  background: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  fontSize: "14px",
};

const textAreaStyle = {
  width: "100%",
  minHeight: "90px",
  padding: "10px",
  marginBottom: "10px",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "10px 14px",
  fontSize: "14px",
  cursor: "pointer",
  marginRight: "8px",
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#e5e7eb",
};

const dangerButtonStyle = {
  ...buttonStyle,
  background: "#fca5a5",
};

const smallTextStyle = {
  fontSize: "14px",
  color: "#444",
  display: "block",
  marginBottom: "10px",
};

const preStyle = {
  background: "#111827",
  color: "#f9fafb",
  padding: "12px",
  borderRadius: "8px",
  overflow: "auto",
  fontSize: "12px",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(App)
);