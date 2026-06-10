import React, { useEffect, useState } from "react";
import { API } from "../../core/api";
import { VEHICLE_ENDPOINTS } from "../../core/endpoints";
import { getAuthHeaders, getJsonAuthHeaders } from "../../core/http.utils";
import { REGISTER_METADATA } from "./register.constants";
import { getResidentImportMetadata } from "./register.utils";

const INFRASTRUCTURE_RISK_LEVEL_OPTIONS = ["Low", "Medium", "High", "Critical"];
const EMERGENCY_CONTACT_ESCALATION_OPTIONS = ["Level 1", "Level 2", "Level 3", "Critical"];
const AREA_TYPE_OPTIONS = ["SUBURB", "AREA", "BUSINESS_AREA", "PARK", "SCHOOL", "OTHER"];
const MASTER_REGISTER_INCOMPLETE_MESSAGE = "Complete the current row before adding another.";
const MASTER_REGISTER_PERSISTED_MESSAGE = "Records are saved to the backend and persist after refresh.";
const MASTER_REGISTER_SUCCESS_MESSAGE = "Saved.";
const ALL_FILTER_VALUE = "ALL";
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
const AREAS_ENDPOINT = `${API}/admin/areas`;
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
  "Areas / Suburbs": {
    description: "Canonical reporting areas and known aliases for suburb spelling variants.",
    addLabel: "Add Area / Suburb",
    columns: ["Official Name", "Type", "Sector", "Aliases", "Active"],
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
  canManageVehicles,
  onViewVehicle,
  onEditVehicle,
  refreshAdminData,
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
  // /api/admin/emergency-contact-types. Add actions use POST requests, inline
  // edits use PATCH requests, and persisted removals should deactivate records
  // instead of hard-deleting operational history references. Local state should
  // remain the working UI state after API responses. Active-only records will feed Patrol, Control Room, and
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
  const [areaRows, setAreaRows] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [areasError, setAreasError] = useState("");
  const [areaSavingIds, setAreaSavingIds] = useState([]);
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
  const [vehicleForm, setVehicleForm] = useState(null);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [masterRegisterValidationTab, setMasterRegisterValidationTab] = useState("");
  const [masterRegisterSuccessTab, setMasterRegisterSuccessTab] = useState("");
  const [registerActiveFilter, setRegisterActiveFilter] = useState(ALL_FILTER_VALUE);
  const [registerSectorFilter, setRegisterSectorFilter] = useState(ALL_FILTER_VALUE);
  const [registerTypeFilter, setRegisterTypeFilter] = useState(ALL_FILTER_VALUE);
  const isIncidentCodesRegister = registerTab === "Incident Codes";
  const isIncidentSubcodesRegister = registerTab === "Incident Subcodes";
  const isAreasRegister = registerTab === "Areas / Suburbs";
  const isServiceTypesRegister = registerTab === "Service Types";
  const isEmergencyServicesRegister = registerTab === "Emergency Services";
  const isInfrastructureTypesRegister = registerTab === "Infrastructure Types";
  const isEmergencyContactTypesRegister = registerTab === "Emergency Contact Types";
  const isEditableMasterRegister =
    isIncidentCodesRegister ||
    isIncidentSubcodesRegister ||
    isAreasRegister ||
    isServiceTypesRegister ||
    isEmergencyServicesRegister ||
    isInfrastructureTypesRegister ||
    isEmergencyContactTypesRegister;
  const registerMetadata = REGISTER_METADATA[registerTab] || {
    title: registerTab,
    description: "Administrative source-of-truth register.",
  };

  useEffect(() => {
    setRegisterActiveFilter(ALL_FILTER_VALUE);
    setRegisterSectorFilter(ALL_FILTER_VALUE);
    setRegisterTypeFilter(ALL_FILTER_VALUE);
  }, [registerTab]);

  useEffect(() => {
    if (registerTab !== "Vehicles") {
      setVehicleForm(null);
      setVehicleError("");
      setVehicleSaving(false);
    }
  }, [registerTab]);

  useEffect(() => {
    if (!canManageVehicles) {
      setVehicleForm(null);
      setVehicleError("");
      setVehicleSaving(false);
    }
  }, [canManageVehicles]);

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
    if (isAreasRegister && !areasLoaded && !areasLoading) {
      loadAreas();
    }
  }, [isAreasRegister, areasLoaded, areasLoading]);

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

  function isDraftArea(row) {
    return String(row?.id || "").startsWith("area-draft-");
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

  function setAreaSaving(id, isSaving) {
    setAreaSavingIds((current) => {
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

  function startAddVehicle() {
    if (!canManageVehicles) return;

    setVehicleError("");
    setVehicleForm({
      registration: "",
      make: "",
      type: "",
      colour: "",
    });
  }

  function cancelVehicleForm() {
    setVehicleForm(null);
    setVehicleError("");
  }

  async function saveVehicle(event) {
    event.preventDefault();

    if (!canManageVehicles || !vehicleForm || vehicleSaving) return;

    const registration = String(vehicleForm.registration || "").trim().toUpperCase();

    if (!registration) {
      setVehicleError("Registration is required.");
      return;
    }

    setVehicleSaving(true);
    setVehicleError("");

    try {
      const res = await fetch(VEHICLE_ENDPOINTS.create, {
        method: "POST",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({
          registration,
          make: String(vehicleForm.make || "").trim() || null,
          type: String(vehicleForm.type || "").trim() || null,
          colour: String(vehicleForm.colour || "").trim() || null,
        }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save vehicle.");
      }

      setVehicleForm(null);

      if (typeof refreshAdminData === "function") {
        await refreshAdminData();
      }
    } catch (err) {
      console.error("Failed to save vehicle", err);
      setVehicleError(err.message || "Failed to save vehicle.");
    } finally {
      setVehicleSaving(false);
    }
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

  function normalizeArea(row) {
    return {
      ...row,
      officialName: row.officialName || row.name || "",
      type: row.type || "SUBURB",
      sectorId: row.sectorId || "",
      active: row.active ?? true,
      notes: row.notes || "",
      sortOrder: row.sortOrder ?? "",
      aliasText: Array.isArray(row.aliases)
        ? row.aliases
            .filter((alias) => alias.active !== false)
            .map((alias) => alias.alias)
            .join(", ")
        : row.aliasText || "",
    };
  }

  function areaPayload(row) {
    return {
      sectorId: row.sectorId || null,
      officialName: String(row.officialName || "").trim(),
      type: String(row.type || "SUBURB").trim() || "SUBURB",
      active: Boolean(row.active),
      notes: String(row.notes || "").trim() || null,
      sortOrder: row.sortOrder === "" || row.sortOrder === null ? null : Number(row.sortOrder),
    };
  }

  function areaAliasesFromText(value) {
    return String(value || "")
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);
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

  function isAreaComplete(row) {
    return hasText(row?.officialName);
  }

  async function loadAreas() {
    setAreasLoading(true);
    setAreasError("");

    try {
      const res = await fetch(AREAS_ENDPOINT, {
        headers: getAuthHeaders(getToken()),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load areas.");
      }

      setAreaRows(Array.isArray(json) ? json.map((row) => normalizeArea(row)) : []);
      setAreasLoaded(true);
    } catch (err) {
      console.error("Failed to load areas", err);
      setAreasError(err.message || "Failed to load areas.");
      setAreasLoaded(true);
    } finally {
      setAreasLoading(false);
    }
  }

  async function saveAreaAliases(area, aliasText) {
    const requestedAliases = areaAliasesFromText(aliasText);
    const requestedKeys = new Set(requestedAliases.map((alias) => alias.toLowerCase()));
    const existingAliases = new Map(
      (area.aliases || []).map((alias) => [String(alias.alias || "").trim().toLowerCase(), alias])
    );

    for (const existingAlias of area.aliases || []) {
      const key = String(existingAlias.alias || "").trim().toLowerCase();
      if (!requestedKeys.has(key) && existingAlias.active !== false) {
        const res = await fetch(`${AREAS_ENDPOINT.replace("/areas", "/area-aliases")}/${existingAlias.id}`, {
          method: "PATCH",
          headers: getJsonAuthHeaders(getToken()),
          body: JSON.stringify({ active: false }),
        });
        const json = await parseApiResponse(res);

        if (!res.ok) {
          throw new Error(json?.error || `Failed to deactivate alias ${existingAlias.alias}.`);
        }
      }
    }

    for (const alias of requestedAliases) {
      const key = alias.toLowerCase();
      const existingAlias = existingAliases.get(key);

      if (existingAlias) {
        if (existingAlias.active === false) {
          const res = await fetch(`${AREAS_ENDPOINT.replace("/areas", "/area-aliases")}/${existingAlias.id}`, {
            method: "PATCH",
            headers: getJsonAuthHeaders(getToken()),
            body: JSON.stringify({ active: true }),
          });
          const json = await parseApiResponse(res);

          if (!res.ok) {
            throw new Error(json?.error || `Failed to reactivate alias ${alias}.`);
          }
        }
        continue;
      }

      const res = await fetch(`${AREAS_ENDPOINT}/${area.id}/aliases`, {
        method: "POST",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ alias, active: true }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to save alias ${alias}.`);
      }
    }
  }

  async function saveAreaRow(row) {
    if (!row || areaSavingIds.includes(row.id)) return;

    if (!isAreaComplete(row)) {
      setMasterRegisterValidationTab("Areas / Suburbs");
      return;
    }

    const isDraft = isDraftArea(row);
    const endpoint = isDraft ? AREAS_ENDPOINT : `${AREAS_ENDPOINT}/${row.id}`;
    const method = isDraft ? "POST" : "PATCH";

    setAreaSaving(row.id, true);
    setAreasError("");
    setMasterRegisterSuccessTab("");

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify(areaPayload(row)),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save area.");
      }

      await saveAreaAliases(json, row.aliasText);
      await loadAreas();
      setMasterRegisterValidationTab("");
      setMasterRegisterSuccessTab("Areas / Suburbs");
    } catch (err) {
      console.error("Failed to save area", err);
      setAreasError(err.message || "Failed to save area.");
    } finally {
      setAreaSaving(row.id, false);
    }
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

    if (tab === "Areas / Suburbs") {
      return latestRowIsIncomplete(areaRows, isAreaComplete);
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
    setIncidentCodeSaving(id, true);

    try {
      const res = await fetch(`${INCIDENT_CODES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate incident code.");
      }

      setIncidentCodeRows((current) =>
        current.map((item) => (item.id === id ? json : item))
      );
      setMasterRegisterSuccessTab("Incident Codes");
    } catch (err) {
      console.error("Failed to deactivate incident code", err);
      setIncidentCodesError(err.message || "Failed to deactivate incident code.");
    } finally {
      setIncidentCodeSaving(id, false);
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
    setIncidentSubcodeSaving(id, true);

    try {
      const res = await fetch(`${INCIDENT_SUBCODES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate incident subcode.");
      }

      const nextRow = normalizeIncidentSubcode(json);

      setIncidentSubcodeRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Incident Subcodes");
    } catch (err) {
      console.error("Failed to deactivate incident subcode", err);
      setIncidentSubcodesError(err.message || "Failed to deactivate incident subcode.");
    } finally {
      setIncidentSubcodeSaving(id, false);
    }
  }

  function addAreaRow() {
    if (hasLatestIncompleteMasterRow("Areas / Suburbs")) {
      setMasterRegisterValidationTab("Areas / Suburbs");
      return;
    }

    setMasterRegisterValidationTab("");
    setAreaRows((current) => [
      ...current,
      {
        id: `area-draft-${Date.now()}-${current.length}`,
        officialName: "",
        type: "SUBURB",
        sectorId: "",
        aliasText: "",
        active: true,
      },
    ]);
  }

  function updateAreaRow(id, field, value) {
    setAreaRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function deleteAreaRow(id) {
    const row = areaRows.find((item) => item.id === id);

    if (!row || isDraftArea(row)) {
      setAreaRows((current) => current.filter((item) => item.id !== id));
      return;
    }

    setAreasError("");
    setMasterRegisterSuccessTab("");
    setAreaSaving(id, true);

    try {
      const res = await fetch(`${AREAS_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate area.");
      }

      const nextRow = normalizeArea(json);

      setAreaRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Areas / Suburbs");
    } catch (err) {
      console.error("Failed to deactivate area", err);
      setAreasError(err.message || "Failed to deactivate area.");
    } finally {
      setAreaSaving(id, false);
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
    setServiceTypeSaving(id, true);

    try {
      const res = await fetch(`${SERVICE_TYPES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate service type.");
      }

      const nextRow = normalizeServiceType(json);

      setServiceTypeRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Service Types");
    } catch (err) {
      console.error("Failed to deactivate service type", err);
      setServiceTypesError(err.message || "Failed to deactivate service type.");
    } finally {
      setServiceTypeSaving(id, false);
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
    setServiceSaving(id, true);

    try {
      const res = await fetch(`${SERVICES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ isActive: false }),
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
    } finally {
      setServiceSaving(id, false);
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
    setInfrastructureTypeSaving(id, true);

    try {
      const res = await fetch(`${INFRASTRUCTURE_TYPES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate infrastructure type.");
      }

      const nextRow = normalizeInfrastructureType(json);

      setInfrastructureTypeRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Infrastructure Types");
    } catch (err) {
      console.error("Failed to deactivate infrastructure type", err);
      setInfrastructureTypesError(err.message || "Failed to deactivate infrastructure type.");
    } finally {
      setInfrastructureTypeSaving(id, false);
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
    setEmergencyContactTypeSaving(id, true);

    try {
      const res = await fetch(`${EMERGENCY_CONTACT_TYPES_ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(getToken()),
        body: JSON.stringify({ active: false }),
      });
      const json = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to deactivate emergency contact type.");
      }

      const nextRow = normalizeEmergencyContactType(json);

      setEmergencyContactTypeRows((current) =>
        current.map((item) => (item.id === id ? nextRow : item))
      );
      setMasterRegisterSuccessTab("Emergency Contact Types");
    } catch (err) {
      console.error("Failed to deactivate emergency contact type", err);
      setEmergencyContactTypesError(err.message || "Failed to deactivate emergency contact type.");
    } finally {
      setEmergencyContactTypeSaving(id, false);
    }
  }

  function normalizeFilterValue(value) {
    return String(value || "").trim();
  }

  function getActiveValue(record) {
    if (!record || typeof record !== "object") return null;
    if (record.isActive !== undefined) return Boolean(record.isActive);
    if (record.active !== undefined) return Boolean(record.active);
    return null;
  }

  function matchesActiveFilter(record) {
    if (registerActiveFilter === ALL_FILTER_VALUE) return true;
    const activeValue = getActiveValue(record);
    if (activeValue === null) return true;
    return registerActiveFilter === "ACTIVE" ? activeValue : !activeValue;
  }

  function getSectorValues(record) {
    if (!record || typeof record !== "object") return [];
    const directValues = [
      record.sector,
      record.sectorName,
      record.sectorCode,
      record.sectorId,
    ].filter(Boolean);
    const nestedValues = Array.isArray(record.sectors)
      ? record.sectors.flatMap((sector) => [sector?.name, sector?.code, sector?.id])
      : [];

    return [...directValues, ...nestedValues].map(normalizeFilterValue).filter(Boolean);
  }

  function matchesSectorFilter(record) {
    if (registerSectorFilter === ALL_FILTER_VALUE) return true;
    return getSectorValues(record).includes(registerSectorFilter);
  }

  function getTypeFilterValue(record, tab = registerTab) {
    if (!record || typeof record !== "object") return "";

    if (tab === "Members") {
      return getMemberRoles(record)[0] || record.patrolStatus || record.vettingStatus || "";
    }

    if (tab === "Patrollers") return record.patrolStatus || "NOT_SET";
    if (tab === "Vehicles") return record.type || "";
    if (tab === "Residents") {
      const metadata = getResidentImportMetadata(record);
      return metadata.flags[0] || metadata.source || "Imported";
    }
    if (tab === "Incident Codes") return record.priority || "";
    if (tab === "Incident Subcodes") {
      return record.parentCode || record.incidentCode?.code || "";
    }
    if (tab === "Areas / Suburbs") return record.type || "";
    if (tab === "Service Types") return record.category || "";
    if (tab === "Emergency Services") return record.type || "";
    if (tab === "Infrastructure Types") return record.riskLevel || "";
    if (tab === "Emergency Contact Types") return record.escalationLevel || "";

    return "";
  }

  function matchesTypeFilter(record, tab = registerTab) {
    if (registerTypeFilter === ALL_FILTER_VALUE) return true;
    return normalizeFilterValue(getTypeFilterValue(record, tab)) === registerTypeFilter;
  }

  function getRegisterSearchValues(record, tab = registerTab) {
    if (!record || typeof record !== "object") return [];

    if (tab === "Incident Codes") {
      return [record.code, record.name, record.priority, record.active ? "active" : "inactive"];
    }

    if (tab === "Incident Subcodes") {
      return [
        record.parentCode,
        record.incidentCode?.code,
        record.subcode,
        record.name,
        record.active ? "active" : "inactive",
      ];
    }

    if (tab === "Areas / Suburbs") {
      return [
        record.officialName,
        record.type,
        record.sectorId,
        record.sector?.name,
        record.sector?.code,
        record.aliasText,
        record.notes,
        record.active ? "active" : "inactive",
      ];
    }

    if (tab === "Service Types") {
      return [
        record.type,
        record.category,
        record.controlRoomManaged ? "control room managed" : "not control room managed",
        record.active ? "active" : "inactive",
      ];
    }

    if (tab === "Emergency Services") {
      return [
        record.name,
        record.type,
        record.phone,
        record.radio,
        record.sector,
        record.isActive ? "active" : "inactive",
      ];
    }

    if (tab === "Infrastructure Types") {
      return [
        record.type,
        record.riskLevel,
        record.requiresLocation ? "requires location" : "location optional",
        record.active ? "active" : "inactive",
      ];
    }

    if (tab === "Emergency Contact Types") {
      return [
        record.type,
        record.escalationLevel,
        record.sectorSpecific ? "sector specific" : "shared",
        record.active ? "active" : "inactive",
      ];
    }

    return [];
  }

  function matchesSearchFilter(record, tab = registerTab) {
    const query = String(registerSearch || "").trim().toLowerCase();
    if (!query) return true;
    return getRegisterSearchValues(record, tab)
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function applyRegisterFilters(rows, tab = registerTab) {
    return rows.filter(
      (row) =>
        matchesActiveFilter(row) &&
        matchesSectorFilter(row) &&
        matchesTypeFilter(row, tab) &&
        matchesSearchFilter(row, tab)
    );
  }

  function getUniqueOptions(rows, getValue) {
    return [
      ...new Set(
        rows
          .flatMap((row) => {
            const value = getValue(row);
            return Array.isArray(value) ? value : [value];
          })
          .map(normalizeFilterValue)
          .filter(Boolean)
      ),
    ].sort();
  }

  function getCurrentRegisterRows() {
    if (registerTab === "Members") return filteredRegisterMembers;
    if (registerTab === "Patrollers") return filteredRegisterPatrollers;
    if (registerTab === "Vehicles") return filteredRegisterVehicles;
    if (registerTab === "Residents") return filteredRegisterResidents;
    if (registerTab === "Organisations") return filteredRegisterOrganisations;
    if (registerTab === "Incident Codes") return incidentCodeRows;
    if (registerTab === "Incident Subcodes") return incidentSubcodeRows;
    if (registerTab === "Areas / Suburbs") return areaRows;
    if (registerTab === "Service Types") return serviceTypeRows;
    if (registerTab === "Emergency Services") return serviceRows;
    if (registerTab === "Infrastructure Types") return infrastructureTypeRows;
    if (registerTab === "Emergency Contact Types") return emergencyContactTypeRows;
    return [];
  }

  const currentRegisterRows = getCurrentRegisterRows();
  const sectorFilterOptions = getUniqueOptions(currentRegisterRows, getSectorValues);
  const typeFilterOptions = getUniqueOptions(currentRegisterRows, (row) =>
    getTypeFilterValue(row)
  );
  const supportsActiveFilter = currentRegisterRows.some((row) => getActiveValue(row) !== null);
  const supportsSectorFilter = sectorFilterOptions.length > 0;
  const supportsTypeFilter = Boolean(registerMetadata.typeFilterLabel) && typeFilterOptions.length > 0;
  const displayedRegisterVehicles = applyRegisterFilters(filteredRegisterVehicles, "Vehicles");
  const displayedRegisterResidents = applyRegisterFilters(filteredRegisterResidents, "Residents");
  const displayedRegisterMembers = applyRegisterFilters(filteredRegisterMembers, "Members");
  const displayedRegisterPatrollers = applyRegisterFilters(filteredRegisterPatrollers, "Patrollers");
  const displayedRegisterOrganisations = applyRegisterFilters(
    filteredRegisterOrganisations,
    "Organisations"
  );
  const displayedIncidentCodeRows = applyRegisterFilters(incidentCodeRows, "Incident Codes");
  const displayedIncidentSubcodeRows = applyRegisterFilters(
    incidentSubcodeRows,
    "Incident Subcodes"
  );
  const displayedAreaRows = applyRegisterFilters(areaRows, "Areas / Suburbs");
  const displayedServiceTypeRows = applyRegisterFilters(serviceTypeRows, "Service Types");
  const displayedServiceRows = applyRegisterFilters(serviceRows, "Emergency Services");
  const displayedInfrastructureTypeRows = applyRegisterFilters(
    infrastructureTypeRows,
    "Infrastructure Types"
  );
  const displayedEmergencyContactTypeRows = applyRegisterFilters(
    emergencyContactTypeRows,
    "Emergency Contact Types"
  );

  function getEmptyStateMessage(sourceRows) {
    const hasFilters =
      String(registerSearch || "").trim().length > 0 ||
      registerActiveFilter !== ALL_FILTER_VALUE ||
      registerSectorFilter !== ALL_FILTER_VALUE ||
      registerTypeFilter !== ALL_FILTER_VALUE;

    if (sourceRows.length === 0 && !hasFilters) return "No records configured yet.";
    if (registerActiveFilter === "ACTIVE") return "No active records found.";
    if (registerActiveFilter === "INACTIVE") return "No inactive records found.";
    return hasFilters ? "No records match current filters." : "No records configured yet.";
  }

  function renderEmptyTableRow(sourceRows, colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="empty-table-cell">
          {getEmptyStateMessage(sourceRows)}
        </td>
      </tr>
    );
  }

  return (
    <div className="panel register-panel">
      <div className="register-header">
        <div>
          <h2>{registerMetadata.title}</h2>
          <p className="card-detail">{registerMetadata.description}</p>
        </div>
      </div>

      <div className="filter-bar register-filter-bar">
        <label>
          Search register
          <input
            value={registerSearch}
            onChange={(e) => onRegisterSearchChange(e.target.value)}
            placeholder="Search code, name, vehicle, sector, status..."
          />
        </label>

        <label>
          Active status
          <select
            value={registerActiveFilter}
            onChange={(e) => setRegisterActiveFilter(e.target.value)}
            disabled={!supportsActiveFilter}
          >
            <option value={ALL_FILTER_VALUE}>All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
        </label>

        <label>
          Sector
          <select
            value={registerSectorFilter}
            onChange={(e) => setRegisterSectorFilter(e.target.value)}
            disabled={!supportsSectorFilter}
          >
            <option value={ALL_FILTER_VALUE}>All sectors</option>
            {sectorFilterOptions.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </label>

        <label>
          {registerMetadata.typeFilterLabel || "Type / category"}
          <select
            value={registerTypeFilter}
            onChange={(e) => setRegisterTypeFilter(e.target.value)}
            disabled={!supportsTypeFilter}
          >
            <option value={ALL_FILTER_VALUE}>All</option>
            {typeFilterOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            onClearRegisterSearch();
            setRegisterActiveFilter(ALL_FILTER_VALUE);
            setRegisterSectorFilter(ALL_FILTER_VALUE);
            setRegisterTypeFilter(ALL_FILTER_VALUE);
          }}
        >
          Clear
        </button>
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
          <div className="details-header">
            <div>
              <h3>Vehicle Register</h3>
              <p className="card-detail">Registered patrol vehicles available for admin use.</p>
            </div>
            {canManageVehicles && (
              <button className="primary-btn" type="button" onClick={startAddVehicle}>
                Add Vehicle
              </button>
            )}
          </div>

          {canManageVehicles && vehicleForm && (
            <div className="incident-details">
              <div className="details-header">
                <h3>Add Vehicle</h3>
                <button className="secondary-btn" type="button" onClick={cancelVehicleForm}>
                  Close
                </button>
              </div>

              <form className="form" onSubmit={saveVehicle}>
                <label>
                  Registration
                  <input
                    value={vehicleForm.registration}
                    onChange={(event) =>
                      setVehicleForm({
                        ...vehicleForm,
                        registration: event.target.value.toUpperCase(),
                      })
                    }
                    required
                    autoCapitalize="characters"
                    spellCheck="false"
                  />
                </label>

                <label>
                  Make
                  <input
                    value={vehicleForm.make}
                    onChange={(event) =>
                      setVehicleForm({ ...vehicleForm, make: event.target.value })
                    }
                  />
                </label>

                <label>
                  Type
                  <input
                    value={vehicleForm.type}
                    onChange={(event) =>
                      setVehicleForm({ ...vehicleForm, type: event.target.value })
                    }
                  />
                </label>

                <label>
                  Colour
                  <input
                    value={vehicleForm.colour}
                    onChange={(event) =>
                      setVehicleForm({ ...vehicleForm, colour: event.target.value })
                    }
                  />
                </label>

                {vehicleError && <p className="card-detail">{vehicleError}</p>}

                <div className="action-row">
                  <button className="primary-btn" type="submit" disabled={vehicleSaving}>
                    {vehicleSaving ? "Saving..." : "Save Vehicle"}
                  </button>
                  <button className="secondary-btn" type="button" onClick={cancelVehicleForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

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
              {displayedRegisterVehicles.length === 0
                ? renderEmptyTableRow(filteredRegisterVehicles, 6)
                : displayedRegisterVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.registration || "-"}</td>
                  <td>{vehicle.make || "-"}</td>
                  <td>{vehicle.type || "-"}</td>
                  <td>{vehicle.colour || "-"}</td>
                  <td>
                    <span className={vehicle.isActive ? "status-pill active" : "status-pill inactive"}>
                      {vehicle.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => onViewVehicle(vehicle)}>View</button>
                    {canManageVehicles && <button onClick={onEditVehicle}>Edit</button>}
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
              {displayedRegisterResidents.length === 0
                ? renderEmptyTableRow(filteredRegisterResidents, 9)
                : displayedRegisterResidents.map((resident) => {
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
                    <td>
                      <span className={resident.isActive ? "status-pill active" : "status-pill inactive"}>
                        {resident.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
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
              {displayedRegisterMembers.length === 0
                ? renderEmptyTableRow(filteredRegisterMembers, 12)
                : displayedRegisterMembers.map((member) => (
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
                  <td>
                    <span className={member.isActive ? "status-pill active" : "status-pill inactive"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
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
              {displayedRegisterPatrollers.length === 0
                ? renderEmptyTableRow(filteredRegisterPatrollers, 7)
                : displayedRegisterPatrollers.map((member) => (
                <tr key={member.id}>
                  <td>{[member.firstName, member.surname].filter(Boolean).join(" ") || "-"}</td>
                  <td>{member.user?.email || member.email || "No email"}</td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>
                    <span className={member.patrolApproved ? "status-pill active" : "status-pill"}>
                      {member.patrolStatus || "NOT_PATROLLER"}
                      {member.patrolApproved ? " / APPROVED" : ""}
                    </span>
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

      {registerTab !== "Members" && memberForm && (
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
            <div className="action-row">
              <button className="primary-btn" type="submit">
                Update Member
              </button>
              <button className="secondary-btn" type="button" onClick={cancelMemberForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {registerTab !== "Members" && selectedMember && (
        <div className="incident-details">
          <div className="details-header">
            <h3>Member Profile</h3>
            <button className="secondary-btn" onClick={onCloseSelectedMember}>
              Close
            </button>
          </div>
          <p>
            <strong>Name:</strong>{" "}
            {[selectedMember.firstName, selectedMember.surname].filter(Boolean).join(" ") || "-"}
          </p>
          <p><strong>Callsign:</strong> {selectedMember.callSign || "-"}</p>
          <p><strong>Cell:</strong> {selectedMember.cellNumber || "-"}</p>
          <p><strong>Email:</strong> {selectedMember.email || "-"}</p>
          <p>
            <strong>Address:</strong>{" "}
            {[selectedMember.address, selectedMember.suburb].filter(Boolean).join(", ") || "-"}
          </p>
          <p><strong>Sector:</strong> {selectedMember.sector || "-"}</p>
          <p>
            <strong>Patrol Status:</strong> {selectedMember.patrolStatus || "NOT_PATROLLER"}
            {selectedMember.patrolApproved ? " / APPROVED" : ""}
          </p>
          <p><strong>Roles:</strong> {getMemberRoles(selectedMember).join(", ") || "-"}</p>
          <p><strong>Notes:</strong> {selectedMember.notes || "-"}</p>
          {canManageMembers && (
            <div className="action-row">
              <button onClick={() => startEditMember(selectedMember)}>Edit Member</button>
              <button onClick={() => updatePatrollerStatus(selectedMember, "APPROVED", true)}>
                Approve Patrol
              </button>
              <button onClick={() => updatePatrollerStatus(selectedMember, "SUSPENDED", false)}>
                Suspend Patrol
              </button>
              {selectedMember.isActive ? (
                <button onClick={() => disableMember(selectedMember)}>Disable</button>
              ) : (
                <button onClick={() => enableMember(selectedMember)}>Enable</button>
              )}
            </div>
          )}
        </div>
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
              {displayedRegisterOrganisations.length === 0
                ? renderEmptyTableRow(filteredRegisterOrganisations, 3)
                : displayedRegisterOrganisations.map((org) => (
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
              !isAreasRegister &&
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
                  : isAreasRegister
                    ? addAreaRow
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
          {isEditableMasterRegister && !isEmergencyServicesRegister && (
            <p className="card-detail">
              Turn Active off to deactivate values that may be referenced by operational history.
              Draft rows can be removed before they are saved.
            </p>
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
          {isAreasRegister && areasLoading && (
            <p className="card-detail">Loading areas and aliases...</p>
          )}
          {isAreasRegister && areasError && (
            <p className="card-detail">{areasError}</p>
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

          <div className="register-table-scroll">
          <table className={isEmergencyServicesRegister ? "emergency-services-register-table" : ""}>
            <thead>
              <tr>
                {MASTER_REGISTER_PLACEHOLDERS[registerTab].columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                {isEditableMasterRegister && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isIncidentCodesRegister && displayedIncidentCodeRows.map((row) => (
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateIncidentCodeRow(row.id, "active", event.target.checked);
                          saveIncidentCodeRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        incidentCodeSavingIds.includes(row.id) ||
                        (!isDraftIncidentCode(row) && !row.active)
                      }
                      onClick={() => deleteIncidentCodeRow(row.id)}
                    >
                      {incidentCodeSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftIncidentCode(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isIncidentSubcodesRegister && displayedIncidentSubcodeRows.map((row) => (
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateIncidentSubcodeRow(row.id, "active", event.target.checked);
                          saveIncidentSubcodeRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        incidentSubcodeSavingIds.includes(row.id) ||
                        (!isDraftIncidentSubcode(row) && !row.active)
                      }
                      onClick={() => deleteIncidentSubcodeRow(row.id)}
                    >
                      {incidentSubcodeSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftIncidentSubcode(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isAreasRegister && displayedAreaRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.officialName}
                      placeholder="Valhalla"
                      onChange={(event) =>
                        updateAreaRow(row.id, "officialName", event.target.value)
                      }
                      onBlur={(event) =>
                        saveAreaRow({ ...row, officialName: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.type}
                      onChange={(event) => {
                        const nextRow = { ...row, type: event.target.value };
                        updateAreaRow(row.id, "type", event.target.value);
                        saveAreaRow(nextRow);
                      }}
                    >
                      {AREA_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={row.sectorId || ""}
                      placeholder={row.sector?.name || "Optional sector ID"}
                      onChange={(event) =>
                        updateAreaRow(row.id, "sectorId", event.target.value)
                      }
                      onBlur={(event) =>
                        saveAreaRow({ ...row, sectorId: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.aliasText || ""}
                      placeholder="Vahalla, Valhala"
                      onChange={(event) =>
                        updateAreaRow(row.id, "aliasText", event.target.value)
                      }
                      onBlur={(event) =>
                        saveAreaRow({ ...row, aliasText: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateAreaRow(row.id, "active", event.target.checked);
                          saveAreaRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={areaSavingIds.includes(row.id) || (!isDraftArea(row) && !row.active)}
                      onClick={() => deleteAreaRow(row.id)}
                    >
                      {areaSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftArea(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isServiceTypesRegister && displayedServiceTypeRows.map((row) => (
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateServiceTypeRow(row.id, "active", event.target.checked);
                          saveServiceTypeRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        serviceTypeSavingIds.includes(row.id) ||
                        (!isDraftServiceType(row) && !row.active)
                      }
                      onClick={() => deleteServiceTypeRow(row.id)}
                    >
                      {serviceTypeSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftServiceType(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isEmergencyServicesRegister && displayedServiceRows.map((row) => (
                <tr key={row.id}>
                  <td className="service-name-cell">
                    <input
                      className="service-field service-name-input"
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
                  <td className="service-type-cell">
                    <select
                      className="service-field service-type-input"
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
                  <td className="service-phone-cell">
                    <input
                      className="service-field service-phone-input"
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
                  <td className="service-notes-cell">
                    <textarea
                      className="service-field service-notes-input"
                      value={row.radio || ""}
                      placeholder="Other numbers / notes"
                      rows={3}
                      onChange={(event) =>
                        updateServiceRow(row.id, "radio", event.target.value)
                      }
                      onBlur={(event) =>
                        saveServiceRow({ ...row, radio: event.target.value })
                      }
                    />
                  </td>
                  <td className="service-sector-cell">
                    <input
                      className="service-field service-sector-input"
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) => {
                          const nextRow = { ...row, isActive: event.target.checked };
                          updateServiceRow(row.id, "isActive", event.target.checked);
                          saveServiceRow(nextRow);
                        }}
                      />
                      <span className={row.isActive ? "status-pill active" : "status-pill inactive"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        serviceSavingIds.includes(row.id) ||
                        (!isDraftService(row) && !row.isActive)
                      }
                      onClick={() => deleteServiceRow(row.id)}
                    >
                      {serviceSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftService(row)
                          ? "Remove"
                          : row.isActive
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isInfrastructureTypesRegister && displayedInfrastructureTypeRows.map((row) => (
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateInfrastructureTypeRow(row.id, "active", event.target.checked);
                          saveInfrastructureTypeRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        infrastructureTypeSavingIds.includes(row.id) ||
                        (!isDraftInfrastructureType(row) && !row.active)
                      }
                      onClick={() => deleteInfrastructureTypeRow(row.id)}
                    >
                      {infrastructureTypeSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftInfrastructureType(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {isEmergencyContactTypesRegister && displayedEmergencyContactTypeRows.map((row) => (
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
                    <label className="inline-status-toggle">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => {
                          const nextRow = { ...row, active: event.target.checked };
                          updateEmergencyContactTypeRow(row.id, "active", event.target.checked);
                          saveEmergencyContactTypeRow(nextRow);
                        }}
                      />
                      <span className={row.active ? "status-pill active" : "status-pill inactive"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button
                      disabled={
                        emergencyContactTypeSavingIds.includes(row.id) ||
                        (!isDraftEmergencyContactType(row) && !row.active)
                      }
                      onClick={() => deleteEmergencyContactTypeRow(row.id)}
                    >
                      {emergencyContactTypeSavingIds.includes(row.id)
                        ? "Saving..."
                        : isDraftEmergencyContactType(row)
                          ? "Remove"
                          : row.active
                            ? "Deactivate"
                            : "Inactive"}
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
                !isAreasRegister &&
                !isServiceTypesRegister &&
                !isEmergencyServicesRegister &&
                !isInfrastructureTypesRegister &&
                !isEmergencyContactTypesRegister) ||
                (isIncidentCodesRegister && displayedIncidentCodeRows.length === 0) ||
                (isIncidentSubcodesRegister && displayedIncidentSubcodeRows.length === 0) ||
                (isAreasRegister && displayedAreaRows.length === 0) ||
                (isServiceTypesRegister && displayedServiceTypeRows.length === 0) ||
                (isEmergencyServicesRegister && displayedServiceRows.length === 0) ||
                (isInfrastructureTypesRegister && displayedInfrastructureTypeRows.length === 0) ||
                (isEmergencyContactTypesRegister && displayedEmergencyContactTypeRows.length === 0)) && (
                <tr>
                  <td
                    colSpan={
                      MASTER_REGISTER_PLACEHOLDERS[registerTab].columns.length +
                      (isEditableMasterRegister ? 1 : 0)
                    }
                  >
                    {getEmptyStateMessage(
                      isIncidentCodesRegister
                        ? incidentCodeRows
                        : isIncidentSubcodesRegister
                          ? incidentSubcodeRows
                          : isAreasRegister
                            ? areaRows
                            : isServiceTypesRegister
                              ? serviceTypeRows
                              : isEmergencyServicesRegister
                                ? serviceRows
                                : isInfrastructureTypesRegister
                                  ? infrastructureTypeRows
                                  : emergencyContactTypeRows
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
