import { PERMISSIONS_BY_ROLE, SYSTEM_ROLES } from "../auth/permissions";
import { canAccess } from "../auth/permissions.helpers";

export function usePermissions(user) {
  const userRole = user?.role || "";

  function can(permission) {
    return canAccess(PERMISSIONS_BY_ROLE, userRole, permission);
  }

  const canCreateIncidents = can("CREATE_INCIDENT");
  const canUpdateIncidents = can("UPDATE_INCIDENT");
  const canAssignPatrol = can("ASSIGN_PATROL");
  const canViewPatrols = can("VIEW_PATROLS");
  const canViewPatrolOperations = can("VIEW_PATROL_OPERATIONS");
  const canViewRegisters = can("VIEW_REGISTERS");
  const canManageMembers = can("MANAGE_MEMBERS");
  const canViewReports = can("VIEW_REPORTS");
  const canViewOrganisations = can("VIEW_ORGANISATIONS");
  const canViewIntelligence = can("VIEW_INTELLIGENCE");

  const isAdmin = canViewRegisters || canViewPatrols || canViewReports || canViewOrganisations;
  const isPatrol = userRole === SYSTEM_ROLES.PATROL || userRole === SYSTEM_ROLES.PATROLLER;

  return {
    userRole,
    can,
    canCreateIncidents,
    canUpdateIncidents,
    canAssignPatrol,
    canViewPatrols,
    canViewPatrolOperations,
    canViewRegisters,
    canManageMembers,
    canViewReports,
    canViewOrganisations,
    canViewIntelligence,
    isAdmin,
    isPatrol,
  };
}
