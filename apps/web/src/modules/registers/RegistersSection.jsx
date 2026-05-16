import React, { useEffect, useState } from "react";
import { API } from "../../core/api";
import { getAuthHeaders, getJsonAuthHeaders } from "../../core/http.utils";
import { getResidentImportMetadata } from "./register.utils";

const INFRASTRUCTURE_RISK_LEVEL_OPTIONS = ["Low", "Medium", "High", "Critical"];
const EMERGENCY_CONTACT_ESCALATION_OPTIONS = ["Level 1", "Level 2", "Level 3", "Critical"];
const MASTER_REGISTER_INCOMPLETE_MESSAGE = "Complete the current row before adding another.";
const MASTER_REGISTER_PERSISTED_MESSAGE = "Records are saved to the backend and persist after refresh.";
const MASTER_REGISTER_SUCCESS_MESSAGE = "Saved.";
const SERVICE_TYPE_CATEGORY_OPTIONS = [
  "Emergency",
  "Security",
  "Municipal",
  "Medical",
  "Utilities",
  "Community",
  "Other",
];
const SERVICE_RECORD_TYPE_OPTIONS = [
  "AMBULANCE",
  "POLICE",
  "FIRE",
  "METRO",
  "TRAFFIC",
  "TOWING",
  "SECURITY_BACKUP",
  "CONTROL_ROOM",
  "MEDICAL_AID",
  "OTHER",
];
const INCIDENT_CODES_ENDPOINT = `${API}/admin/incident-codes`;
const INCIDENT_SUBCODES_ENDPOINT = `${API}/admin/incident-subcodes`;
const SERVICE_TYPES_ENDPOINT = `${API}/admin/service-types`;
const SERVICES_ENDPOINT = `${API}/services`;
const INFRASTRUCTURE_TYPES_ENDPOINT = `${API}/admin/infrastructure-types`;
const EMERGENCY_CONTACT_TYPES_ENDPOINT = `${API}/admin/emergency-contact-types`;

const MASTER_REGISTER_PLACEHOLDERS = {
  // These table shells define the future column structure for full CRUD master
  // registers. Later backend APIs and Prisma models should provide sector-scoped
  // records that may be sector-specific or derived from shared master templates.
  "Incident Codes": {
    description: "Master list of SAPS / primary incident classifications.",
    addLabel: "Add Incident Code",
    columns: ["Incident Code", "Name / Description", "Active"],
  },
  "Incident Subcodes": {
    description: "Detailed classifications linked to Incident Codes.",
    addLabel: "Add Incident Subcode",
    columns: ["Parent Code", "Subcode", "Name", "Active"],
  },
  "Service Types": {
    description: "External and internal service categories coordinated by Control Room.",
    addLabel: "Add Service Type",
    columns: ["Type", "Category", "Control Room Managed", "Active"],
  },
  "Emergency Services": {
    description: "Actual emergency service and operational contact records.",
    addLabel: "Add Emergency Service",
    columns: ["Name", "Type", "Phone", "Other Numbers / Notes", "Sector / Area", "Active"],
  },
  "Infrastructure Types": {
    description: "Types of critical infrastructure and assets.",
    addLabel: "Add Infrastructure Type",
    columns: ["Type", "Risk Level", "Requires Location", "Active"],
  },
  "Emergency Contact Types": {
    description: "Categories of emergency and support contacts.",
    addLabel: "Add Emergency Contact Type",
    columns: ["Type", "Escalation Level", "Sector Specific", "Active"],
  },
};

export default function RegistersSection({
  data,
  registerSearch,
  onRegisterSearchChange,
  onClearRegisterSearch,
  registerTab,
  filteredRegisterVehicles,
  filteredRegisterResidents,
  filteredRegisterMembers,
  filteredRegisterPatrollers,
  filteredRegisterOrganisations,
  onViewVehicle,
  onEditVehicle,
  canManageMembers,
  startAddMember,
  memberForm,
  isEditingMember,
  cancelMemberForm,
  saveMember,
  setMemberForm,
  selectedMember,
  onViewMember,
  onCloseSelectedMember,
  startEditMember,
  updatePatrollerStatus,
  createPatrollerLogin,
  disableMember,
  enableMember,
  memberRoles,
  roleMarker,
  getMemberRoles,
}) {
  // These five master registers are the canonical configuration taxonomy for
  // CivitasWatch: Incident Codes, Incident Subcodes, Service Types,
  // Infrastructure Types, and Emergency Contact Types. Local React state is a
  // temporary frontend-only persistence layer. Each register follows the same
  // reusable CRUD pattern: Add button, editable table rows, and empty state.
  // Backend APIs and Prisma models will later replace this with sector-scoped
  // persistence consumed by Patrol, Control Room, Admin, and Central
  // Intelligence. Sector isolation should allow local customization with
  // optional shared master templates from Master Admin.
  // Local state currently acts as a temporary in-memory repository. Future API
  // endpoints will provide sector-scoped CRUD persistence so each sector (S1,
  // S2, S3, ...) can maintain its own values or inherit shared templates
  // published by Master Admin. Sector overrides must preserve compatibility
  // with the core CivitasWatch taxonomy so Central Intelligence can aggregate
  // standardized values across sectors. This supports local autonomy and
  // cross-sector comparability.
  // Integration plan: initial page load will fetch sector-scoped records from
  // /api/admin/incident-codes, /api/admin/incident-subcodes,
  // /api/admin/service-types, /api/admin/infrastructure-types, and
  // /api/admin/emergency-contact-types. Add actions will become POST requests,
  // inline edits will become PATCH requests, and Delete actions will become
  // DELETE requests. Local state should remain the working UI state after API
  // responses. Active-only records will feed Patrol, Control Room, and
  // Intelligence workflows, and shared template inheritance may prepopulate
  // sector registers on first load.
  // Incident Codes is the first master register backed by the Admin API.
  // Future mapping: incidentCodes -> IncidentCode model via
  // /api/admin/incident-codes. Records will be sector-scoped, may inherit from
  // shared Master Admin templates, and local state is temporary until API
  // persistence is implemented.
  const [incidentCodeRows, setIncidentCodeRows] = useState([]);
  const [incidentCodesLoading, setIncidentCodesLoading] = useState(false);
  const [incidentCodesLoaded, setIncidentCodesLoaded] = useState(false);
  const [incidentCodesError, setIncidentCodesError] = useState("");
  const [incidentCodeSavingIds, setIncidentCodeSavingIds] = useState([]);
  // Incident Codes and Incident Subcodes form a parent-child classification
  // taxonomy; subcodes should not be created without a parent code.
  // Future mapping: incidentSubcodes -> IncidentSubcode model via
  // /api/admin/incident-subcodes. Records will be sector-scoped, may inherit
  // from shared Master Admin templates, and local state is temporary until API
  // persistence is implemented.
  const [incidentSubcodeRows, setIncidentSubcodeRows] = useState([]);
  const [incidentSubcodesLoading, setIncidentSubcodesLoading] = useState(false);
  const [incidentSubcodesLoaded, setIncidentSubcodesLoaded] = useState(false);
  const [incidentSubcodesError, setIncidentSubcodesError] = useState("");
  const [incidentSubcodeSavingIds, setIncidentSubcodeSavingIds] = useState([]);
  // Service Types define standardized response categories. Control Room will
  // use them for dispatch, escalation, and coordination, and Patrol assistance
  // should eventually reference them instead of free-text assistance values.
  // Future mapping: serviceTypes -> ServiceType model via
  // /api/admin/service-types. Records will be sector-scoped, may inherit from
  // shared Master Admin templates, and local state is temporary until API
  // persistence is implemented.
  const [serviceTypeRows, setServiceTypeRows] = useState([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);
  const [serviceTypesLoaded, setServiceTypesLoaded] = useState(false);
  const [serviceTypesError, setServiceTypesError] = useState("");
  const [serviceTypeSavingIds, setServiceTypeSavingIds] = useState([]);
  const [serviceRows, setServiceRows] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [serviceSavingIds, setServiceSavingIds] = useState([]);
  // Infrastructure Types classify monitored assets and critical infrastructure.
  // Risk Level supports prioritisation and future intelligence analysis.
  // Future mapping: infrastructureTypes -> InfrastructureType model via
  // /api/admin/infrastructure-types. Records will be sector-scoped, may inherit
  // from shared Master Admin templates, and local state is temporary until API
  // persistence is implemented.
  const [infrastructureTypeRows, setInfrastructureTypeRows] = useState([]);
  const [infrastructureTypesLoading, setInfrastructureTypesLoading] = useState(false);
  const [infrastructureTypesLoaded, setInfrastructureTypesLoaded] = useState(false);
  const [infrastructureTypesError, setInfrastructureTypesError] = useState("");
  const [infrastructureTypeSavingIds, setInfrastructureTypeSavingIds] = useState([]);
  // Future mapping: emergencyContactTypes -> EmergencyContactType model via
  // /api/admin/emergency-contact-types. Records will be sector-scoped, may
  // inherit from shared Master Admin templates, and local state is temporary
  // until API persistence is implemented.
  const [emergencyContactTypeRows, setEmergencyContactTypeRows] = useState([]);
  const [emergencyContactTypesLoading, setEmergencyContactTypesLoading] = useState(false);
  const [emergencyContactTypesLoaded, setEmergencyContactTypesLoaded] = useState(false);
  const [emergencyContactTypesError, setEmergencyContactTypesError] = useState("");
  const [emergencyContactTypeSavingIds, setEmergencyContactTypeSavingIds] = useState([]);
  const [masterRegisterValidationTab, setMasterRegisterValidationTab] = useState("");
  const [masterRegisterSuccessTab, setMasterRegisterSuccessTab] = useState("");
  const isIncidentCodesRegister = registerTab === "Incident Codes";
  const isIncidentSubcodesRegister = registerTab === "Incident Subcodes";
  const isServiceTypesRegister = registerTab === "Service Types";
  const isEmergencyServicesRegister = registerTab === "Emergency Services";
  const isInfrastructureTypesRegister = registerTab === "Infrastructure Types";
  const isEmergencyContactTypesRegister = registerTab === "Emergency Contact Types";
  const isEditableMasterRegister =
    isIncidentCodesRegister ||
    isIncidentSubcodesRegister ||
    isServiceTypesRegister ||
    isEmergencyServicesRegister ||
    isInfrastructureTypesRegister ||
    isEmergencyContactTypesRegister;

  useEffect(() => {
    if (isIncidentCodesRegister && !incidentCodesLoaded && !incidentCodesLoading) {
      loadIncidentCodes();
    }
  }, [isIncidentCodesRegister, incidentCodesLoaded, incidentCodesLoading]);

  useEffect(() => {
    if (isIncidentSubcodesRegister && !incidentCodesLoaded && !incidentCodesLoading) {
      loadIncidentCodes();
    }

    if (isIncidentSubcodesRegister && !incidentSubcodesLoaded && !incidentSubcodesLoading) {
      loadIncidentSubcodes();
    }
  }, [
    isIncidentSubcodesRegister,
    incidentCodesLoaded,
    incidentCodesLoading,
    incidentSubcodesLoaded,
    incidentSubcodesLoading,
  ]);

  useEffect(() => {
    if (isServiceTypesRegister && !serviceTypesLoaded && !serviceTypesLoading) {
      loadServiceTypes();
    }
  }, [isServiceTypesRegister, serviceTypesLoaded, serviceTypesLoading]);

  useEffect(() => {
    if (isEmergencyServicesRegister && !servicesLoaded && !servicesLoading) {
      loadServices();
    }
  }, [isEmergencyServicesRegister, servicesLoaded, servicesLoading]);

  useEffect(() => {
    if (
      isInfrastructureTypesRegister &&
      !infrastructureTypesLoaded &&
      !infrastructureTypesLoading
    ) {
      loadInfrastructureTypes();
    }
  }, [
    isInfrastructureTypesRegister,
    infrastructureTypesLoaded,
    infrastructureTypesLoading,
  ]);

  useEffect(() => {
    if (
      isEmergencyContactTypesRegister &&
      !emergencyContactTypesLoaded &&
      !emergencyContactTypesLoading
    ) {
      loadEmergencyContactTypes();
    }
  }, [
    isEmergencyContactTypesRegister,
    emergencyContactTypesLoaded,
    emergencyContactTypesLoading,
  ]);

  // The Add button, editable table rows, and empty state establish the layout
  // pattern future master registers should reuse.
  // Validation is frontend-only while these registers use local React state.
  // The guard prevents multiple blank draft rows, while keeping existing rows
  // editable so operators can correct draft values.
  function hasText(value) {
    return String(value || "").trim().length > 0;
  }

  function isIncidentCodeComplete(row) {
    return hasText(row?.code) && hasText(row?.name);
  }

  function getToken() {
    return localStorage.getItem("token");
  }

  function isDraftIncidentCode(row) {
    return String(row?.id || "").startsWith("incident-code-draft-");
  }

  function isDraftIncidentSubcode(row) {
    return String(row?.id || "").startsWith("incident-subcode-draft-");
  }

  function isDraftServiceType(row) {
    return String(row?.id || "").startsWith("service-type-draft-");
  }

  function isDraftService(row) {
    return String(row?.id || "").startsWith("service-draft-");
  }

  function isDraftInfrastructureType(row) {
    return String(row?.id || "").startsWith("infrastructure-type-draft-");
  }

  function isDraftEmergencyContactType(row) {
    return String(row?.id || "").startsWith("emergency-contact-type-draft-");
  }

  function setIncidentCodeSaving(id, isSaving) {
    setIncidentCodeSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function setIncidentSubcodeSaving(id, isSaving) {
    setIncidentSubcodeSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function setServiceTypeSaving(id, isSaving) {
    setServiceTypeSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function setServiceSaving(id, isSaving) {
    setServiceSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function setInfrastructureTypeSaving(id, isSaving) {
    setInfrastructureTypeSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function setEmergencyContactTypeSaving(id, isSaving) {
    setEmergencyContactTypeSavingIds((current) => {
      if (isSaving) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function incidentCodePayload(row) {
    return {
      sectorId: row.sectorId || null,
      code: String(row.code || "").trim(),
      name: String(row.name || "").trim(),
      priority: row.priority || "Medium",
      active: Boolean(row.active),
      templateSourceId: row.templateSourceId || null,
    };
  }

  function normalizeIncidentSubcode(row) {
    return {
      ...row,
      incidentCodeId: row.incidentCodeId || row.incidentCode?.id || "",
      parentCode: row.parentCode || row.incidentCode?.code || "",
      subcode: row.subcode || "",
      name: row.name || "",
      active: row.active ?? true,
    };
  }

  function incidentSubcodePayload(row) {
    return {
      sectorId: row.sectorId || null,
      incidentCodeId: row.incidentCodeId || null,
      subcode: String(row.subcode || "").trim(),
      name: String(row.name || "").trim(),
      active: Boolean(row.active),
      templateSourceId: row.templateSourceId || null,
    };
  }

  function normalizeServiceType(row) {
    return {
      ...row,
      type: row.type || "",
      category: row.category || "Emergency",
      controlRoomManaged: row.controlRoomManaged ?? true,
      active: row.active ?? true,
    };
  }

  function serviceTypePayload(row) {
    return {
      sectorId: row.sectorId || null,
      type: String(row.type || "").trim(),
      category: String(row.category || "Emergency").trim() || "Emergency",
      controlRoomManaged: Boolean(row.controlRoomManaged),
      active: Boolean(row.active),
      templateSourceId: row.templateSourceId || null,
    };
  }

  function normalizeService(row) {
    return {
      ...row,
      name: row.name || "",
      type: row.type || "OTHER",
      phone: row.phone || "",
      radio: row.radio || "",
      sector: row.sector || "",
      isActive: row.isActive ?? true,
    };
  }

  function servicePayload(row) {
    return {
      name: String(row.name || "").trim(),
      type: String(row.type || "OTHER").trim() || "OTHER",
      phone: String(row.phone || "").trim() || null,
      radio: String(row.radio || "").trim() || null,
      sector: String(row.sector || "").trim() || null,
      isActive: Boolean(row.isActive),
    };
  }

  function normalizeInfrastructureType(row) {
    return {
      ...row,
      type: row.type || "",
      riskLevel: row.riskLevel || "Medium",
      requiresLocation: row.requiresLocation ?? true,
      active: row.active ?? true,
    };
  }

  function infrastructureTypePayload(row) {
    return {
      sectorId: row.sectorId || null,
      type: String(row.type || "").trim(),
      riskLevel: String(row.riskLevel || "Medium").trim() || "Medium",
      requiresLocation: Boolean(row.requiresLocation),
      active: Boolean(row.active),
      templateSourceId: row.templateSourceId || null,
    };
  }

  function normalizeEmergencyContactType(row) {
    return {
      ...row,
      type: row.type || "",
      escalationLevel: row.escalationLevel || "Level 1",
      sectorSpecific: row.sectorSpecific ?? true,
      active: row.active ?? true,
    };
  }

  function emergencyContactTypePayload(row) {
    return {
      sectorId: row.sectorId || null,
      type: String(row.type || "").trim(),
      escalationLevel: String(row.escalationLevel || "Level 1").trim() || "Level 1",
      sectorSpecific: Boolean(row.sectorSpecific),
      active: Boolean(row.active),
      templateSourceId: row.templateSourceId || null,
    };
  }

  async function parseApiResponse(res) {
    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function loadIncidentCodes() {
    setIncidentCodesLoading(true);
    setIncidentCodesError("");

    try {
      const res = await fetch(INCIDENT_CODES_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load incident codes.");
      }

      setIncidentCodeRows(Array.isArray(json) ? json : []);
      setIncidentCodesLoaded(true);
    } catch (err) {
      console.error("Failed to load incident codes", err);
      setIncidentCodesError(err.message || "Failed to load incident codes.");
      setIncidentCodesLoaded(true);
    } finally {
      setIncidentCodesLoading(false);
    }
  }

  async function saveIncidentCodeRow(row) {
    if (!row || incidentCodeSavingIds.includes(row.id)) return;

    if (!isIncidentCodeComplete(row)) {
      setMasterRegisterValidationTab("Incident Codes");
      return;
    }

    const isDraft = isDraftIncidentCode(row);
    const endpoint = isDraft ? INCIDENT_CODES_ENDPOINT : `${INCIDENT_CODES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setIncidentCodeSaving(row.id, true);
    setIncidentCodesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(incidentCodePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save incident code.");
      }

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Incident Codes");
      setIncidentCodeRows((current) =>
        current.map((item) => (item.id === row.id ? json : item))
      );
    } catch (err) {
      console.error("Failed to save incident code", err);
      setIncidentCodesError(err.message || "Failed to save incident code.");
    } finally {
      setIncidentCodeSaving(row.id, false);
    }
  }

  function isIncidentSubcodeComplete(row) {
    return hasText(row?.incidentCodeId) && hasText(row?.subcode) && hasText(row?.name);
  }

  async function loadIncidentSubcodes() {
    setIncidentSubcodesLoading(true);
    setIncidentSubcodesError("");

    try {
      const res = await fetch(INCIDENT_SUBCODES_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load incident subcodes.");
      }

      setIncidentSubcodeRows(
        Array.isArray(json) ? json.map((row) => normalizeIncidentSubcode(row)) : []
      );
      setIncidentSubcodesLoaded(true);
    } catch (err) {
      console.error("Failed to load incident subcodes", err);
      setIncidentSubcodesError(err.message || "Failed to load incident subcodes.");
      setIncidentSubcodesLoaded(true);
    } finally {
      setIncidentSubcodesLoading(false);
    }
  }

  async function saveIncidentSubcodeRow(row) {
    if (!row || incidentSubcodeSavingIds.includes(row.id)) return;

    if (!isIncidentSubcodeComplete(row)) {
      setMasterRegisterValidationTab("Incident Subcodes");
      return;
    }

    const isDraft = isDraftIncidentSubcode(row);
    const endpoint = isDraft
      ? INCIDENT_SUBCODES_ENDPOINT
      : `${INCIDENT_SUBCODES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setIncidentSubcodeSaving(row.id, true);
    setIncidentSubcodesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(incidentSubcodePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save incident subcode.");
      }

      const nextRow = normalizeIncidentSubcode(json);

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Incident Subcodes");
      setIncidentSubcodeRows((current) =>
        current.map((item) => (item.id === row.id ? nextRow : item))
      );
    } catch (err) {
      console.error("Failed to save incident subcode", err);
      setIncidentSubcodesError(err.message || "Failed to save incident subcode.");
    } finally {
      setIncidentSubcodeSaving(row.id, false);
    }
  }

  function isServiceTypeComplete(row) {
    return hasText(row?.type);
  }

  async function loadServiceTypes() {
    setServiceTypesLoading(true);
    setServiceTypesError("");

    try {
      const res = await fetch(SERVICE_TYPES_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load service types.");
      }

      setServiceTypeRows(
        Array.isArray(json) ? json.map((row) => normalizeServiceType(row)) : []
      );
      setServiceTypesLoaded(true);
    } catch (err) {
      console.error("Failed to load service types", err);
      setServiceTypesError(err.message || "Failed to load service types.");
      setServiceTypesLoaded(true);
    } finally {
      setServiceTypesLoading(false);
    }
  }

  async function saveServiceTypeRow(row) {
    if (!row || serviceTypeSavingIds.includes(row.id)) return;

    if (!isServiceTypeComplete(row)) {
      setMasterRegisterValidationTab("Service Types");
      return;
    }

    const isDraft = isDraftServiceType(row);
    const endpoint = isDraft ? SERVICE_TYPES_ENDPOINT : `${SERVICE_TYPES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setServiceTypeSaving(row.id, true);
    setServiceTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(serviceTypePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save service type.");
      }

      const nextRow = normalizeServiceType(json);

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Service Types");
      setServiceTypeRows((current) =>
        current.map((item) => (item.id === row.id ? nextRow : item))
      );
    } catch (err) {
      console.error("Failed to save service type", err);
      setServiceTypesError(err.message || "Failed to save service type.");
    } finally {
      setServiceTypeSaving(row.id, false);
    }
  }

  function isServiceComplete(row) {
    return hasText(row?.name) && hasText(row?.type);
  }

  async function loadServices() {
    setServicesLoading(true);
    setServicesError("");

    try {
      const res = await fetch(`${SERVICES_ENDPOINT}?includeInactive=true`, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load emergency services.");
      }

      setServiceRows(Array.isArray(json) ? json.map((row) => normalizeService(row)) : []);
      setServicesLoaded(true);
    } catch (err) {
      console.error("Failed to load emergency services", err);
      setServicesError(err.message || "Failed to load emergency services.");
      setServicesLoaded(true);
    } finally {
      setServicesLoading(false);
    }
  }

  async function saveServiceRow(row) {
    if (!row || serviceSavingIds.includes(row.id)) return;

    if (!isServiceComplete(row)) {
      setMasterRegisterValidationTab("Emergency Services");
      return;
    }

    const isDraft = isDraftService(row);
    const endpoint = isDraft ? SERVICES_ENDPOINT : `${SERVICES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setServiceSaving(row.id, true);
    setServicesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(servicePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save emergency service.");
      }

      const nextRow = normalizeService(json);

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Emergency Services");
      setServiceRows((current) =>
        current.map((item) => (item.id === row.id ? nextRow : item))
      );
    } catch (err) {
      console.error("Failed to save emergency service", err);
      setServicesError(err.message || "Failed to save emergency service.");
    } finally {
      setServiceSaving(row.id, false);
    }
  }

  function isInfrastructureTypeComplete(row) {
    return hasText(row?.type);
  }

  async function loadInfrastructureTypes() {
    setInfrastructureTypesLoading(true);
    setInfrastructureTypesError("");

    try {
      const res = await fetch(INFRASTRUCTURE_TYPES_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load infrastructure types.");
      }

      setInfrastructureTypeRows(
        Array.isArray(json) ? json.map((row) => normalizeInfrastructureType(row)) : []
      );
      setInfrastructureTypesLoaded(true);
    } catch (err) {
      console.error("Failed to load infrastructure types", err);
      setInfrastructureTypesError(err.message || "Failed to load infrastructure types.");
      setInfrastructureTypesLoaded(true);
    } finally {
      setInfrastructureTypesLoading(false);
    }
  }

  async function saveInfrastructureTypeRow(row) {
    if (!row || infrastructureTypeSavingIds.includes(row.id)) return;

    if (!isInfrastructureTypeComplete(row)) {
      setMasterRegisterValidationTab("Infrastructure Types");
      return;
    }

    const isDraft = isDraftInfrastructureType(row);
    const endpoint = isDraft
      ? INFRASTRUCTURE_TYPES_ENDPOINT
      : `${INFRASTRUCTURE_TYPES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setInfrastructureTypeSaving(row.id, true);
    setInfrastructureTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(infrastructureTypePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save infrastructure type.");
      }

      const nextRow = normalizeInfrastructureType(json);

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Infrastructure Types");
      setInfrastructureTypeRows((current) =>
        current.map((item) => (item.id === row.id ? nextRow : item))
      );
    } catch (err) {
      console.error("Failed to save infrastructure type", err);
      setInfrastructureTypesError(err.message || "Failed to save infrastructure type.");
    } finally {
      setInfrastructureTypeSaving(row.id, false);
    }
  }

  function isEmergencyContactTypeComplete(row) {
    return hasText(row?.type);
  }

  async function loadEmergencyContactTypes() {
    setEmergencyContactTypesLoading(true);
    setEmergencyContactTypesError("");

    try {
      const res = await fetch(EMERGENCY_CONTACT_TYPES_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load emergency contact types.");
      }

      setEmergencyContactTypeRows(
        Array.isArray(json) ? json.map((row) => normalizeEmergencyContactType(row)) : []
      );
      setEmergencyContactTypesLoaded(true);
    } catch (err) {
      console.error("Failed to load emergency contact types", err);
      setEmergencyContactTypesError(err.message || "Failed to load emergency contact types.");
      setEmergencyContactTypesLoaded(true);
    } finally {
      setEmergencyContactTypesLoading(false);
    }
  }

  async function saveEmergencyContactTypeRow(row) {
    if (!row || emergencyContactTypeSavingIds.includes(row.id)) return;

    if (!isEmergencyContactTypeComplete(row)) {
      setMasterRegisterValidationTab("Emergency Contact Types");
      return;
    }

    const isDraft = isDraftEmergencyContactType(row);
    const endpoint = isDraft
      ? EMERGENCY_CONTACT_TYPES_ENDPOINT
      : `${EMERGENCY_CONTACT_TYPES_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setEmergencyContactTypeSaving(row.id, true);
    setEmergencyContactTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(emergencyContactTypePayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save emergency contact type.");
      }

      const nextRow = normalizeEmergencyContactType(json);

      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Emergency Contact Types");
      setEmergencyContactTypeRows((current) =>
        current.map((item) => (item.id === row.id ? nextRow : item))
      );
    } catch (err) {
      console.error("Failed to save emergency contact type", err);
      setEmergencyContactTypesError(err.message || "Failed to save emergency contact type.");
    } finally {
      setEmergencyContactTypeSaving(row.id, false);
    }
  }

  function latestRowIsIncomplete(rows, isComplete) {
    return rows.length > 0 && !isComplete(rows[rows.length - 1]);
  }

  function hasLatestIncompleteMasterRow(tab = registerTab) {
    // Required fields mirror the minimum viable fields expected for future
    // backend/API validation with sector-scoped persistence.
    if (tab === "Incident Codes") {
      return latestRowIsIncomplete(incidentCodeRows, isIncidentCodeComplete);
    }

    if (tab === "Incident Subcodes") {
      return latestRowIsIncomplete(incidentSubcodeRows, isIncidentSubcodeComplete);
    }

    if (tab === "Service Types") {
      return latestRowIsIncomplete(serviceTypeRows, isServiceTypeComplete);
    }

    if (tab === "Emergency Services") {
      return latestRowIsIncomplete(serviceRows, isServiceComplete);
    }

    if (tab === "Infrastructure Types") {
      return latestRowIsIncomplete(infrastructureTypeRows, isInfrastructureTypeComplete);
    }

    if (tab === "Emergency Contact Types") {
      return latestRowIsIncomplete(
        emergencyContactTypeRows,
        isEmergencyContactTypeComplete
      );
    }

    return false;
  }

  function addIncidentCodeRow() {
    if (hasLatestIncompleteMasterRow("Incident Codes")) {
      setMasterRegisterValidationTab("Incident Codes");
      return;
    }

    setMasterRegisterValidationTab("");
    setIncidentCodeRows((current) => [
      ...current,
      {
        id: `incident-code-draft-${Date.now()}-${current.length}`,
        code: "",
        name: "",
        priority: "Medium",
        active: true,
      },
    ]);
  }

  function updateIncidentCodeRow(id, field, value) {
    setIncidentCodeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteIncidentCodeRow(id) {
    const row = incidentCodeRows.find((item) => item.id === id);

    if (!row || isDraftIncidentCode(row)) {
      setIncidentCodeRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setIncidentCodesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${INCIDENT_CODES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete incident code.");
      }

      setIncidentCodeRows((current) => current.filter((item) => item.id !== id));
      setMasterRegisterSuccessTab("Incident Codes");
    } catch (err) {
      console.error("Failed to delete incident code", err);
      setIncidentCodesError(err.message || "Failed to delete incident code.");
    }
  }

  function addIncidentSubcodeRow() {
    if (hasLatestIncompleteMasterRow("Incident Subcodes")) {
      setMasterRegisterValidationTab("Incident Subcodes");
      return;
    }

    setMasterRegisterValidationTab("");
    setIncidentSubcodeRows((current) => [
      ...current,
      {
        id: `incident-subcode-draft-${Date.now()}-${current.length}`,
        incidentCodeId: "",
        parentCode: "",
        subcode: "",
        name: "",
        active: true,
      },
    ]);
  }

  function updateIncidentSubcodeRow(id, field, value) {
    setIncidentSubcodeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteIncidentSubcodeRow(id) {
    const row = incidentSubcodeRows.find((item) => item.id === id);

    if (!row || isDraftIncidentSubcode(row)) {
      setIncidentSubcodeRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setIncidentSubcodesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${INCIDENT_SUBCODES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete incident subcode.");
      }

      setIncidentSubcodeRows((current) => current.filter((item) => item.id !== id));
      setMasterRegisterSuccessTab("Incident Subcodes");
    } catch (err) {
      console.error("Failed to delete incident subcode", err);
      setIncidentSubcodesError(err.message || "Failed to delete incident subcode.");
    }
  }

  function addServiceTypeRow() {
    if (hasLatestIncompleteMasterRow("Service Types")) {
      setMasterRegisterValidationTab("Service Types");
      return;
    }

    setMasterRegisterValidationTab("");
    setServiceTypeRows((current) => [
      ...current,
      {
        id: `service-type-draft-${Date.now()}-${current.length}`,
        type: "",
        category: "Emergency",
        controlRoomManaged: true,
        active: true,
      },
    ]);
  }

  function updateServiceTypeRow(id, field, value) {
    setServiceTypeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteServiceTypeRow(id) {
    const row = serviceTypeRows.find((item) => item.id === id);

    if (!row || isDraftServiceType(row)) {
      setServiceTypeRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setServiceTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${SERVICE_TYPES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete service type.");
      }

      setServiceTypeRows((current) => current.filter((item) => item.id !== id));
      setMasterRegisterSuccessTab("Service Types");
    } catch (err) {
      console.error("Failed to delete service type", err);
      setServiceTypesError(err.message || "Failed to delete service type.");
    }
  }

  function addServiceRow() {
    if (hasLatestIncompleteMasterRow("Emergency Services")) {
      setMasterRegisterValidationTab("Emergency Services");
      return;
    }

    setMasterRegisterValidationTab("");
    setServiceRows((current) => [
      ...current,
      {
        id: `service-draft-${Date.now()}-${current.length}`,
        name: "",
        type: "OTHER",
        phone: "",
        radio: "",
        sector: "",
        isActive: true,
      },
    ]);
  }

  function updateServiceRow(id, field, value) {
    setServiceRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteServiceRow(id) {
    const row = serviceRows.find((item) => item.id === id);

    if (!row || isDraftService(row)) {
      setServiceRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setServicesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${SERVICES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate emergency service.");
      }

      const nextRow = normalizeService(json);

      setServiceRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Emergency Services");
    } catch (err) {
      console.error("Failed to deactivate emergency service", err);
      setServicesError(err.message || "Failed to deactivate emergency service.");
    }
  }

  function addInfrastructureTypeRow() {
    if (hasLatestIncompleteMasterRow("Infrastructure Types")) {
      setMasterRegisterValidationTab("Infrastructure Types");
      return;
    }

    setMasterRegisterValidationTab("");
    setInfrastructureTypeRows((current) => [
      ...current,
      {
        id: `infrastructure-type-draft-${Date.now()}-${current.length}`,
        type: "",
        riskLevel: "Medium",
        requiresLocation: true,
        active: true,
      },
    ]);
  }

  function updateInfrastructureTypeRow(id, field, value) {
    setInfrastructureTypeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteInfrastructureTypeRow(id) {
    const row = infrastructureTypeRows.find((item) => item.id === id);

    if (!row || isDraftInfrastructureType(row)) {
      setInfrastructureTypeRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setInfrastructureTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${INFRASTRUCTURE_TYPES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete infrastructure type.");
      }

      setInfrastructureTypeRows((current) => current.filter((item) => item.id !== id));
      setMasterRegisterSuccessTab("Infrastructure Types");
    } catch (err) {
      console.error("Failed to delete infrastructure type", err);
      setInfrastructureTypesError(err.message || "Failed to delete infrastructure type.");
    }
  }

  function addEmergencyContactTypeRow() {
    if (hasLatestIncompleteMasterRow("Emergency Contact Types")) {
      setMasterRegisterValidationTab("Emergency Contact Types");
      return;
    }

    setMasterRegisterValidationTab("");
    setEmergencyContactTypeRows((current) => [
      ...current,
      {
        id: `emergency-contact-type-draft-${Date.now()}-${current.length}`,
        type: "",
        escalationLevel: "Level 1",
        sectorSpecific: true,
        active: true,
      },
    ]);
  }

  function updateEmergencyContactTypeRow(id, field, value) {
    setEmergencyContactTypeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteEmergencyContactTypeRow(id) {
    const row = emergencyContactTypeRows.find((item) => item.id === id);

    if (!row || isDraftEmergencyContactType(row)) {
      setEmergencyContactTypeRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setEmergencyContactTypesError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(`${EMERGENCY_CONTACT_TYPES_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete emergency contact type.");
      }

      setEmergencyContactTypeRows((current) => current.filter((item) => item.id !== id));
      setMasterRegisterSuccessTab("Emergency Contact Types");
    } catch (err) {
      console.error("Failed to delete emergency contact type", err);
      setEmergencyContactTypesError(err.message || "Failed to delete emergency contact type.");
    }
  }

  return (
    <div className="panel">
      <h2>{registerTab}</h2>

      <div className="filter-bar">
        <label>
          Search register
          <input
            value={registerSearch}
            onChange={(e) => onRegisterSearchChange(e.target.value)}
            placeholder="Search code, name, vehicle, sector, status..."
          />
        </label>

        <button onClick={onClearRegisterSearch}>Clear</button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-title">Vehicle Register</div>
          <div className="card-value">{data.vehicles.length}</div>
          <div className="card-detail">Operational vehicles</div>
        </div>

        <div className="card">
          <div className="card-title">Member Register</div>
          <div className="card-value">{filteredRegisterMembers.length}</div>
          <div className="card-detail">Vetted sector members</div>
        </div>

        <div className="card">
          <div className="card-title">Resident Register</div>
          <div className="card-value">{filteredRegisterResidents.length}</div>
          <div className="card-detail">Imported resident records</div>
        </div>

        <div className="card">
          <div className="card-title">Patroller Register</div>
          <div className="card-value">{filteredRegisterPatrollers.length}</div>
          <div className="card-detail">Approved / pending patrol members</div>
        </div>

        <div className="card">
          <div className="card-title">Organisation Register</div>
          <div className="card-value">{data.organisations.length}</div>
          <div className="card-detail">Linked organisations</div>
        </div>
      </div>

      {registerTab === "Vehicles" && (
        <>
          <h3>Vehicle Register</h3>
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make</th>
                <th>Type</th>
                <th>Colour</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.registration || "-"}</td>
                  <td>{vehicle.make || "-"}</td>
                  <td>{vehicle.type || "-"}</td>
                  <td>{vehicle.colour || "-"}</td>
                  <td>{vehicle.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => onViewVehicle(vehicle)}>View</button>
                    <button onClick={onEditVehicle}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Residents" && (
        <>
          <div className="details-header">
            <h3>Resident Register</h3>
            <p className="card-detail">Imported resident records from the resident list.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cell</th>
                <th>Address</th>
                <th>Suburb</th>
                <th>City/Town</th>
                <th>Import ID</th>
                <th>Flags</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterResidents.map((resident) => {
                const metadata = getResidentImportMetadata(resident);

                return (
                  <tr key={resident.id}>
                    <td>
                      {[resident.firstName, resident.surname].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td>{resident.cellNumber || "-"}</td>
                    <td>{resident.address || "-"}</td>
                    <td>{resident.suburb || "-"}</td>
                    <td>{metadata.cityTown || "-"}</td>
                    <td>{metadata.legacyResidentId || "-"}</td>
                    <td>{metadata.flags.length > 0 ? metadata.flags.join(", ") : "-"}</td>
                    <td>{resident.isActive ? "Yes" : "No"}</td>
                    <td>
                      <button onClick={() => onViewMember(resident)}>View Profile</button>
                      {canManageMembers && (
                        <>
                          <button onClick={() => startEditMember(resident)}>Edit</button>
                          {resident.isActive ? (
                            <button onClick={() => disableMember(resident)}>Disable</button>
                          ) : (
                            <button onClick={() => enableMember(resident)}>Enable</button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Members" && (
        <>
          <div className="details-header">
            <h3>Member Register</h3>
            {canManageMembers && (
              <button className="primary-btn" onClick={startAddMember}>
                Add Member
              </button>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Callsign</th>
                <th>Cell</th>
                <th>Sector</th>
                <th>Vetting</th>
                <th>Driver</th>
                <th>Competence</th>
                <th>Roles</th>
                <th>Patrol Status</th>
                <th>Login</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterMembers.map((member) => (
                <tr key={member.id}>
                  <td>{[member.firstName, member.surname].filter(Boolean).join(" ") || "-"}</td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.cellNumber || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>{member.vettingStatus || "-"}</td>
                  <td>
                    {member.driversLicence
                      ? `Yes${member.licenceCode ? ` (${member.licenceCode})` : ""}`
                      : "No"}
                  </td>
                  <td>
                    {[
                      member.firstAid ? "First Aid" : null,
                      member.fireTraining ? "Fire" : null,
                      member.radioTraining ? "Radio" : null,
                      member.patrolTraining ? "Patrol" : null,
                      member.controlRoomTraining ? "Control Room" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                  <td>{getMemberRoles(member).join(", ") || "-"}</td>
                  <td>
                    {member.patrolStatus || "NOT_PATROLLER"}
                    {member.patrolApproved ? " / APPROVED" : ""}
                  </td>
                  <td>
                    {member.user
                      ? `${member.user.email || member.user.fullName} (${member.user.role})`
                      : "No login"}
                  </td>
                  <td>{member.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => onViewMember(member)}>View Profile</button>
                    {canManageMembers && (
                      <>
                        <button onClick={() => startEditMember(member)}>Edit</button>
                        <button onClick={() => updatePatrollerStatus(member, "APPROVED", true)}>
                          Approve Patrol
                        </button>
                        {!member.user && member.email && (
                          <button onClick={() => createPatrollerLogin(member)}>Create Login</button>
                        )}
                        {member.isActive ? (
                          <button onClick={() => disableMember(member)}>Disable</button>
                        ) : (
                          <button onClick={() => enableMember(member)}>Enable</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {memberForm && (
            <div className="incident-details">
              <div className="details-header">
                <h3>{isEditingMember ? "Edit Member" : "Add Member"}</h3>
                <button className="secondary-btn" onClick={cancelMemberForm}>
                  Close
                </button>
              </div>

              <form className="form" onSubmit={saveMember}>
                <label>
                  First Name
                  <input
                    value={memberForm.firstName}
                    onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Surname
                  <input
                    value={memberForm.surname}
                    onChange={(e) => setMemberForm({ ...memberForm, surname: e.target.value })}
                    required
                  />
                </label>

                <label>
                  ID Number
                  <input
                    value={memberForm.idNumber || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, idNumber: e.target.value })}
                  />
                </label>

                <label>
                  Cell Number
                  <input
                    value={memberForm.cellNumber || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, cellNumber: e.target.value })}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={memberForm.email || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  />
                </label>

                <label>
                  Address
                  <input
                    value={memberForm.address || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  />
                </label>

                <label>
                  Suburb
                  <input
                    value={memberForm.suburb || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, suburb: e.target.value })}
                  />
                </label>

                <label>
                  Sector
                  <select
                    value={memberForm.sector || "Sector 1"}
                    onChange={(e) => setMemberForm({ ...memberForm, sector: e.target.value })}
                  >
                    <option>Sector 1</option>
                    <option>Sector 2</option>
                    <option>Sector 3</option>
                    <option>Sector 4</option>
                  </select>
                </label>

                <label>
                  Call Sign
                  <input
                    value={memberForm.callSign || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, callSign: e.target.value })}
                  />
                </label>

                <label>
                  Vetting Status
                  <select
                    value={memberForm.vettingStatus || "PENDING"}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, vettingStatus: e.target.value })
                    }
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  Patrol Status
                  <select
                    value={memberForm.patrolStatus || "NOT_PATROLLER"}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolStatus: e.target.value })
                    }
                  >
                    <option value="NOT_PATROLLER">NOT_PATROLLER</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.patrolApproved)}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        patrolApproved: e.target.checked,
                        patrolStatus: e.target.checked ? "APPROVED" : memberForm.patrolStatus,
                      })
                    }
                  />
                  Approved for Patrol Duty
                </label>

                <label>
                  Patrol Notes
                  <textarea
                    value={memberForm.patrolNotes || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolNotes: e.target.value })
                    }
                  />
                </label>

                <label>
                  Next of Kin Name
                  <input
                    value={memberForm.nextOfKinName || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, nextOfKinName: e.target.value })
                    }
                  />
                </label>

                <label>
                  Next of Kin Phone
                  <input
                    value={memberForm.nextOfKinPhone || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, nextOfKinPhone: e.target.value })
                    }
                  />
                </label>

                <label>
                  Medical Notes
                  <textarea
                    value={memberForm.medicalNotes || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, medicalNotes: e.target.value })
                    }
                  />
                </label>

                <label>
                  Allergies
                  <input
                    value={memberForm.allergies || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, allergies: e.target.value })}
                  />
                </label>

                <label>
                  Medication
                  <input
                    value={memberForm.medication || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, medication: e.target.value })}
                  />
                </label>

                <label>
                  Blood Type
                  <input
                    value={memberForm.bloodType || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, bloodType: e.target.value })}
                  />
                </label>

                <label>
                  Licence Code
                  <input
                    value={memberForm.licenceCode || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, licenceCode: e.target.value })
                    }
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    value={memberForm.notes || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  />
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.isActive)}
                    onChange={(e) => setMemberForm({ ...memberForm, isActive: e.target.checked })}
                  />
                  Active Member
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.driversLicence)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, driversLicence: e.target.checked })
                    }
                  />
                  Driver Licence
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.pdp)}
                    onChange={(e) => setMemberForm({ ...memberForm, pdp: e.target.checked })}
                  />
                  PDP
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.firstAid)}
                    onChange={(e) => setMemberForm({ ...memberForm, firstAid: e.target.checked })}
                  />
                  First Aid
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.fireTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, fireTraining: e.target.checked })
                    }
                  />
                  Fire Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.radioTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, radioTraining: e.target.checked })
                    }
                  />
                  Radio Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.patrolTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolTraining: e.target.checked })
                    }
                  />
                  Patrol Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.controlRoomTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, controlRoomTraining: e.target.checked })
                    }
                  />
                  Control Room Training
                </label>

                <div className="panel">
                  <h3>Member Roles</h3>
                  <p className="card-detail">Select all operational roles this member may perform.</p>

                  {memberRoles.map((role) => (
                    <label key={role}>
                      <input
                        type="checkbox"
                        checked={(memberForm.roles || []).includes(role)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const currentRoles = memberForm.roles || [];

                          setMemberForm({
                            ...memberForm,
                            roles: checked
                              ? Array.from(new Set([...currentRoles, role]))
                              : currentRoles.filter((item) => item !== role),
                          });
                        }}
                      />
                      {role.replace("_", " ")}
                    </label>
                  ))}
                </div>

                <div className="action-row">
                  <button className="primary-btn" type="submit">
                    {isEditingMember ? "Update Member" : "Create Member"}
                  </button>
                  <button className="secondary-btn" type="button" onClick={cancelMemberForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {selectedMember && (
            <div className="incident-details">
              <div className="details-header">
                <h3>Member Profile</h3>
                <button className="secondary-btn" onClick={onCloseSelectedMember}>
                  Close
                </button>
              </div>

              <p>
                <strong>Name:</strong>{" "}
                {[selectedMember.firstName, selectedMember.surname].filter(Boolean).join(" ") ||
                  "-"}
              </p>
              <p>
                <strong>Callsign:</strong> {selectedMember.callSign || "-"}
              </p>
              <p>
                <strong>Cell:</strong> {selectedMember.cellNumber || "-"}
              </p>
              <p>
                <strong>Email:</strong> {selectedMember.email || "-"}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {[selectedMember.address, selectedMember.suburb].filter(Boolean).join(", ") || "-"}
              </p>
              <p>
                <strong>Sector:</strong> {selectedMember.sector || "-"}
              </p>
              <p>
                <strong>Vetting:</strong> {selectedMember.vettingStatus || "-"}
              </p>
              <p>
                <strong>Patrol Status:</strong> {selectedMember.patrolStatus || "NOT_PATROLLER"}
                {selectedMember.patrolApproved ? " / APPROVED" : ""}
              </p>
              <p>
                <strong>Login:</strong>{" "}
                {selectedMember.user
                  ? `${selectedMember.user.email || selectedMember.user.fullName} (${selectedMember.user.role})`
                  : "No linked login"}
              </p>
              <p>
                <strong>Roles:</strong> {getMemberRoles(selectedMember).join(", ") || "-"}
              </p>
              <p>
                <strong>Next of Kin:</strong>{" "}
                {[selectedMember.nextOfKinName, selectedMember.nextOfKinPhone]
                  .filter(Boolean)
                  .join(" - ") || "-"}
              </p>
              <p>
                <strong>Medical Notes:</strong> {selectedMember.medicalNotes || "-"}
              </p>
              <p>
                <strong>Allergies:</strong> {selectedMember.allergies || "-"}
              </p>
              <p>
                <strong>Medication:</strong> {selectedMember.medication || "-"}
              </p>
              <p>
                <strong>Blood Type:</strong> {selectedMember.bloodType || "-"}
              </p>
              <p>
                <strong>Driver Licence:</strong> {selectedMember.driversLicence ? "Yes" : "No"}
              </p>
              <p>
                <strong>Licence Code:</strong> {selectedMember.licenceCode || "-"}
              </p>
              <p>
                <strong>PDP:</strong> {selectedMember.pdp ? "Yes" : "No"}
              </p>
              <p>
                <strong>Competencies:</strong>{" "}
                {[
                  selectedMember.firstAid ? "First Aid" : null,
                  selectedMember.fireTraining ? "Fire Training" : null,
                  selectedMember.radioTraining ? "Radio Training" : null,
                  selectedMember.patrolTraining ? "Patrol Training" : null,
                  selectedMember.controlRoomTraining ? "Control Room Training" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
              <p>
                <strong>Patrol Notes:</strong> {selectedMember.patrolNotes || "-"}
              </p>
              <p>
                <strong>Notes:</strong>{" "}
                {(selectedMember.notes || "")
                  .split("\n")
                  .filter((line) => !line.startsWith(roleMarker))
                  .join("\n") || "-"}
              </p>
              {canManageMembers && (
                <div className="action-row">
                  <button onClick={() => startEditMember(selectedMember)}>Edit Member</button>
                  <button onClick={() => updatePatrollerStatus(selectedMember, "APPROVED", true)}>
                    Approve Patrol
                  </button>
                  <button onClick={() => updatePatrollerStatus(selectedMember, "SUSPENDED", false)}>
                    Suspend Patrol
                  </button>
                  {!selectedMember.user && selectedMember.email && (
                    <button onClick={() => createPatrollerLogin(selectedMember)}>
                      Create Patroller Login
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {registerTab === "Patrollers" && (
        <>
          <div className="details-header">
            <h3>Patroller Register</h3>
            <p className="card-detail">
              Live-ready patroller records. Create the member first, then approve patrol duty and
              create/link login.
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Login</th>
                <th>Callsign</th>
                <th>Sector</th>
                <th>Patrol Status</th>
                <th>Training</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterPatrollers.map((member) => (
                <tr key={member.id}>
                  <td>{[member.firstName, member.surname].filter(Boolean).join(" ") || "-"}</td>
                  <td>{member.user?.email || member.email || "No email"}</td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>
                    {member.patrolStatus || "NOT_PATROLLER"}
                    {member.patrolApproved ? " / APPROVED" : ""}
                  </td>
                  <td>{member.patrolTraining ? "Patrol trained" : "Training not marked"}</td>
                  <td>
                    <button onClick={() => onViewMember(member)}>View</button>
                    <button onClick={() => startEditMember(member)}>Edit</button>
                    <button onClick={() => updatePatrollerStatus(member, "APPROVED", true)}>
                      Approve
                    </button>
                    <button onClick={() => updatePatrollerStatus(member, "SUSPENDED", false)}>
                      Suspend
                    </button>
                    {!member.user && member.email && (
                      <button onClick={() => createPatrollerLogin(member)}>Create Login</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Organisations" && (
        <>
          <h3>Organisation Register</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Sectors</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterOrganisations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name || "-"}</td>
                  <td>{org.code || "-"}</td>
                  <td>{org.sectors?.map((s) => s.name).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/*
        Master register tabs are intentionally UI-only until backend support is
        added. These "Coming soon" panels reserve navigation for future CRUD
        screens. Incident Codes and Incident Subcodes will become canonical
        classification registers for patrols, Control Room, and intelligence:
        patrol mobile incident capture will select them, Control Room will use
        them for dispatch/escalation/service coordination, and Central
        Intelligence will use them for analytics, heatmaps, and trend detection.
        Service Types will define response categories, Infrastructure Types will
        classify monitored assets, and Emergency Contact Types will structure
        contact directories. Sector isolation should scope these registers per
        sector, with optional shared master templates.
        The disabled Add buttons reserve toolbar layout for future create
        actions. Incident Codes/Subcodes will become mandatory classification
        references for capture and analytics; Service Types will drive dispatch
        and coordination; Infrastructure Types will classify assets; Emergency
        Contact Types will structure escalation directories.
      */}
      {/*
        Master registers form CivitasWatch's canonical operational taxonomy.
        Patrol, Control Room, Admin, and Central Intelligence should all
        reference the same standardized code sets so reporting stays consistent
        across sectors. Sector isolation allows local customization while
        preserving shared governance templates; Master Admin may publish
        templates that sectors adopt or override. Central Intelligence depends
        on these classifications for cross-sector analytics and benchmarking.
      */}
      {/*
        Strategically, these registers establish a single source of truth for
        operational classifications. Incident Codes/Subcodes standardize incident
        taxonomy, Service Types standardize Control Room resource coordination,
        Infrastructure Types standardize asset and critical infrastructure
        classification, and Emergency Contact Types standardize escalation and
        contact directory structures. Consistent classifications enable
        comparable reporting, intelligence analysis, benchmarking, and heatmaps.
        Sector-level overrides may customize local registers while preserving
        compatibility with Master Admin templates. Central Intelligence depends
        on shared classifications for cross-sector pattern detection and
        strategic reporting.
      */}
      {MASTER_REGISTER_PLACEHOLDERS[registerTab] && (
        <div className="panel">
          <h3>{registerTab}</h3>
          <p>{MASTER_REGISTER_PLACEHOLDERS[registerTab].description}</p>
          <p className="card-detail">
            {MASTER_REGISTER_PERSISTED_MESSAGE}
          </p>
          {/*
            Incident Codes will become the primary classification register used
            across Patrol, Control Room, Admin, and Central Intelligence. Future
            master registers should follow this same local-state pattern before
            backend API persistence is introduced.
          */}
          {isIncidentCodesRegister && (
            <p className="card-detail">
              Incident Code is the SAPS/master classification code such as 001, 023,
              or 105. Operational SAPS/EMS/Control Room reference numbers are captured
              separately during incident response and are not stored here.
            </p>
          )}
          <button
            className="secondary-btn"
            disabled={
              !isIncidentCodesRegister &&
              !isIncidentSubcodesRegister &&
              !isServiceTypesRegister &&
              !isEmergencyServicesRegister &&
              !isInfrastructureTypesRegister &&
              !isEmergencyContactTypesRegister
            }
            onClick={
              isIncidentCodesRegister
                ? addIncidentCodeRow
                : isIncidentSubcodesRegister
                  ? addIncidentSubcodeRow
                  : isServiceTypesRegister
                    ? addServiceTypeRow
                    : isEmergencyServicesRegister
                      ? addServiceRow
                      : isInfrastructureTypesRegister
                        ? addInfrastructureTypeRow
                        : isEmergencyContactTypesRegister
                          ? addEmergencyContactTypeRow
                          : undefined
            }
          >
            {MASTER_REGISTER_PLACEHOLDERS[registerTab].addLabel}
          </button>
          {masterRegisterValidationTab === registerTab &&
            hasLatestIncompleteMasterRow(registerTab) && (
              <p className="card-detail">{MASTER_REGISTER_INCOMPLETE_MESSAGE}</p>
            )}
          {masterRegisterSuccessTab === registerTab && (
            <p className="card-detail">{MASTER_REGISTER_SUCCESS_MESSAGE}</p>
          )}
          {isIncidentCodesRegister && incidentCodesLoading && (
            <p className="card-detail">Loading incident codes...</p>
          )}
          {isIncidentCodesRegister && incidentCodesError && (
            <p className="card-detail">{incidentCodesError}</p>
          )}
          {isIncidentSubcodesRegister && (incidentSubcodesLoading || incidentCodesLoading) && (
            <p className="card-detail">Loading incident subcodes...</p>
          )}
          {isIncidentSubcodesRegister && incidentSubcodesError && (
            <p className="card-detail">{incidentSubcodesError}</p>
          )}
          {isServiceTypesRegister && serviceTypesLoading && (
            <p className="card-detail">Loading service types...</p>
          )}
          {isServiceTypesRegister && serviceTypesError && (
            <p className="card-detail">{serviceTypesError}</p>
          )}
          {isEmergencyServicesRegister && servicesLoading && (
            <p className="card-detail">Loading emergency services...</p>
          )}
          {isEmergencyServicesRegister && servicesError && (
            <p className="card-detail">{servicesError}</p>
          )}
          {isInfrastructureTypesRegister && infrastructureTypesLoading && (
            <p className="card-detail">Loading infrastructure types...</p>
          )}
          {isInfrastructureTypesRegister && infrastructureTypesError && (
            <p className="card-detail">{infrastructureTypesError}</p>
          )}
          {isEmergencyContactTypesRegister && emergencyContactTypesLoading && (
            <p className="card-detail">Loading emergency contact types...</p>
          )}
          {isEmergencyContactTypesRegister && emergencyContactTypesError && (
            <p className="card-detail">{emergencyContactTypesError}</p>
          )}

          <table>
            <thead>
              <tr>
                {MASTER_REGISTER_PLACEHOLDERS[registerTab].columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                {isEditableMasterRegister && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isIncidentCodesRegister && incidentCodeRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      aria-label="Incident Code"
                      placeholder="001"
                      value={row.code}
                      onChange={(event) =>
                        updateIncidentCodeRow(row.id, "code", event.target.value)
                      }
                      onBlur={(event) =>
                        saveIncidentCodeRow({ ...row, code: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.name}
                      placeholder="Back in Contact"
                      onChange={(event) =>
                        updateIncidentCodeRow(row.id, "name", event.target.value)
                      }
                      onBlur={(event) =>
                        saveIncidentCodeRow({ ...row, name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => {
                        const nextRow = { ...row, active: event.target.checked };
                        updateIncidentCodeRow(row.id, "active", event.target.checked);
                        saveIncidentCodeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={incidentCodeSavingIds.includes(row.id)}
                      onClick={() => deleteIncidentCodeRow(row.id)}
                    >
                      {incidentCodeSavingIds.includes(row.id) ? "Saving..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {isIncidentSubcodesRegister && incidentSubcodeRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {/* The Parent Code dropdown demonstrates master registers referencing each other. */}
                    {incidentCodeRows.length === 0 ? (
                      incidentCodesLoading ? "Loading parent codes..." : "Create Incident Codes first."
                    ) : (
                      <select
                        value={row.incidentCodeId || ""}
                        onChange={(event) => {
                          const selectedIncidentCode = incidentCodeRows.find(
                            (incidentCode) => incidentCode.id === event.target.value
                          );

                          updateIncidentSubcodeRow(row.id, "incidentCodeId", event.target.value);
                          updateIncidentSubcodeRow(
                            row.id,
                            "parentCode",
                            selectedIncidentCode?.code || ""
                          );
                        }}
                        onBlur={(event) => {
                          const selectedIncidentCode = incidentCodeRows.find(
                            (incidentCode) => incidentCode.id === event.target.value
                          );

                          saveIncidentSubcodeRow({
                            ...row,
                            incidentCodeId: event.target.value,
                            parentCode: selectedIncidentCode?.code || "",
                          });
                        }}
                      >
                        <option value="">Select parent code</option>
                        {incidentCodeRows.map((incidentCode) => (
                          <option key={incidentCode.id} value={incidentCode.id}>
                            {incidentCode.code || "Unnamed code"}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <input
                      value={row.subcode}
                      onChange={(event) =>
                        updateIncidentSubcodeRow(row.id, "subcode", event.target.value)
                      }
                      onBlur={(event) =>
                        saveIncidentSubcodeRow({ ...row, subcode: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.name}
                      onChange={(event) =>
                        updateIncidentSubcodeRow(row.id, "name", event.target.value)
                      }
                      onBlur={(event) =>
                        saveIncidentSubcodeRow({ ...row, name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => {
                        const nextRow = { ...row, active: event.target.checked };
                        updateIncidentSubcodeRow(row.id, "active", event.target.checked);
                        saveIncidentSubcodeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={incidentSubcodeSavingIds.includes(row.id)}
                      onClick={() => deleteIncidentSubcodeRow(row.id)}
                    >
                      {incidentSubcodeSavingIds.includes(row.id) ? "Saving..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {isServiceTypesRegister && serviceTypeRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.type}
                      onChange={(event) =>
                        updateServiceTypeRow(row.id, "type", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceTypeRow({ ...row, type: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.category}
                      onChange={(event) =>
                        updateServiceTypeRow(row.id, "category", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceTypeRow({ ...row, category: event.target.value })
                      }
                    >
                      {SERVICE_TYPE_CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {/* Control Room Managed means this service must be coordinated through Control Room. */}
                    <input
                      type="checkbox"
                      checked={row.controlRoomManaged}
                      onChange={(event) => {
                        const nextRow = { ...row, controlRoomManaged: event.target.checked };
                        updateServiceTypeRow(
                          row.id,
                          "controlRoomManaged",
                          event.target.checked
                        );
                        saveServiceTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => {
                        const nextRow = { ...row, active: event.target.checked };
                        updateServiceTypeRow(row.id, "active", event.target.checked);
                        saveServiceTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={serviceTypeSavingIds.includes(row.id)}
                      onClick={() => deleteServiceTypeRow(row.id)}
                    >
                      {serviceTypeSavingIds.includes(row.id) ? "Saving..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {isEmergencyServicesRegister && serviceRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.name}
                      placeholder="South African Police Service"
                      onChange={(event) =>
                        updateServiceRow(row.id, "name", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.type}
                      onChange={(event) =>
                        updateServiceRow(row.id, "type", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, type: event.target.value })
                      }
                    >
                      {SERVICE_RECORD_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={row.phone || ""}
                      placeholder="10111"
                      onChange={(event) =>
                        updateServiceRow(row.id, "phone", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, phone: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.radio || ""}
                      placeholder="Other numbers / notes"
                      onChange={(event) =>
                        updateServiceRow(row.id, "radio", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, radio: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.sector || ""}
                      placeholder="All sectors"
                      onChange={(event) =>
                        updateServiceRow(row.id, "sector", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, sector: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => {
                        const nextRow = { ...row, isActive: event.target.checked };
                        updateServiceRow(row.id, "isActive", event.target.checked);
                        saveServiceRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={serviceSavingIds.includes(row.id)}
                      onClick={() => deleteServiceRow(row.id)}
                    >
                      {serviceSavingIds.includes(row.id) ? "Saving..." : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}

              {isInfrastructureTypesRegister && infrastructureTypeRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.type}
                      onChange={(event) =>
                        updateInfrastructureTypeRow(row.id, "type", event.target.value)
                      }
                      onBlur={(event) =>
                        saveInfrastructureTypeRow({ ...row, type: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.riskLevel}
                      onChange={(event) =>
                        updateInfrastructureTypeRow(row.id, "riskLevel", event.target.value)
                      }
                      onBlur={(event) =>
                        saveInfrastructureTypeRow({ ...row, riskLevel: event.target.value })
                      }
                    >
                      {INFRASTRUCTURE_RISK_LEVEL_OPTIONS.map((riskLevel) => (
                        <option key={riskLevel} value={riskLevel}>
                          {riskLevel}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {/* Requires Location means address/coordinate data should be mandatory for this type. */}
                    <input
                      type="checkbox"
                      checked={row.requiresLocation}
                      onChange={(event) => {
                        const nextRow = { ...row, requiresLocation: event.target.checked };
                        updateInfrastructureTypeRow(
                          row.id,
                          "requiresLocation",
                          event.target.checked
                        );
                        saveInfrastructureTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => {
                        const nextRow = { ...row, active: event.target.checked };
                        updateInfrastructureTypeRow(row.id, "active", event.target.checked);
                        saveInfrastructureTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={infrastructureTypeSavingIds.includes(row.id)}
                      onClick={() => deleteInfrastructureTypeRow(row.id)}
                    >
                      {infrastructureTypeSavingIds.includes(row.id) ? "Saving..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {isEmergencyContactTypesRegister && emergencyContactTypeRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.type}
                      onChange={(event) =>
                        updateEmergencyContactTypeRow(row.id, "type", event.target.value)
                      }
                      onBlur={(event) =>
                        saveEmergencyContactTypeRow({ ...row, type: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.escalationLevel}
                      onChange={(event) =>
                        updateEmergencyContactTypeRow(
                          row.id,
                          "escalationLevel",
                          event.target.value
                        )
                      }
                      onBlur={(event) =>
                        saveEmergencyContactTypeRow({
                          ...row,
                          escalationLevel: event.target.value,
                        })
                      }
                    >
                      {EMERGENCY_CONTACT_ESCALATION_OPTIONS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.sectorSpecific}
                      onChange={(event) => {
                        const nextRow = { ...row, sectorSpecific: event.target.checked };
                        updateEmergencyContactTypeRow(
                          row.id,
                          "sectorSpecific",
                          event.target.checked
                        );
                        saveEmergencyContactTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => {
                        const nextRow = { ...row, active: event.target.checked };
                        updateEmergencyContactTypeRow(row.id, "active", event.target.checked);
                        saveEmergencyContactTypeRow(nextRow);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      disabled={emergencyContactTypeSavingIds.includes(row.id)}
                      onClick={() => deleteEmergencyContactTypeRow(row.id)}
                    >
                      {emergencyContactTypeSavingIds.includes(row.id) ? "Saving..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {/*
                Prisma relations and API validation should eventually enforce
                this dependency. Patrol and Control Room will require primary
                and detailed classifications, while Central Intelligence uses
                the hierarchy for granular analytics and trend detection.
                Backend integration will also persist Service Types by sector.
                Infrastructure Types will later support infrastructure
                incidents, risk reviews, asset monitoring, and sector-scoped
                persistence.
              */}
              {((!isIncidentCodesRegister &&
                !isIncidentSubcodesRegister &&
                !isServiceTypesRegister &&
                !isEmergencyServicesRegister &&
                !isInfrastructureTypesRegister &&
                !isEmergencyContactTypesRegister) ||
                (isIncidentCodesRegister && incidentCodeRows.length === 0) ||
                (isIncidentSubcodesRegister && incidentSubcodeRows.length === 0) ||
                (isServiceTypesRegister && serviceTypeRows.length === 0) ||
                (isEmergencyServicesRegister && serviceRows.length === 0) ||
                (isInfrastructureTypesRegister && infrastructureTypeRows.length === 0) ||
                (isEmergencyContactTypesRegister && emergencyContactTypeRows.length === 0)) && (
                <tr>
                  <td
                    colSpan={
                      MASTER_REGISTER_PLACEHOLDERS[registerTab].columns.length +
                      (isEditableMasterRegister ? 1 : 0)
                    }
                  >
                    No records configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
