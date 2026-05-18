import React from "react";

function formatEventClassification(event) {
  return [
    event?.incidentCodeRef?.code || event?.incident?.incidentCodeRef?.code || event?.incidentCode,
    event?.incidentSubcodeRef?.subcode || event?.incident?.incidentSubcodeRef?.subcode,
  ].filter(Boolean).join(" / ");
}

function formatEventService(event) {
  if (event?.serviceTypeRef?.type) {
    return [event.serviceTypeRef.type, event.serviceTypeRef.category].filter(Boolean).join(" - ");
  }

  if (event?.infrastructureTypeRef?.type) {
    return [event.infrastructureTypeRef.type, event.infrastructureTypeRef.riskLevel].filter(Boolean).join(" - ");
  }

  return event?.assistance || "";
}

function formatEventLocation(event) {
  const street = [event?.streetNumber, event?.streetName].filter(Boolean).join(" ");
  const coordinates =
    event?.latitude !== null &&
    event?.latitude !== undefined &&
    event?.longitude !== null &&
    event?.longitude !== undefined
      ? `${event.latitude}, ${event.longitude}`
      : null;

  return [street, event?.suburb, event?.locationNotes, coordinates].filter(Boolean).join(" - ");
}

function getAssistancePatrolLabel(request) {
  return (
    request?.patrol?.callSign ||
    request?.patrol?.user?.fullName ||
    request?.patrol?.user?.email ||
    request?.patrol?.id ||
    "-"
  );
}

function getAssistanceVehicleLabel(request) {
  return (
    request?.patrol?.vehicle?.registration ||
    request?.patrol?.vehicleRegistration ||
    request?.vehicle?.registration ||
    "-"
  );
}

function getAssistanceLocationLabel(request) {
  const street = [request?.streetNumber, request?.streetName].filter(Boolean).join(" ");
  return [street, request?.suburb, request?.locationNotes].filter(Boolean).join(" - ") || "-";
}

export default function ReportsSection({
  data,
  reportCategory = "Patrol Reports",
  reportFilters,
  onReportFiltersChange,
  onClearReportFilters,
  onRefreshReports,
  onRefreshOperationalData,
  sectorFilterOptions,
  statusFilterOptions,
  patrollerFilterOptions,
  filteredPatrolReports,
  reportTotalKm,
  completedReportCount,
  activeReportCount,
  selectedPatrolReport,
  editPatrolForm,
  onEditPatrolFormChange,
  patrolAuditLogs,
  onClosePatrolReport,
  onSavePatrolReportEdits,
  onViewPatrolReport,
  onEditPatrolReport,
  onLoadPatrolReportAudit,
  onCloseActivePatrol,
  getVehicleLabel,
  filteredIncidentReports = [],
  onViewIncidentReport,
  onEditIncidentReport,
  onDeleteIncidentReport,
  showFilters = true,
  showSummaryCards = true,
  showSelectedPatrolReport = true,
  showReportTable = true,
}) {
  const assistanceRequests = data.assistanceRequests || [];
  const vehicles = data.vehicles || [];
  const refreshHandler =
    reportCategory === "Patrol Reports" ? onRefreshReports : onRefreshOperationalData || onRefreshReports;

  if (reportCategory === "Incident Reports") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Incident Reports</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Historical incident records for review, follow-up, and accountability.
        </p>

        <div className="cards">
          <div className="card">
            <div className="card-title">Incident Reports</div>
            <div className="card-value">{filteredIncidentReports.length}</div>
            <div className="card-detail">Operational incident and response history</div>
          </div>
        </div>

        {filteredIncidentReports.length === 0 ? (
          <p>No incident reports available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Type</th>
                <th>Sector</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidentReports.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.incidentCode || "-"}</td>
                  <td>{incident.title || "-"}</td>
                  <td>{incident.incidentType || "-"}</td>
                  <td>{incident.sector || "-"}</td>
                  <td>{incident.status || "-"}</td>
                  <td>{incident.severity || "-"}</td>
                  <td>{[incident.street, incident.suburb].filter(Boolean).join(", ") || "-"}</td>
                  <td>
                    {onViewIncidentReport && (
                      <button onClick={() => onViewIncidentReport(incident)}>View</button>
                    )}
                    {onEditIncidentReport && (
                      <button onClick={() => onEditIncidentReport(incident)}>Edit</button>
                    )}
                    {onDeleteIncidentReport && (
                      <button onClick={() => onDeleteIncidentReport(incident.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (
    reportCategory === "Assistance Request Reports" ||
    reportCategory === "Assistance Requests"
  ) {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Assistance Request Reports</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Historical assistance requests submitted by patrol teams. Live coordination remains
          in Control Room.
        </p>

        <div className="cards">
          <div className="card">
            <div className="card-title">Assistance Requests</div>
            <div className="card-value">{assistanceRequests.length}</div>
            <div className="card-detail">History sourced from Patrol assistance events</div>
          </div>
        </div>

        {assistanceRequests.length === 0 ? (
          <p>No assistance request history available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Patrol</th>
                <th>Vehicle</th>
                <th>Sector</th>
                <th>Location</th>
                <th>Description</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {assistanceRequests.map((request) => (
                <tr key={request.id}>
                  <td>{formatEventService(request) || "-"}</td>
                  <td>{getAssistancePatrolLabel(request)}</td>
                  <td>{getAssistanceVehicleLabel(request)}</td>
                  <td>{request?.patrol?.sector || request?.sector || "-"}</td>
                  <td>{getAssistanceLocationLabel(request)}</td>
                  <td>{request.description || "-"}</td>
                  <td>{request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (reportCategory === "Vehicle Reports") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Vehicle Reports</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Vehicle accountability view for operational history and fleet review.
        </p>

        <div className="cards">
          <div className="card">
            <div className="card-title">Vehicles</div>
            <div className="card-value">{vehicles.length}</div>
            <div className="card-detail">Vehicles available for operational reporting</div>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <p>No vehicle records available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make</th>
                <th>Type</th>
                <th>Colour</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.registration || getVehicleLabel(vehicle)}</td>
                  <td>{vehicle.make || "-"}</td>
                  <td>{vehicle.type || "-"}</td>
                  <td>{vehicle.colour || "-"}</td>
                  <td>{vehicle.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="details-header">
        <h2>Patrol Reports</h2>
        {refreshHandler && (
          <button className="secondary-btn" onClick={refreshHandler}>
            Refresh
          </button>
        )}
      </div>
      <p className="card-detail">
        Patrol session history for review, distance checks, audit, and close-out follow-up.
      </p>

      {showFilters && (
      <div className="action-row">
        <input
          type="date"
          value={reportFilters.from}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, from: e.target.value })}
        />

        <input
          type="date"
          value={reportFilters.to}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, to: e.target.value })}
        />

        <select
          value={reportFilters.sector}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, sector: e.target.value })}
        >
          {sectorFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={reportFilters.vehicleId}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, vehicleId: e.target.value })}
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
            onReportFiltersChange({ ...reportFilters, patrollerId: e.target.value })
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
          onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
        >
          {statusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button onClick={onClearReportFilters}>Clear</button>
      </div>
      )}

      {showSummaryCards && (
      <div className="cards">
        <div className="card">
          <div className="card-title">Reports</div>
          <div className="card-value">{filteredPatrolReports.length}</div>
          <div className="card-detail">Matching filters</div>
        </div>

        <div className="card">
          <div className="card-title">Total KM</div>
          <div className="card-value">{reportTotalKm}</div>
          <div className="card-detail">Completed distance captured</div>
        </div>

        <div className="card">
          <div className="card-title">Completed</div>
          <div className="card-value">{completedReportCount}</div>
          <div className="card-detail">Closed patrol sessions</div>
        </div>

        <div className="card">
          <div className="card-title">Active</div>
          <div className="card-value">{activeReportCount}</div>
          <div className="card-detail">Currently on patrol</div>
        </div>
      </div>
      )}

      {showSelectedPatrolReport && selectedPatrolReport && (
        <div className="incident-details">
          <div className="details-header">
            <h3>Patrol Detail</h3>
            <button className="secondary-btn" onClick={onClosePatrolReport}>
              Close
            </button>
          </div>

          <p>
            <strong>Patroller:</strong>{" "}
            {selectedPatrolReport.user?.fullName || selectedPatrolReport.user?.email || "Unnamed"}
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
            {selectedPatrolReport.endKm ?? "-"} = {selectedPatrolReport.totalKm ?? "-"}
          </p>
          <p>
            <strong>Summary:</strong> {selectedPatrolReport.summary || "No summary"}
          </p>

          {(selectedPatrolReport.patrolEvents || []).length > 0 && (
            <div className="panel">
              <h3>Patrol Timeline</h3>
              {(selectedPatrolReport.patrolEvents || []).map((event) => {
                const classification = formatEventClassification(event);
                const service = formatEventService(event);
                const location = formatEventLocation(event);

                return (
                  <div key={event.id} className="item">
                    <div>
                      <strong>{event.type || "Patrol event"}</strong>
                      {classification && <div>Code/Subcode: {classification}</div>}
                      {service && <div>Service / Type: {service}</div>}
                      {event.referenceNumber && <div>Reference number: {event.referenceNumber}</div>}
                      {location && <div>Location: {location}</div>}
                      <div>Description: {event.description || "-"}</div>
                      {event.createdBy && (
                        <div>Created by: {event.createdBy.fullName || event.createdBy.email || "-"}</div>
                      )}
                    </div>
                    <span className="badge">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString() : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {editPatrolForm && (
            <div className="form">
              <label>
                Sector
                <select
                  value={editPatrolForm.sector}
                  onChange={(e) =>
                    onEditPatrolFormChange({
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
                    onEditPatrolFormChange({
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
                    onEditPatrolFormChange({
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
                    onEditPatrolFormChange({
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
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      editReason: e.target.value,
                    })
                  }
                  placeholder="Required: explain why this report is being edited"
                  required
                />
              </label>

              <button onClick={() => onSavePatrolReportEdits(selectedPatrolReport.id)}>
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

      {showReportTable && (filteredPatrolReports.length === 0 ? (
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
                <td>{patrol.startTime ? new Date(patrol.startTime).toLocaleString() : "-"}</td>
                <td>{patrol.endTime ? new Date(patrol.endTime).toLocaleString() : "-"}</td>
                <td>
                  <button onClick={() => onViewPatrolReport(patrol)}>View</button>
                  <button onClick={() => onEditPatrolReport(patrol)}>Edit</button>
                  <button onClick={() => onLoadPatrolReportAudit(patrol)}>Audit</button>
                  {patrol.status === "ACTIVE" && (
                    <button onClick={() => onCloseActivePatrol(patrol)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
