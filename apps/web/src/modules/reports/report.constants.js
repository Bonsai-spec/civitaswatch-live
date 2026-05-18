export const DEFAULT_REPORT_FILTERS = {
  from: "",
  to: "",
  sector: "ALL",
  vehicleId: "ALL",
  patrollerId: "ALL",
  status: "ALL",
  search: "",
  month: "",
  callSign: "",
  severity: "ALL",
  incidentCode: "ALL",
  incidentSubcode: "ALL",
  serviceType: "ALL",
  referenceNumber: "",
  infrastructureType: "ALL",
  riskLevel: "ALL",
};

export const REPORT_CATEGORIES = [
  "Monthly Community Safety Trends",
  "Patroller Activity",
  "Incident Reports",
  "Patrol Reports",
  "Assistance Request Reports",
  "Infrastructure Summary / Detail",
  "Vehicle Usage",
];

export const REPORT_SECTOR_FILTER_OPTIONS = [
  { value: "ALL", label: "All Sectors" },
  { value: "Sector 1", label: "Sector 1" },
  { value: "Sector 2", label: "Sector 2" },
  { value: "Sector 3", label: "Sector 3" },
  { value: "Sector 4", label: "Sector 4" },
];

export const REPORT_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];
