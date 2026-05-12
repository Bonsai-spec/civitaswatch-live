import React from "react";

export default function ReportsSection({
  data,
  reportFilters,
  onReportFiltersChange,
  onClearReportFilters,
  onRefreshReports,
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
  showFilters = true,
  showSummaryCards = true,
  showSelectedPatrolReport = true,
  showReportTable = true,
}) {
  return (
    <div className="panel">
      <div className="details-header">
        <h2>Patrol / KM Reports</h2>
        <button className="secondary-btn" onClick={onRefreshReports}>
          Refresh
        </button>
      </div>

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
