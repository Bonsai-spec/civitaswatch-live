import React from "react";

function getCrewName(item) {
  return (
    item?.user?.fullName ||
    [item?.member?.firstName, item?.member?.surname].filter(Boolean).join(" ") ||
    item?.user?.email ||
    item?.member?.email ||
    "Crew member"
  );
}

function getAssistancePatrolLabel(request) {
  const patrol = request?.patrol;
  const driver = patrol?.user?.fullName || patrol?.user?.email || "Patrol";
  return [driver, patrol?.sector, patrol?.status].filter(Boolean).join(" - ");
}

function getAssistanceVehicleLabel(request) {
  const patrol = request?.patrol;

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

function formatSubmittedTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function IncidentsSection({
  children,
  data,
  filter,
  onFilterChange,
  statusFilterOptions,
  canCreateIncidents,
  form,
  onIncidentFormFieldChange,
  incidentTypeOptions,
  sectorOptions,
  severityOptions,
  onCreateIncident,
  loading,
  isPatrol,
  selectedIncident,
  onCloseSelectedIncident,
  getAssignedPatrolName,
  getAssignedVehicleName,
  onUpdateStatus,
  canAssignPatrol,
  onAutoAssignIncident,
  getIncidentLinkedPatrolId,
  onAssignSelectedIncidentPatrol,
  onAssignSelectedIncidentVehicle,
  activePatrols,
  getPatrolOptionLabel,
  getVehicleLabel,
  onUnassignPatrol,
  onArchiveIncident,
  onDeleteIncident,
  onSelectIncident,
  showStatusFilter = true,
  showAssistanceRequests: shouldShowAssistanceRequests = true,
  showCreateIncident = true,
  showIncidentList = true,
  showSelectedIncidentServices = true,
  assistancePanelClassName = "panel",
}) {
  const assistanceRequests = data.assistanceRequests || [];
  const showAssistanceRequests =
    shouldShowAssistanceRequests && canAssignPatrol && !isPatrol;

  return (
    <>
      {showStatusFilter && (
        <div className="filter-bar">
          <label>
            Filter status
            <select value={filter} onChange={(e) => onFilterChange(e.target.value)}>
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {children}

      {showAssistanceRequests && (
        <div className={assistancePanelClassName}>
          <div className="details-header">
            <h2>Assistance Requests</h2>
            <span className="badge">{assistanceRequests.length} active</span>
          </div>

          {assistanceRequests.length === 0 && (
            <p>No assistance requests submitted.</p>
          )}

          {assistanceRequests.map((request) => (
            <div key={request.id} className="item">
              <div>
                <strong>{request.assistance}</strong>
                <div>Patrol: {getAssistancePatrolLabel(request)}</div>
                <div>Vehicle: {getAssistanceVehicleLabel(request)}</div>
                <div>
                  Crew: {(request.patrol?.crew || []).map(getCrewName).join(", ") || "-"}
                </div>
                <div>Description: {request.description || "-"}</div>
                <div>Reference number: {request.incidentCode || request.incident?.incidentCode || "-"}</div>
              </div>

              <span className="badge">{formatSubmittedTime(request.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid">
        {showCreateIncident && canCreateIncidents && (
          <div className="panel">
            <h2>Create Incident</h2>

            <form className="form" onSubmit={onCreateIncident}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => onIncidentFormFieldChange("title", e.target.value)}
                  placeholder="Example: Suspicious activity"
                  required
                />
              </label>

              <label>
                Incident Type
                <select
                  value={form.incidentType}
                  onChange={(e) =>
                    onIncidentFormFieldChange("incidentType", e.target.value)
                  }
                >
                  {incidentTypeOptions.map((option) => (
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
                  onChange={(e) => onIncidentFormFieldChange("street", e.target.value)}
                  placeholder="Street name"
                  required
                />
              </label>

              <label>
                Suburb
                <input
                  value={form.suburb}
                  onChange={(e) => onIncidentFormFieldChange("suburb", e.target.value)}
                  placeholder="Suburb"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    onIncidentFormFieldChange("description", e.target.value)
                  }
                  placeholder="Optional details"
                />
              </label>

              <label>
                Sector
                <select
                  value={form.sector}
                  onChange={(e) => onIncidentFormFieldChange("sector", e.target.value)}
                >
                  {sectorOptions.map((sector) => (
                    <option key={sector}>{sector}</option>
                  ))}
                </select>
              </label>

              <label>
                Severity
                <select
                  value={form.severity}
                  onChange={(e) => onIncidentFormFieldChange("severity", e.target.value)}
                >
                  {severityOptions.map((severity) => (
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
                  onChange={(e) => onIncidentFormFieldChange("date", e.target.value)}
                  required
                />
              </label>

              <label>
                Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => onIncidentFormFieldChange("time", e.target.value)}
                  required
                />
              </label>

              <button className="primary-btn" disabled={loading}>
                {loading ? "Creating..." : "Create Incident"}
              </button>
            </form>
          </div>
        )}

        {(showIncidentList || showSelectedIncidentServices) && (
        <div className="panel">
          <h2>{isPatrol ? "My Assigned Incidents" : "Incidents"}</h2>

          {showSelectedIncidentServices && selectedIncident && (
            <div className="incident-details">
              <div className="details-header">
                <h3>{selectedIncident.title}</h3>
                <button className="secondary-btn" onClick={onCloseSelectedIncident}>
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
                <strong>Assigned Vehicle:</strong> {getAssignedVehicleName(selectedIncident)}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedIncident.description || "No description"}
              </p>

              <div className="action-row">
                <button onClick={() => onUpdateStatus(selectedIncident.id, "OPEN")}>
                  Open
                </button>
                <button onClick={() => onUpdateStatus(selectedIncident.id, "IN_PROGRESS")}>
                  In Progress
                </button>
                <button onClick={() => onUpdateStatus(selectedIncident.id, "RESOLVED")}>
                  Resolved
                </button>
                <button onClick={() => onUpdateStatus(selectedIncident.id, "CLOSED")}>
                  Closed
                </button>
              </div>

              {canAssignPatrol && (
                <button onClick={() => onAutoAssignIncident(selectedIncident.id)}>
                  Auto Assign
                </button>
              )}

              {canAssignPatrol && (
                <div className="action-row">
                  <select
                    value={getIncidentLinkedPatrolId(selectedIncident)}
                    onChange={(e) => onAssignSelectedIncidentPatrol(e.target.value)}
                  >
                    <option value="">Assign Patrol</option>
                    {activePatrols.map((p) => (
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
                      onChange={(e) => onAssignSelectedIncidentVehicle(e.target.value)}
                    >
                      <option value="">Assign Vehicle</option>
                      {data.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {getVehicleLabel(vehicle)}
                        </option>
                      ))}
                    </select>
                  )}

                  <button onClick={() => onUnassignPatrol(selectedIncident.id)}>
                    Unassign Patrol
                  </button>

                  <button onClick={() => onArchiveIncident(selectedIncident.id)}>
                    Archive
                  </button>

                  <button onClick={() => onDeleteIncident(selectedIncident.id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {showIncidentList && data.incidents.length === 0 && (
            <p>{isPatrol ? "No incidents assigned to you." : "No incidents found."}</p>
          )}

          {showIncidentList && data.incidents.map((incident) => (
            <div key={incident.id} className="item" onClick={() => onSelectIncident(incident)}>
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
        )}
      </div>
    </>
  );
}
