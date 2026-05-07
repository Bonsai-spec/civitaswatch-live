export function getIncidentPatrol(incident, patrols = []) {
  return (
    incident?.assignedPatrol ||
    incident?.patrol ||
    incident?.linkedPatrol ||
    patrols.find((p) => p.id === incident?.assignedPatrolId) ||
    patrols.find((p) => p.id === incident?.patrolId) ||
    patrols.find((p) => p.id === incident?.linkedPatrolId) ||
    null
  );
}

export function getIncidentLinkedPatrolId(incident) {
  return (
    incident?.assignedPatrolId ||
    incident?.patrolId ||
    incident?.linkedPatrolId ||
    incident?.linkedPatrol?.id ||
    ""
  );
}
