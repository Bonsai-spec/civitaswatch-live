import { hasPermission } from "../auth/permissions.helpers";

export function flattenNavigationSections(sections) {
  return sections.flatMap((section) => section.items);
}

export function isNavigationItemVisible(item, permissions) {
  return hasPermission(permissions, item.permission);
}

export function getNavigationLabelsForRole(sections, permissionsByRole, role) {
  if (!role) return ["Dashboard"];

  const permissions = permissionsByRole[role] || [];

  return flattenNavigationSections(sections)
    .filter((item) => isNavigationItemVisible(item, permissions))
    .map((item) => item.label);
}

export function getNavigationSectionsForRole(sections, permissionsByRole, role) {
  if (!role) {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label === "Dashboard"),
      }))
      .filter((section) => section.items.length > 0);
  }

  const permissions = permissionsByRole[role] || [];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavigationItemVisible(item, permissions)),
    }))
    .filter((section) => section.items.length > 0);
}
