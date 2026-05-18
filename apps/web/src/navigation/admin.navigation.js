export const ADMIN_NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { label: "Dashboard", permission: "VIEW_DASHBOARD" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Incidents", permission: "VIEW_INCIDENTS" },
      { label: "Patrol Operations", permission: "VIEW_PATROL_OPERATIONS" },
      { label: "Patrols", permission: "VIEW_PATROLS" },
    ],
  },
  {
    label: "Registers",
    items: [
      { label: "Members", permission: "VIEW_REGISTERS" },
      { label: "Patrollers", permission: "VIEW_REGISTERS" },
      { label: "Vehicles", permission: "VIEW_REGISTERS" },
      { label: "Residents", permission: "VIEW_REGISTERS" },
      { label: "Organisations", permission: "VIEW_REGISTERS" },
      { label: "Incident Codes", permission: "VIEW_REGISTERS" },
      { label: "Incident Subcodes", permission: "VIEW_REGISTERS" },
      { label: "Service Types", permission: "VIEW_REGISTERS" },
      { label: "Emergency Services", permission: "VIEW_REGISTERS" },
      { label: "Infrastructure Types", permission: "VIEW_REGISTERS" },
      { label: "Emergency Contact Types", permission: "VIEW_REGISTERS" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Monthly Community Safety Trends", permission: "VIEW_REPORTS" },
      { label: "Patroller Activity", permission: "VIEW_REPORTS" },
      { label: "Incident Reports", permission: "VIEW_REPORTS" },
      { label: "Patrol Reports", permission: "VIEW_REPORTS" },
      { label: "Assistance Request Reports", permission: "VIEW_REPORTS" },
      { label: "Infrastructure Summary / Detail", permission: "VIEW_REPORTS" },
      { label: "Vehicle Usage", permission: "VIEW_REPORTS" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Intelligence", permission: "VIEW_INTELLIGENCE" },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);
