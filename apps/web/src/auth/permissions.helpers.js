export function hasPermission(permissions, permission) {
  return permissions.includes("*") || permissions.includes(permission);
}

export function canAccess(permissionsByRole, role, permission) {
  const permissions = permissionsByRole[role] || [];
  return hasPermission(permissions, permission);
}
