export const REGISTER_TABS = [
  // Operational registers are current live/record data views. Do not remove
  // these existing tabs while master register support is introduced.
  "Incidents",
  "Vehicles",
  "Residents",
  "Members",
  "Patrollers",
  "Patrols",
  "Organisations",
  // Master registers are future configuration lists. Incident Codes/Subcodes
  // must remain separate from operational Incident Reports.
  "Incident Codes",
  "Incident Subcodes",
  // These placeholders need schema/API support before becoming editable.
  "Service Types",
  "Infrastructure Types",
  "Emergency Contact Types",
];
