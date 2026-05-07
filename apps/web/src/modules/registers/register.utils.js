import { getMemberRoles } from "../members/member.utils";

export function matchesRegisterSearch(values, searchText) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(searchText);
}

export function filterRegisterIncidents(incidents, searchText) {
  return incidents.filter((incident) =>
    matchesRegisterSearch(
      [
        incident.incidentCode,
        incident.title,
        incident.incidentType,
        incident.sector,
        incident.status,
        incident.severity,
        incident.street,
        incident.suburb,
      ],
      searchText
    )
  );
}

export function filterRegisterVehicles(vehicles, searchText) {
  return vehicles.filter((vehicle) =>
    matchesRegisterSearch(
      [
        vehicle.registration,
        vehicle.make,
        vehicle.type,
        vehicle.colour,
        vehicle.callsign,
        vehicle.callSign,
      ],
      searchText
    )
  );
}

export function filterRegisterPatrols(patrols, searchText) {
  return patrols.filter((patrol) =>
    matchesRegisterSearch(
      [
        patrol.user?.fullName,
        patrol.user?.email,
        patrol.sector,
        patrol.status,
        patrol.vehicle?.registration,
        patrol.vehicle?.type,
      ],
      searchText
    )
  );
}

export function filterRegisterMembers(members, searchText) {
  return members.filter((member) =>
    matchesRegisterSearch(
      [
        member.firstName,
        member.surname,
        member.cellNumber,
        member.email,
        member.address,
        member.suburb,
        member.sector,
        member.callSign,
        member.vettingStatus,
        member.nextOfKinName,
        member.nextOfKinPhone,
        member.licenceCode,
        getMemberRoles(member).join(" "),
      ],
      searchText
    )
  );
}

export function isPatrollerRegisterRecord(member) {
  const roles = getMemberRoles(member);

  return (
    member.patrolApproved ||
    ["PENDING", "APPROVED", "SUSPENDED"].includes(member.patrolStatus) ||
    member.patrolTraining ||
    roles.includes("PATROLLER") ||
    roles.includes("PATROL") ||
    member.user?.role === "PATROLLER" ||
    member.user?.role === "PATROL"
  );
}

export function filterRegisterPatrollers(members, searchText) {
  return members.filter((member) => {
    if (!isPatrollerRegisterRecord(member)) return false;

    return matchesRegisterSearch(
      [
        member.firstName,
        member.surname,
        member.email,
        member.cellNumber,
        member.callSign,
        member.sector,
        member.patrolStatus,
        member.user?.email,
        member.user?.role,
      ],
      searchText
    );
  });
}

export function filterRegisterOrganisations(organisations, searchText) {
  return organisations.filter((org) => matchesRegisterSearch([org.name, org.code], searchText));
}
