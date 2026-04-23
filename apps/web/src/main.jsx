import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = "http://localhost:4000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("cw_token") || "");
  const [loginEmail, setLoginEmail] = useState("patroller@civitaswatch.com");
  const [loginPassword, setLoginPassword] = useState("Password123!");
  const [message, setMessage] = useState("");

  const [me, setMe] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activePatrol, setActivePatrol] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [latestChecklistId, setLatestChecklistId] = useState("");
  const [endedPatrolSummary, setEndedPatrolSummary] = useState(null);
  const [adminReport, setAdminReport] = useState([]);

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

      const matchesPatroller = !filterPatroller ||
        patrollerName.toLowerCase().includes(filterPatroller.toLowerCase());

      const matchesVehicle = !filterVehicle ||
        vehicleReg.toLowerCase().includes(filterVehicle.toLowerCase());

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
    setStartVehicleId("");
    setEndedPatrolSummary(null);
    setAdminReport([]);
    setFilterPatroller("");
    setFilterVehicle("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
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

      setEndedPatrolSummary(data);
      setMessage(`Patrol ended. Total KM: ${data.totalKm}`);
      setActivePatrol(null);
      await loadTimeline(data.id);
      if (me?.role === "ADMIN") {
        await loadAdminReport();
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadVehicles();
    loadLatestChecklist();
    loadActivePatrol();
    if (me?.role === "ADMIN") {
      loadAdminReport();
    }
  }, [token, me?.role]);

  return React.createElement(
    "div",
    {
      style: {
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
      },
    },
    [
      React.createElement("h1", { key: "title", style: titleStyle }, "CivitasWatch Patrol"),
      React.createElement("p", { key: "msg", style: messageStyle }, message),

      !token
        ? React.createElement(
            "div",
            { key: "login", style: boxStyle },
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
                  React.createElement("p", { key: "tokenState" }, `Token loaded: ${token ? "Yes" : "No"}`),
                  React.createElement("p", { key: "role" }, `Role: ${me?.role || "-"}`),
                  React.createElement(
                    "button",
                    { key: "logout", onClick: logout, style: secondaryButtonStyle },
                    "Logout"
                  ),
                ]
              ),

              me?.role !== "ADMIN"
                ? React.createElement(
                    React.Fragment,
                    { key: "patroller-view" },
                    [
                      React.createElement(
                        "div",
                        { key: "startCard", style: boxStyle },
                        [
                          React.createElement("h2", { key: "h2" }, "Start Patrol"),
                          React.createElement("label", { key: "vehicleLabel" }, "Vehicle"),
                          React.createElement(
                            "select",
                            {
                              key: "vehicleSelect",
                              value: startVehicleId,
                              onChange: (e) => setStartVehicleId(e.target.value),
                              style: inputStyle,
                            },
                            [
                              React.createElement("option", { key: "blank", value: "" }, "Select vehicle"),
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
                                  React.createElement("p", { key: "id" }, `Patrol ID: ${activePatrol.id}`),
                                  React.createElement("p", { key: "status" }, `Status: ${activePatrol.status}`),
                                  React.createElement("p", { key: "sector" }, `Sector: ${activePatrol.sector}`),
                                  React.createElement("p", { key: "km" }, `Start KM: ${activePatrol.startKm}`),
                                ]
                              )
                            : React.createElement("p", { key: "none" }, "No active patrol."),
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
                              React.createElement("option", { key: "BACKUP_PATROL", value: "BACKUP_PATROL" }, "BACKUP_PATROL"),
                              React.createElement("option", { key: "CONTROL_ROOM_SUPPORT", value: "CONTROL_ROOM_SUPPORT" }, "CONTROL_ROOM_SUPPORT"),
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

                      endedPatrolSummary
                        ? React.createElement(
                            "div",
                            { key: "endedSummaryCard", style: boxStyle },
                            [
                              React.createElement("h2", { key: "h2" }, "Last Ended Patrol Summary"),
                              React.createElement("p", { key: "patrolId" }, `Patrol ID: ${endedPatrolSummary.id}`),
                              React.createElement("p", { key: "startKm" }, `Start KM: ${endedPatrolSummary.startKm ?? "-"}`),
                              React.createElement("p", { key: "endKm" }, `End KM: ${endedPatrolSummary.endKm ?? "-"}`),
                              React.createElement("p", { key: "totalKm" }, `Total KM: ${endedPatrolSummary.totalKm ?? "-"}`),
                              React.createElement("p", { key: "status" }, `Status: ${endedPatrolSummary.status ?? "-"}`),
                              React.createElement("p", { key: "summary" }, `Summary: ${endedPatrolSummary.summary || "-"}`),
                            ]
                          )
                        : null,
                    ]
                  )
                : React.createElement(
                    "div",
                    { key: "adminReportCard", style: boxStyle },
                    [
                      React.createElement("h2", { key: "h2" }, "Admin Patrol Report"),

                      React.createElement(
                        "div",
                        { key: "filters", style: filterGridStyle },
                        [
                          React.createElement("input", {
                            key: "filterPatroller",
                            value: filterPatroller,
                            onChange: (e) => setFilterPatroller(e.target.value),
                            placeholder: "Filter by patroller",
                            style: inputStyle,
                          }),
                          React.createElement("input", {
                            key: "filterVehicle",
                            value: filterVehicle,
                            onChange: (e) => setFilterVehicle(e.target.value),
                            placeholder: "Filter by vehicle",
                            style: inputStyle,
                          }),
                          React.createElement(
                            "select",
                            {
                              key: "filterStatus",
                              value: filterStatus,
                              onChange: (e) => setFilterStatus(e.target.value),
                              style: inputStyle,
                            },
                            [
                              React.createElement("option", { key: "all", value: "" }, "All statuses"),
                              React.createElement("option", { key: "completed", value: "COMPLETED" }, "COMPLETED"),
                              React.createElement("option", { key: "active", value: "ACTIVE" }, "ACTIVE"),
                            ]
                          ),
                          React.createElement("input", {
                            key: "filterDateFrom",
                            type: "date",
                            value: filterDateFrom,
                            onChange: (e) => setFilterDateFrom(e.target.value),
                            style: inputStyle,
                          }),
                          React.createElement("input", {
                            key: "filterDateTo",
                            type: "date",
                            value: filterDateTo,
                            onChange: (e) => setFilterDateTo(e.target.value),
                            style: inputStyle,
                          }),
                        ]
                      ),

                      React.createElement(
                        "div",
                        { key: "adminButtons", style: buttonRowStyle },
                        [
                          React.createElement(
                            "button",
                            {
                              key: "refreshReport",
                              onClick: loadAdminReport,
                              style: secondaryButtonStyle,
                            },
                            "Refresh Report"
                          ),
                          React.createElement(
                            "button",
                            {
                              key: "clearFilters",
                              onClick: clearFilters,
                              style: secondaryButtonStyle,
                            },
                            "Clear Filters"
                          ),
                          React.createElement(
                            "button",
                            {
                              key: "exportCsv",
                              onClick: exportCsv,
                              style: buttonStyle,
                            },
                            "Export CSV"
                          ),
                        ]
                      ),

                      React.createElement(
                        "p",
                        { key: "reportCount", style: smallTextStyle },
                        `Showing ${filteredAdminReport.length} of ${adminReport.length} patrol records`
                      ),

                      filteredAdminReport.length === 0
                        ? React.createElement("p", { key: "empty" }, "No patrol records found.")
                        : React.createElement(
                            "div",
                            { key: "tableWrap", style: tableWrapStyle },
                            React.createElement(
                              "table",
                              { style: tableStyle },
                              [
                                React.createElement(
                                  "thead",
                                  { key: "thead" },
                                  React.createElement(
                                    "tr",
                                    null,
                                    [
                                      "Date",
                                      "Patroller",
                                      "Vehicle",
                                      "Sector",
                                      "Start KM",
                                      "End KM",
                                      "Total KM",
                                      "Status",
                                      "Summary",
                                    ].map((header) =>
                                      React.createElement("th", { key: header, style: thStyle }, header)
                                    )
                                  )
                                ),
                                React.createElement(
                                  "tbody",
                                  { key: "tbody" },
                                  filteredAdminReport.map((row) =>
                                    React.createElement(
                                      "tr",
                                      { key: row.id },
                                      [
                                        React.createElement("td", { style: tdStyle, key: "date" }, new Date(row.createdAt).toLocaleString()),
                                        React.createElement("td", { style: tdStyle, key: "user" }, row.user?.fullName || "-"),
                                        React.createElement("td", { style: tdStyle, key: "vehicle" }, row.vehicle?.registration || "-"),
                                        React.createElement("td", { style: tdStyle, key: "sector" }, row.sector || "-"),
                                        React.createElement("td", { style: tdStyle, key: "startKm" }, String(row.startKm ?? "-")),
                                        React.createElement("td", { style: tdStyle, key: "endKm" }, String(row.endKm ?? "-")),
                                        React.createElement("td", { style: tdStyle, key: "totalKm" }, String(row.totalKm ?? "-")),
                                        React.createElement("td", { style: tdStyle, key: "status" }, row.status || "-"),
                                        React.createElement("td", { style: tdStyle, key: "summary" }, row.summary || "-"),
                                      ]
                                    )
                                  )
                                ),
                              ]
                            )
                          ),
                    ]
                  ),

              React.createElement(
                "div",
                { key: "timelineCard", style: boxStyle },
                [
                  React.createElement("h2", { key: "h2" }, "Patrol Timeline"),
                  timeline.length === 0
                    ? React.createElement("p", { key: "empty", style: smallTextStyle }, "No patrol events yet.")
                    : React.createElement(
                        "div",
                        { key: "timelineList" },
                        [...timeline].reverse().map((event) =>
                          React.createElement(
                            "div",
                            { key: event.id, style: timelineItemStyle },
                            [
                              React.createElement(
                                "div",
                                {
                                  key: "badge",
                                  style: getBadgeStyle(event.type),
                                },
                                formatType(event.type)
                              ),
                              React.createElement(
                                "div",
                                { key: "content", style: { flex: 1 } },
                                [
                                  React.createElement(
                                    "div",
                                    { key: "line1", style: timelineTitleStyle },
                                    buildTimelineTitle(event)
                                  ),
                                  React.createElement(
                                    "div",
                                    { key: "line2", style: timelineMetaStyle },
                                    new Date(event.createdAt).toLocaleString()
                                  ),
                                  event.description
                                    ? React.createElement(
                                        "div",
                                        { key: "desc", style: timelineDescStyle },
                                        event.description
                                      )
                                    : null,
                                  event.assistance
                                    ? React.createElement(
                                        "div",
                                        { key: "assist", style: timelineAssistStyle },
                                        `Assistance: ${event.assistance}`
                                      )
                                    : null,
                                  typeof event.sceneActive === "boolean"
                                    ? React.createElement(
                                        "div",
                                        { key: "scene", style: timelineSceneStyle },
                                        `Scene Active: ${event.sceneActive ? "Yes" : "No"}`
                                      )
                                    : null,
                                ]
                              ),
                            ]
                          )
                        )
                      ),
                ]
              ),
            ]
          ),
    ]
  );
}

function formatType(type) {
  return type.replaceAll("_", " ");
}

function buildTimelineTitle(event) {
  if (event.type === "STAND_DOWN") {
    return event.incidentCode ? `Stand Down – ${event.incidentCode}` : "Stand Down";
  }

  if (event.type === "RESUME") {
    return "Resume Patrol";
  }

  return formatType(event.type);
}

function getBadgeStyle(type) {
  const base = {
    minWidth: "120px",
    padding: "8px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center",
    marginRight: "16px",
  };

  if (type === "STAND_DOWN") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
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

const titleStyle = {
  fontSize: "56px",
  fontWeight: "bold",
  marginBottom: "10px",
};

const messageStyle = {
  fontWeight: "bold",
  color: "#444",
  fontSize: "20px",
  marginBottom: "20px",
};

const boxStyle = {
  border: "1px solid #ddd",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "22px",
  background: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "14px",
  fontSize: "14px",
  borderRadius: "8px",
  border: "1px solid #999",
};

const textAreaStyle = {
  width: "100%",
  minHeight: "90px",
  padding: "14px",
  marginBottom: "14px",
  fontSize: "14px",
  borderRadius: "8px",
  border: "1px solid #999",
};

const buttonStyle = {
  padding: "12px 18px",
  fontSize: "14px",
  cursor: "pointer",
  marginRight: "8px",
  borderRadius: "8px",
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#e5e7eb",
};

const dangerButtonStyle = {
  ...buttonStyle,
  background: "#fecaca",
};

const smallTextStyle = {
  fontSize: "14px",
  color: "#444",
  display: "block",
  marginBottom: "10px",
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

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "6px",
  marginBottom: "8px",
};

const tableWrapStyle = {
  overflowX: "auto",
  marginTop: "16px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1000px",
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
  React.createElement(App)
);