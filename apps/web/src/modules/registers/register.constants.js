export const REGISTER_TABS = [
  // Registers are source-of-truth and master-data screens. Operational history
  // belongs under Reports.
  "Members",
  "Patrollers",
  "Vehicles",
  "Residents",
  "Organisations",
  "Incident Codes",
  "Incident Subcodes",
  "Service Types",
  "Emergency Services",
  "Infrastructure Types",
  "Emergency Contact Types",
];

export const REGISTER_METADATA = {
  Members: {
    title: "Members",
    description: "Source-of-truth member records for sector administration, contact details, vetting, training, and access readiness.",
    typeFilterLabel: "Role / status",
  },
  Patrollers: {
    title: "Patrollers",
    description: "Members approved, pending, or trained for patrol duty. Driver remains the logged-in patroller during patrol sessions.",
    typeFilterLabel: "Patrol status",
  },
  Vehicles: {
    title: "Vehicles",
    description: "Registered patrol vehicles available for sector operations and patrol session assignment.",
    typeFilterLabel: "Vehicle type",
  },
  Residents: {
    title: "Residents",
    description: "Imported resident records maintained as Admin source data, separate from live patrol and Control Room operations.",
    typeFilterLabel: "Import flag",
  },
  Organisations: {
    title: "Organisations",
    description: "Linked organisations and their sector associations for administrative configuration.",
  },
  "Emergency Services": {
    title: "Emergency Services",
    description: "Actual emergency service and operational contact records. Control Room reads these contacts but Admin manages them.",
    typeFilterLabel: "Service type",
  },
  "Incident Codes": {
    title: "Incident Codes",
    description: "Master classification codes used by Patrol, Control Room, Reports, and Intelligence.",
    typeFilterLabel: "Priority",
  },
  "Incident Subcodes": {
    title: "Incident Subcodes",
    description: "Detailed classifications linked to Incident Codes for consistent reporting and analysis.",
    typeFilterLabel: "Parent code",
  },
  "Service Types": {
    title: "Service Types",
    description: "Standard response categories used for Patrol assistance and Control Room coordination.",
    typeFilterLabel: "Category",
  },
  "Infrastructure Types": {
    title: "Infrastructure Types",
    description: "Critical infrastructure and asset classifications used by Patrol reports and future Intelligence analysis.",
    typeFilterLabel: "Risk level",
  },
  "Emergency Contact Types": {
    title: "Emergency Contact Types",
    description: "Escalation and contact categories. These are classifications, not the actual emergency service contacts.",
    typeFilterLabel: "Escalation level",
  },
};
