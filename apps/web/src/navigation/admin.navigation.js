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
      { label: "Patrols", permission: "VIEW_PATROLS" },
    ],
  },
  {
    label: "Registers",
    items: [
      { label: "Registers", permission: "VIEW_REGISTERS" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Reports", permission: "VIEW_REPORTS" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Intelligence", permission: "VIEW_INTELLIGENCE" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Organisations", permission: "VIEW_ORGANISATIONS" },
    ],
  },
  {
    label: "Master Administration",
    items: [],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);
