import { activeStatuses } from "../incidents/incident.constants";
import { getDisplayName, getVehicleLabel } from "../vehicles/vehicle.utils";

export function getPatrolVehicleLabel(patrol) {
  return getVehicleLabel(patrol?.vehicle);
}

export function getPatrolOptionLabel(patrol) {
  const name = getDisplayName(patrol);
  const vehicle = getPatrolVehicleLabel(patrol);
  const sector = patrol?.sector || "No sector";

  return `${name} — ${vehicle} — ${sector}`;
}

export function buildLocalWorkload(patrols, incidents) {
  return patrols.map((patrol) => {
    const count = incidents.filter((incident) => {
      const patrolId =
        incident.assignedPatrolId || incident.patrolId || incident.linkedPatrolId;
      return patrolId === patrol.id && activeStatuses.includes(incident.status);
    }).length;

    return {
      id: patrol.id,
      name: patrol.fullName || patrol.name,
      email: patrol.email,
      sector: patrol.sector,
      status: patrol.status,
      activeIncidentCount: count,
    };
  });
}
