import { getMemberRoles } from "../members/member.utils";

const IMPORT_START_MARKER = "[IMPORT]";
const IMPORT_END_MARKER = "[/IMPORT]";
const RESIDENT_IMPORT_SOURCE = "resident-list";

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

export function getResidentImportMetadata(member) {
  const notes = member?.notes || "";
  const lines = notes.split("\n").map((line) => line.trim());
  const startIndex = lines.findIndex((line) => line === IMPORT_START_MARKER);
  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && line === IMPORT_END_MARKER
  );

  if (startIndex === -1 || endIndex === -1) {
    return {
      source: "",
      legacyResidentId: "",
      cityTown: "",
      flags: [],
    };
  }

  const metadata = {};

  lines.slice(startIndex + 1, endIndex).forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
  });

  return {
    source: metadata.source || "",
    legacyResidentId: metadata.legacyResidentId || "",
    cityTown: metadata.cityTown || "",
    flags: metadata.flags ? metadata.flags.split(",").filter(Boolean) : [],
  };
}

export function isImportedResident(member) {
  const notes = member?.notes || "";
  const metadata = getResidentImportMetadata(member);

  return notes.includes(IMPORT_START_MARKER) && metadata.source === RESIDENT_IMPORT_SOURCE;
}

export function filterRegisterMembers(members, searchText) {
  return members.filter((member) => {
    if (isImportedResident(member)) return false;

    return matchesRegisterSearch(
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
    );
  });
}

export function filterRegisterResidents(members, searchText) {
  return members.filter((member) => {
    if (!isImportedResident(member)) return false;

    const metadata = getResidentImportMetadata(member);

    return matchesRegisterSearch(
      [
        member.firstName,
        member.surname,
        member.cellNumber,
        member.address,
        member.suburb,
        metadata.cityTown,
        metadata.legacyResidentId,
        metadata.flags.join(" "),
        member.isActive ? "active" : "inactive",
      ],
      searchText
    );
  });
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
