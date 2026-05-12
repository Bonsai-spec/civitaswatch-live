import React from "react";

export default function PatrolsSection({
  activePatrols,
  getDisplayName,
  getPatrolVehicleLabel,
}) {
  return (
    <div className="panel">
      <h2>Active Patrols</h2>

      {activePatrols.length === 0 && <p>No active patrols found.</p>}

      {activePatrols.map((p) => (
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
  );
}
