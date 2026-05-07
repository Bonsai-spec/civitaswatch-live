export function getDisplayName(person) {
  if (!person) return "N/A";

  const user = person.user || person.patroller || person.assignedUser || person;

  return user.fullName || user.name || user.email || "Unnamed user";
}

export function getVehicleLabel(vehicle) {
  if (!vehicle) return "No vehicle";

  const callsign = vehicle.callsign || vehicle.callSign || vehicle.name || "Vehicle";
  const plate = vehicle.plateNumber || vehicle.registration || vehicle.regNumber;
  const type = vehicle.type || vehicle.vehicleType;

  return [callsign, plate, type].filter(Boolean).join(" • ");
}

export function getIncidentVehicle(incident) {
  return (
    incident?.assignedVehicle ||
    incident?.vehicle ||
    incident?.linkedVehicle ||
    incident?.linkedPatrol?.vehicle ||
    null
  );
}
