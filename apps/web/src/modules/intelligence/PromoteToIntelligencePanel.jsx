import React from "react";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatCodeSubcode(record) {
  return [
    record?.incidentCodeRef?.code || record?.incident?.incidentCodeRef?.code || record?.incidentCode,
    record?.incidentCodeRef?.name || record?.incident?.incidentCodeRef?.name,
    record?.incidentSubcodeRef?.subcode || record?.incident?.incidentSubcodeRef?.subcode,
    record?.incidentSubcodeRef?.name || record?.incident?.incidentSubcodeRef?.name,
  ].filter(Boolean).join(" / ") || "-";
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

  return [street, event?.suburb, event?.locationNotes, coordinates].filter(Boolean).join(" - ") || "-";
}

function getCrewName(item) {
  return (
    item?.user?.fullName ||
    [item?.member?.firstName, item?.member?.surname].filter(Boolean).join(" ") ||
    item?.user?.email ||
    item?.member?.email ||
    ""
  );
}

function getPatrolDriver(event) {
  return event?.patrol?.user?.fullName || event?.patrol?.user?.email || "-";
}

function getPatrolCrew(event) {
  return (event?.patrol?.crew || []).map(getCrewName).filter(Boolean).join(", ") || "-";
}

function sourceRowsForPromotion(sourceType, source) {
  if (sourceType === "incident") {
    return [
      ["Incident code / subcode", formatCodeSubcode(source)],
      ["Title", source?.title],
      ["Description", source?.description],
      ["Sector", source?.sector],
      ["Status", source?.status],
      ["Severity", source?.severity],
      ["Street / suburb", [source?.street, source?.suburb].filter(Boolean).join(", ")],
      ["Reported", formatDateTime(source?.reportedAt || source?.createdAt)],
      ["Occurred", formatDateTime(source?.occurredAt)],
    ];
  }

  return [
    ["Event type", source?.type],
    ["Incident code / subcode", formatCodeSubcode(source)],
    ["Reference number", source?.referenceNumber],
    ["Description", source?.description],
    ["Assistance", source?.assistance],
    ["Service type", [source?.serviceTypeRef?.type, source?.serviceTypeRef?.category].filter(Boolean).join(" - ")],
    ["Infrastructure type", [source?.infrastructureTypeRef?.type, source?.infrastructureTypeRef?.riskLevel].filter(Boolean).join(" - ")],
    ["Location", formatEventLocation(source)],
    ["Patrol call sign", source?.patrol?.callSign],
    ["Driver", getPatrolDriver(source)],
    ["Crew", getPatrolCrew(source)],
    ["Created", formatDateTime(source?.createdAt)],
  ];
}

export default function PromoteToIntelligencePanel({
  promotion,
  form,
  onFormChange,
  onSubmit,
  onClose,
  submitting,
  entityTypes,
  riskLevels,
  statuses,
}) {
  if (!promotion || !form) return null;

  const sourceType = promotion.sourceType;
  const source = promotion.source;
  const rows = sourceRowsForPromotion(sourceType, source);
  const title = sourceType === "incident" ? "Promote Incident to Intelligence" : "Promote Patrol Event to Intelligence";

  return (
    <div className="incident-details">
      <div className="details-header">
        <div>
          <h3>{title}</h3>
          <p className="card-detail">
            Analyst-controlled promotion. Source data is read-only and remains auditable.
          </p>
        </div>
        <button className="secondary-btn" type="button" onClick={onClose} disabled={submitting}>
          Close
        </button>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>Source Record</h3>
          {rows.map(([label, value]) => (
            <p key={label}>
              <strong>{label}:</strong> {value || "-"}
            </p>
          ))}
        </div>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Entity Type
            <select
              value={form.entityType}
              onChange={(event) => onFormChange({ ...form, entityType: event.target.value })}
            >
              {entityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Display Name
            <input
              value={form.displayName}
              onChange={(event) => onFormChange({ ...form, displayName: event.target.value })}
              required
            />
          </label>

          <label>
            Risk Level
            <select
              value={form.riskLevel}
              onChange={(event) => onFormChange({ ...form, riskLevel: event.target.value })}
            >
              {riskLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => onFormChange({ ...form, status: event.target.value })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          {sourceType === "incident" ? (
            <label>
              Role in Incident
              <input
                value={form.roleInIncident}
                onChange={(event) => onFormChange({ ...form, roleInIncident: event.target.value })}
                placeholder="Example: PROMOTED_FROM_INCIDENT"
              />
            </label>
          ) : (
            <label>
              Observation Type
              <input
                value={form.observationType}
                onChange={(event) => onFormChange({ ...form, observationType: event.target.value })}
                placeholder="Example: VEHICLE_OBSERVED"
              />
            </label>
          )}

          <label>
            Entity Description
            <textarea
              value={form.description}
              onChange={(event) => onFormChange({ ...form, description: event.target.value })}
              placeholder="Short profile summary for the intelligence entity"
            />
          </label>

          {sourceType !== "incident" && form.entityType === "VEHICLE" && (
            <div className="panel">
              <h3>Vehicle Details</h3>
              <label>
                Registration Number
                <input
                  value={form.vehicleRegistration || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleRegistration: event.target.value })}
                  placeholder="Use confirmed full registration where available"
                />
              </label>
              <label>
                Make
                <input
                  value={form.vehicleMake || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleMake: event.target.value })}
                />
              </label>
              <label>
                Model
                <input
                  value={form.vehicleModel || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleModel: event.target.value })}
                />
              </label>
              <label>
                Colour
                <input
                  value={form.vehicleColour || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleColour: event.target.value })}
                />
              </label>
              <label>
                Vehicle Type
                <input
                  value={form.vehicleType || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleType: event.target.value })}
                />
              </label>
              <label>
                Distinguishing Marks
                <textarea
                  value={form.vehicleMarks || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleMarks: event.target.value })}
                />
              </label>
              <label>
                Vehicle Notes
                <textarea
                  value={form.vehicleNotes || ""}
                  onChange={(event) => onFormChange({ ...form, vehicleNotes: event.target.value })}
                />
              </label>
            </div>
          )}

          <label>
            Analyst Notes
            <textarea
              value={form.notes}
              onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
              placeholder="Why this source record is being promoted"
            />
          </label>

          <div className="action-row">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Promoting..." : "Promote to Intelligence"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
