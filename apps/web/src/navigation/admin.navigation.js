export const ADMIN_NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", permission: "VIEW_DASHBOARD" },
      { label: "Incidents", permission: "VIEW_INCIDENTS" },
      { label: "Patrols", permission: "VIEW_PATROLS" },
    ],
  },
  {
    label: "Registers",
    items: [
      { label: "Registers", permission: "VIEW_REGISTERS" },
      { label: "Reports", permission: "VIEW_REPORTS" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Organisations", permission: "VIEW_ORGANISATIONS" },
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
