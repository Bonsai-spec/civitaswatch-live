import { activeStatuses } from "../incidents/incident.constants";
import { getIncidentPatrol } from "../incidents/incident.utils";
import { getPatrolOptionLabel } from "../patrols/patrol.utils";
import { getIncidentVehicle, getVehicleLabel } from "../vehicles/vehicle.utils";

export function getOpenIncidentCount(incidents) {
  return incidents.filter((incident) => incident.status === "OPEN").length;
}

export function getActiveIncidentCount(incidents) {
  return incidents.filter((incident) => activeStatuses.includes(incident.status)).length;
}

export function getActivePatrols(patrols) {
  return patrols.filter((patrol) => patrol.status === "ACTIVE");
}

export function getAssignedPatrolName(incident, patrols = []) {
  const patrol = getIncidentPatrol(incident, patrols);
  if (!patrol) return "Unassigned";

  return getPatrolOptionLabel(patrol);
}

export function getAssignedVehicleName(incident) {
  return getVehicleLabel(getIncidentVehicle(incident));
}
