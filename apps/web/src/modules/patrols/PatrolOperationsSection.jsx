import React, { useEffect, useMemo, useState } from "react";
import {
  MEMBER_ENDPOINTS,
  PATROL_ENDPOINTS,
  VEHICLE_ENDPOINTS,
} from "../../core/endpoints";

const ACTIVE_PATROL_STATUSES = ["ACTIVE", "NOTIFIED", "EN_ROUTE", "ON_SCENE", "STAND_DOWN", "MOBILE"];
// Keep status changes compatible with the Control Room lifecycle:
// NOTIFIED -> EN_ROUTE -> ON_SCENE -> STAND_DOWN -> RESUME_PATROL.
const INCIDENT_RESPONSE_TYPES = [
  "NOTIFIED",
  "EN_ROUTE",
  "ON_SCENE",
  "STAND_DOWN",
  "RESUME_PATROL",
];

const EMERGENCY_SERVICE_OPTIONS = [
  "Ambulance",
  "Fire",
  "Police/SAPS",
  "Security Backup",
  "Traffic",
  "Tow Truck",
  "Control Room Urgent",
];

const INITIAL_START_FORM = {
  vehicleMode: "REGISTERED",
  vehicleId: "",
  sector: "Sector 1",
  startKm: "",
  tempVehicleRegistration: "",
  tempVehicleMake: "",
  tempVehicleModel: "",
  tempVehicleColour: "",
  tempVehicleType: "",
  tempVehicleCallSign: "",
  tempVehicleOwnerName: "",
  tempVehicleOwnerPhone: "",
  tempVehicleNotes: "",
};

const INITIAL_EVENT_FORM = {
  type: "MOBILE",
  incidentId: "",
  incidentCode: "",
  description: "",
  assistance: "",
};

const PATROL_ACTIONS = {
  emergency: {
    type: "MOBILE",
    description: "Emergency assistance request",
    formTitle: "Emergency Assistance",
    submitLabel: "Request Assistance",
  },
  incidentResponse: {
    type: "NOTIFIED",
    description: "",
    formTitle: "Incident Response",
    submitLabel: "Submit Status",
  },
  observation: {
    type: "MOBILE",
    description: "Observation",
    formTitle: "Report Observation",
    submitLabel: "Submit Observation",
  },
  infrastructure: {
    type: "INFRASTRUCTURE",
    description: "Infrastructure",
    formTitle: "Report Infrastructure",
    submitLabel: "Submit Infrastructure",
  },
  end: {
    formTitle: "End Patrol",
  },
};

const ACTION_ICONS = {
  emergency: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.6 20h18.8L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  observation: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  ),
  incidentResponse: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h9" />
      <path d="M4 12h16" />
      <path d="M4 18h9" />
      <path d="m15 6 3 3-3 3" />
    </svg>
  ),
  infrastructure: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-3-3 2.6-2.6Z" />
    </svg>
  ),
  end: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h12v14H6z" />
    </svg>
  ),
};

function getMemberName(member) {
  return (
    [member?.firstName, member?.surname].filter(Boolean).join(" ") ||
    member?.user?.fullName ||
    member?.email ||
    member?.user?.email ||
    "Patroller"
  );
}

function getCrewName(item) {
  return (
    item?.user?.fullName ||
    getMemberName(item?.member) ||
    item?.user?.email ||
    "Patroller"
  );
}

function getVehicleLabel(patrol) {
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

function getEventNeedsIncident(type) {
  return ["NOTIFIED", "EN_ROUTE", "ON_SCENE", "STAND_DOWN"].includes(type);
}

export default function PatrolOperationsSection({
  token,
  user,
  members,
  getAuthHeaders,
  getJsonAuthHeaders,
}) {
  const [activePatrols, setActivePatrols] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [patrollers, setPatrollers] = useState(members || []);
  const [selectedCrewIds, setSelectedCrewIds] = useState([]);
  const [startForm, setStartForm] = useState(INITIAL_START_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [endForm, setEndForm] = useState({ endKm: "", summary: "" });
  const [emergencyServices, setEmergencyServices] = useState([]);
  const [selectedPatrolAction, setSelectedPatrolAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // The patrol session is the active operational context. Driver, vehicle/call
  // sign, and selected crew travel under this same session.
  const activePatrol = activePatrols[0] || null;
  const isDriver = Boolean(activePatrol && activePatrol.userId === user?.id);
  const isActivePatrol = activePatrol && ACTIVE_PATROL_STATUSES.includes(activePatrol.status);
  const currentPatrolAction = PATROL_ACTIONS[selectedPatrolAction] || null;
  const showEmergencyForm = selectedPatrolAction === "emergency";
  const showIncidentResponseForm = selectedPatrolAction === "incidentResponse";
  const showObservationForm = selectedPatrolAction === "observation";
  const showInfrastructureForm = selectedPatrolAction === "infrastructure";
  const showEndForm = selectedPatrolAction === "end";
  const showReferenceNumber = getEventNeedsIncident(eventForm.type);
  const displayMessage = /incident not found/i.test(message) ? "" : message;

  const availableCrewMembers = useMemo(() => {
    const driverMemberId = (activePatrol?.crew || []).find((item) => item.role === "DRIVER")?.memberId;

    return (patrollers || []).filter((member) => {
      if (!member?.id) return false;
      if (member.id === driverMemberId) return false;
      if (member.userId && member.userId === user?.id) return false;
      if (member.user?.id && member.user.id === user?.id) return false;
      return true;
    });
  }, [activePatrol, patrollers, user?.id]);

  async function loadJson(url, options = {}) {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || json.message || "Request failed");
    }

    return json;
  }

  async function loadPatrolOperations() {
    if (!token) return;

    try {
      setLoading(true);
      setMessage("");

      const [activeJson, vehicleJson, patrollerJson] = await Promise.all([
        loadJson(PATROL_ENDPOINTS.myActive, {
          headers: getAuthHeaders(),
        }),
        loadJson(VEHICLE_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        }).catch(() => []),
        loadJson(MEMBER_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        }).catch(() => members || []),
      ]);

      const nextActivePatrols = Array.isArray(activeJson) ? activeJson : activeJson ? [activeJson] : [];
      const nextVehicles = Array.isArray(vehicleJson) ? vehicleJson : [];
      const nextPatrollers = Array.isArray(patrollerJson) ? patrollerJson : members || [];

      setActivePatrols(nextActivePatrols);
      setVehicles(nextVehicles);
      setPatrollers(nextPatrollers);

      if (!startForm.vehicleId && nextVehicles[0]?.id) {
        setStartForm((current) => ({
          ...current,
          vehicleId: current.vehicleId || nextVehicles[0].id,
        }));
      }
    } catch (error) {
      setMessage(error.message || "Failed to load patrol operations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatrolOperations();
  }, [token]);

  function updateStartForm(field, value) {
    setStartForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleCrewMember(memberId) {
    setSelectedCrewIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  function toggleEmergencyService(service) {
    setEmergencyServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  }

  function selectPatrolAction(action) {
    setSelectedPatrolAction(action.id);
    setMessage("");

    if (action.id === "end") return;

    setEventForm((current) => ({
      ...current,
      type: action.type,
      incidentId: action.id === "incidentResponse" ? current.incidentId : "",
      incidentCode: "",
      description: action.description,
      assistance: action.id === "incidentResponse" ? current.assistance : "",
    }));
  }

  async function startPatrol(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const payload = {
        vehicleMode: startForm.vehicleMode,
        sector: startForm.sector,
        startKm: startForm.startKm,
        crewMemberIds: selectedCrewIds,
      };

      if (startForm.vehicleMode === "REGISTERED") {
        payload.vehicleId = startForm.vehicleId;
      } else {
        payload.tempVehicleRegistration = startForm.tempVehicleRegistration;
        payload.tempVehicleMake = startForm.tempVehicleMake;
        payload.tempVehicleModel = startForm.tempVehicleModel;
        payload.tempVehicleColour = startForm.tempVehicleColour;
        payload.tempVehicleType = startForm.tempVehicleType;
        payload.tempVehicleCallSign = startForm.tempVehicleCallSign;
        payload.tempVehicleOwnerName = startForm.tempVehicleOwnerName;
        payload.tempVehicleOwnerPhone = startForm.tempVehicleOwnerPhone;
        payload.tempVehicleNotes = startForm.tempVehicleNotes;
      }

      await loadJson(PATROL_ENDPOINTS.start, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });

      setStartForm(INITIAL_START_FORM);
      setSelectedCrewIds([]);
      setMessage("Patrol started.");
      await loadPatrolOperations();
    } catch (error) {
      setMessage(error.message || "Failed to start patrol");
    } finally {
      setLoading(false);
    }
  }

  async function submitPatrolEvent(event) {
    event.preventDefault();

    if (!activePatrol?.id) return;

    try {
      setLoading(true);
      setMessage("");

      await loadJson(PATROL_ENDPOINTS.events, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          patrolId: activePatrol.id,
          type: eventForm.type,
          incidentId: selectedPatrolAction === "incidentResponse" ? eventForm.incidentId || null : null,
          incidentCode: eventForm.incidentCode || null,
          description: eventForm.description || eventForm.type,
          // Emergency Assistance must write to PatrolEvent.assistance, the same
          // source Control Room reads for its assistance queue.
          assistance:
            selectedPatrolAction === "emergency"
              ? emergencyServices.join(", ") || "Emergency Assistance"
              : eventForm.assistance || null,
          sceneActive: !["STAND_DOWN", "RESUME_PATROL"].includes(eventForm.type),
        }),
      });

      setEventForm(INITIAL_EVENT_FORM);
      setEmergencyServices([]);
      setSelectedPatrolAction("");
      setMessage("Patrol event submitted.");
      await loadPatrolOperations();
    } catch (error) {
      const nextMessage = error.message || "Failed to submit patrol event";
      setMessage(/incident not found/i.test(nextMessage) ? "" : nextMessage);
    } finally {
      setLoading(false);
    }
  }

  async function endPatrol(event) {
    event.preventDefault();

    if (!activePatrol?.id) return;

    try {
      setLoading(true);
      setMessage("");

      await loadJson(PATROL_ENDPOINTS.end(activePatrol.id), {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          endKm: endForm.endKm,
          summary: endForm.summary,
        }),
      });

      setEndForm({ endKm: "", summary: "" });
      setMessage("Patrol completed.");
      await loadPatrolOperations();
    } catch (error) {
      setMessage(error.message || "Failed to end patrol");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="patrol-phone-wrap">
      <section className="patrol-phone">
        <div className="patrol-phone-header">
          <div>
            <span className="patrol-phone-kicker">Patroller Console</span>
            <h2>Patrol Operations</h2>
          </div>
          <button className="patrol-refresh-btn" type="button" onClick={loadPatrolOperations} disabled={loading}>
            Refresh
          </button>
        </div>

        {displayMessage && <div className="patrol-message">{displayMessage}</div>}

        {!isActivePatrol && (
          <form className="patrol-mobile-form" onSubmit={startPatrol}>
            <div className="patrol-step-card">
              <div className="patrol-step-label">Start Patrol</div>

              <label>
                Vehicle Mode
                <select
                  value={startForm.vehicleMode}
                  onChange={(event) => updateStartForm("vehicleMode", event.target.value)}
                >
                  <option value="REGISTERED">REGISTERED</option>
                  <option value="TEMPORARY">TEMPORARY</option>
                </select>
              </label>

              {startForm.vehicleMode === "REGISTERED" && (
                <label>
                  Registered Vehicle
                  <select
                    value={startForm.vehicleId}
                    onChange={(event) => updateStartForm("vehicleId", event.target.value)}
                    required
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration} {vehicle.make ? `- ${vehicle.make}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {startForm.vehicleMode === "TEMPORARY" && (
                <div className="patrol-field-stack">
                  <label>
                    Temporary Registration
                    <input
                      value={startForm.tempVehicleRegistration}
                      onChange={(event) => updateStartForm("tempVehicleRegistration", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Make
                    <input value={startForm.tempVehicleMake} onChange={(event) => updateStartForm("tempVehicleMake", event.target.value)} />
                  </label>
                  <label>
                    Model
                    <input value={startForm.tempVehicleModel} onChange={(event) => updateStartForm("tempVehicleModel", event.target.value)} />
                  </label>
                  <label>
                    Colour
                    <input value={startForm.tempVehicleColour} onChange={(event) => updateStartForm("tempVehicleColour", event.target.value)} />
                  </label>
                  <label>
                    Type
                    <input value={startForm.tempVehicleType} onChange={(event) => updateStartForm("tempVehicleType", event.target.value)} />
                  </label>
                  <label>
                    Call Sign
                    <input value={startForm.tempVehicleCallSign} onChange={(event) => updateStartForm("tempVehicleCallSign", event.target.value)} />
                  </label>
                  <label>
                    Owner Name
                    <input value={startForm.tempVehicleOwnerName} onChange={(event) => updateStartForm("tempVehicleOwnerName", event.target.value)} />
                  </label>
                  <label>
                    Owner Phone
                    <input value={startForm.tempVehicleOwnerPhone} onChange={(event) => updateStartForm("tempVehicleOwnerPhone", event.target.value)} />
                  </label>
                  <label>
                    Temporary Vehicle Notes
                    <textarea value={startForm.tempVehicleNotes} onChange={(event) => updateStartForm("tempVehicleNotes", event.target.value)} />
                  </label>
                </div>
              )}

              <label>
                Sector
                <input value={startForm.sector} onChange={(event) => updateStartForm("sector", event.target.value)} required />
              </label>

              <label>
                Start KM
                <input
                  type="number"
                  min="0"
                  value={startForm.startKm}
                  onChange={(event) => updateStartForm("startKm", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Crew</div>
              {availableCrewMembers.length === 0 && (
                <p className="patrol-muted">No crew register is available to this console session.</p>
              )}
              {availableCrewMembers.map((member) => (
                <label key={member.id} className="patrol-list-item">
                  <span>
                    <strong>{getMemberName(member)}</strong>
                    <span className="patrol-muted"> {member.callSign || member.user?.email || member.email || ""}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedCrewIds.includes(member.id)}
                    onChange={() => toggleCrewMember(member.id)}
                  />
                </label>
              ))}
            </div>

            <button className="patrol-primary-action" type="submit" disabled={loading}>
              Start Patrol
            </button>
          </form>
        )}

        {isActivePatrol && (
          <div className="patrol-mobile-form">
            <div className="patrol-status-card">
              <div className="patrol-status-topline">
                <span className="patrol-live-badge">ON PATROL</span>
                <span>{activePatrol.status}</span>
              </div>
              <div className="patrol-status-title">{getVehicleLabel(activePatrol)}</div>
              <div className="patrol-facts">
                <div>
                  <span>Sector</span>
                  <strong>{activePatrol.sector || "-"}</strong>
                </div>
                <div>
                  <span>Start KM</span>
                  <strong>{activePatrol.startKm ?? "-"}</strong>
                </div>
              </div>
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Crew</div>
              {(activePatrol.crew || []).length === 0 && <p className="patrol-muted">No crew recorded.</p>}
              {(activePatrol.crew || []).map((item) => (
                <div key={item.id} className="patrol-list-item">
                  <div>
                    <strong>{getCrewName(item)}</strong>
                    <div className="patrol-muted">{item.attendanceStatus || "PRESENT"} {item.creditGranted ? "- credit granted" : "- no credit"}</div>
                  </div>
                  <span className="badge">{item.role || "CREW"}</span>
                </div>
              ))}
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Patrol Actions</div>
              <div className="patrol-action-grid">
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-emergency ${selectedPatrolAction === "emergency" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "emergency", ...PATROL_ACTIONS.emergency })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "emergency"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.emergency}</span>
                  <span>Emergency</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-incident-response ${selectedPatrolAction === "incidentResponse" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "incidentResponse", ...PATROL_ACTIONS.incidentResponse })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "incidentResponse"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.incidentResponse}</span>
                  <span>Incident Response</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-observation ${selectedPatrolAction === "observation" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "observation", ...PATROL_ACTIONS.observation })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "observation"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.observation}</span>
                  <span>Observation</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-infrastructure ${selectedPatrolAction === "infrastructure" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "infrastructure", ...PATROL_ACTIONS.infrastructure })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "infrastructure"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.infrastructure}</span>
                  <span>Infrastructure</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-end ${selectedPatrolAction === "end" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "end", ...PATROL_ACTIONS.end })}
                  disabled={loading || !isDriver}
                  title={isDriver ? "End patrol" : "Driver-only control"}
                  aria-pressed={selectedPatrolAction === "end"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.end}</span>
                  <span>End Patrol</span>
                </button>
              </div>
            </div>

            {showEmergencyForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              {/* External services are requested through Control Room by recording assistance here. */}
              <div className="patrol-service-options">
                {EMERGENCY_SERVICE_OPTIONS.map((service) => (
                  <label key={service} className="patrol-check-option">
                    <input
                      type="checkbox"
                      checked={emergencyServices.includes(service)}
                      onChange={() => toggleEmergencyService(service)}
                    />
                    {service}
                  </label>
                ))}
              </div>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
              </label>
              <label>
                Reference Number
                <input value={eventForm.incidentCode} onChange={(event) => setEventForm({ ...eventForm, incidentCode: event.target.value })} />
              </label>
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {currentPatrolAction.submitLabel}
              </button>
            </form>
            )}

            {showIncidentResponseForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              <label>
                Status
                <select
                  value={eventForm.type}
                  onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}
                >
                  {INCIDENT_RESPONSE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              {showReferenceNumber && (
                <label>
                  Reference Number
                  <input
                    value={eventForm.incidentId}
                    onChange={(event) => setEventForm({ ...eventForm, incidentId: event.target.value })}
                    required
                  />
                </label>
              )}

              <label>
                Incident Code
                <input value={eventForm.incidentCode} onChange={(event) => setEventForm({ ...eventForm, incidentCode: event.target.value })} />
              </label>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
              </label>
              <label>
                Assistance
                <input value={eventForm.assistance} onChange={(event) => setEventForm({ ...eventForm, assistance: event.target.value })} />
              </label>
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {currentPatrolAction.submitLabel}
              </button>
            </form>
            )}

            {showObservationForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
              </label>
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {currentPatrolAction.submitLabel}
              </button>
            </form>
            )}

            {showInfrastructureForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              <label>
                Reference Number
                <input value={eventForm.incidentCode} onChange={(event) => setEventForm({ ...eventForm, incidentCode: event.target.value })} />
              </label>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
              </label>
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {currentPatrolAction.submitLabel}
              </button>
            </form>
            )}

            {isDriver && showEndForm && (
              <form id="patrol-end-form" className="patrol-step-card patrol-mobile-form" onSubmit={endPatrol}>
                <div className="patrol-step-label">End Patrol</div>
                <label>
                  End KM
                  <input
                    type="number"
                    min={activePatrol.startKm || 0}
                    value={endForm.endKm}
                    onChange={(event) => setEndForm({ ...endForm, endKm: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Summary
                  <textarea value={endForm.summary} onChange={(event) => setEndForm({ ...endForm, summary: event.target.value })} />
                </label>
                <button className="patrol-primary-action patrol-end-submit" type="submit" disabled={loading}>
                  End Patrol
                </button>
              </form>
            )}

            {!isDriver && (
              <div className="patrol-message">
                Driver-only odometer and end patrol controls are hidden for crew members.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
