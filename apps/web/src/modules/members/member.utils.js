import { ROLE_MARKER } from "../../auth/memberRoles";

export function getMemberRoles(member) {
  if (!member) return [];

  if (Array.isArray(member.roles)) {
    return member.roles;
  }

  const notes = member.notes || "";
  const line = notes
    .split("\n")
    .find((item) => item.startsWith(ROLE_MARKER));

  if (!line) return [];

  try {
    const roles = JSON.parse(line.replace(ROLE_MARKER, ""));
    return Array.isArray(roles) ? roles : [];
  } catch (err) {
    return [];
  }
}

export function saveRolesIntoNotes(notes, roles = []) {
  const cleanNotes = (notes || "")
    .split("\n")
    .filter((line) => !line.startsWith(ROLE_MARKER))
    .join("\n")
    .trim();

  const cleanRoles = Array.from(new Set(roles)).filter(Boolean);
  const roleLine = `${ROLE_MARKER}${JSON.stringify(cleanRoles)}`;

  return cleanNotes ? `${cleanNotes}\n${roleLine}` : roleLine;
}
