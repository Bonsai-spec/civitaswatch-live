import React, { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../core/api";
import {
  MEMBER_ENDPOINTS,
  PATROL_ENDPOINTS,
  ADMIN_REGISTER_ENDPOINTS,
  VEHICLE_ENDPOINTS,
} from "../../core/endpoints";

const ACTIVE_PATROL_STATUSES = ["ACTIVE", "NOTIFIED", "EN_ROUTE", "ON_SCENE", "STAND_DOWN", "MOBILE"];
const INCIDENT_STATUS_ACTIONS = [
  {
    label: "En Route",
    type: "EN_ROUTE",
  },
  {
    label: "On Scene",
    type: "ON_SCENE",
  },
  {
    label: "Stand Down",
    type: "STAND_DOWN",
  },
  {
    label: "Resume Patrol",
    type: "RESUME_PATROL",
  },
];
const PATROL_STATUS_ACTIONS = [
  {
    label: "Started Patrol",
    type: "RESUME_PATROL",
  },
  {
    label: "En Route",
    type: "EN_ROUTE",
  },
  {
    label: "On Scene",
    type: "ON_SCENE",
  },
  {
    label: "Stand Down",
    type: "STAND_DOWN",
  },
  {
    label: "Resume Patrol",
    type: "MOBILE",
  },
];

const INCIDENT_CODES_ENDPOINT = `${API}/admin/incident-codes`;
const INCIDENT_SUBCODES_ENDPOINT = `${API}/admin/incident-subcodes`;
const SERVICE_TYPES_ENDPOINT = `${API}/admin/service-types`;
const INFRASTRUCTURE_TYPES_ENDPOINT = `${API}/admin/infrastructure-types`;

const OBSERVATION_TYPES = [
  "General",
  "Suspicious Vehicle",
  "Suspicious Person",
  "Suspicious Place",
  "Community Tip",
  "Infrastructure Concern",
];

const OBSERVATION_TAGS = [
  "Suspicious Vehicle",
  "Suspicious Person",
  "Suspicious Place",
  "Possible CCTV",
  "Requires Follow-up",
  "Community Tip",
  "Unverified",
];

const COMMUNITY_TIP_SOURCE_TYPES = [
  "Community member",
  "WhatsApp",
  "Anonymous",
  "CCTV",
  "Security company",
  "SAPS",
  "Municipal",
  "Other",
];

const INITIAL_START_FORM = {
  vehicleId: "",
  callSign: "",
  sector: "Sector 1",
  startKm: "",
  crewCallSigns: "",
};

const INITIAL_EVENT_FORM = {
  type: "MOBILE",
  referenceNumber: "",
  incidentCode: "",
  incidentCodeId: "",
  incidentSubcodeId: "",
  incidentType: "",
  serviceTypeId: "",
  infrastructureTypeId: "",
  infrastructureType: "",
  areaId: "",
  description: "",
  assistance: "",
  streetNumber: "",
  streetName: "",
  suburb: "",
  locationNotes: "",
  latitude: "",
  longitude: "",
  observationType: "General",
  observationTags: [],
  vehicleRegistration: "",
  vehiclePartialRegistration: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleColour: "",
  vehicleType: "",
  vehicleOccupants: "",
  vehicleDirection: "",
  vehicleMarks: "",
  personAlias: "",
  personClothing: "",
  personDescription: "",
  personBehaviour: "",
  personDirection: "",
  personVehicle: "",
  personAssociates: "",
  placeName: "",
  premisesType: "",
  placeConcernReason: "",
  placeObservedActivity: "",
  communityTipSourceType: "Community member",
  communityTipSummary: "",
  communityTipInformationStatus: "Unverified",
  infrastructureConcernNotes: "",
};

const PATROL_ACTIONS = {
  emergency: {
    type: "MOBILE",
    description: "",
    formTitle: "Emergency Assistance",
    submitLabel: "Request Assistance",
  },
  incidentResponse: {
    type: "NOTIFIED",
    description: "",
    formTitle: "Incident Response",
    submitLabel: "Submit Incident Response",
  },
  observation: {
    type: "MOBILE",
    description: "",
    formTitle: "Report Observation",
    submitLabel: "Submit Observation",
  },
  infrastructure: {
    type: "INFRASTRUCTURE",
    description: "",
    formTitle: "Report Infrastructure",
    submitLabel: "Submit Infrastructure",
  },
  end: {
    formTitle: "End Patrol",
  },
};

const ACTION_ICONS = {
  emergency: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.6 20h18.8L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  observation: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  ),
  incidentResponse: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h9" />
      <path d="M4 12h16" />
      <path d="M4 18h9" />
      <path d="m15 6 3 3-3 3" />
    </svg>
  ),
  infrastructure: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-3-3 2.6-2.6Z" />
    </svg>
  ),
  end: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h12v14H6z" />
    </svg>
  ),
};

function getMemberName(member) {
  return (
    [member?.firstName, member?.surname].filter(Boolean).join(" ") ||
    member?.user?.fullName ||
    member?.email ||
    member?.user?.email ||
    "Patroller"
  );
}

function getCrewName(item) {
  return (
    item?.user?.fullName ||
    getMemberName(item?.member) ||
    item?.user?.email ||
    "Patroller"
  );
}

function getVehicleLabel(patrol) {
  return (
    patrol?.vehicleLabel ||
    patrol?.vehicle?.registration ||
    [
      patrol?.tempVehicleRegistration,
      patrol?.tempVehicleMake,
      patrol?.tempVehicleModel,
      patrol?.tempVehicleColour,
      patrol?.tempVehicleType,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle not set"
  );
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function appendObservationLine(lines, label, value) {
  const text = String(value || "").trim();
  if (text) lines.push(`${label}: ${text}`);
}

function buildObservationDescription(form) {
  const lines = [`Observation Type: ${form.observationType || "General"}`];
  const tags = Array.isArray(form.observationTags) ? form.observationTags.filter(Boolean) : [];

  if (tags.length) lines.push(`Tags: ${tags.join(", ")}`);

  if (form.observationType === "Suspicious Vehicle") {
    appendObservationLine(lines, "Registration", form.vehicleRegistration);
    appendObservationLine(lines, "Partial Registration", form.vehiclePartialRegistration);
    appendObservationLine(lines, "Make", form.vehicleMake);
    appendObservationLine(lines, "Model", form.vehicleModel);
    appendObservationLine(lines, "Colour", form.vehicleColour);
    appendObservationLine(lines, "Vehicle Type", form.vehicleType);
    appendObservationLine(lines, "Occupants", form.vehicleOccupants);
    appendObservationLine(lines, "Direction of Travel", form.vehicleDirection);
    appendObservationLine(lines, "Distinguishing Marks", form.vehicleMarks);
  }

  if (form.observationType === "Suspicious Person") {
    appendObservationLine(lines, "Alias/Name Volunteered", form.personAlias);
    appendObservationLine(lines, "Clothing", form.personClothing);
    appendObservationLine(lines, "Person Description", form.personDescription);
    appendObservationLine(lines, "Behaviour Observed", form.personBehaviour);
    appendObservationLine(lines, "Direction of Movement", form.personDirection);
    appendObservationLine(lines, "Associated Vehicle", form.personVehicle);
    appendObservationLine(lines, "Associates", form.personAssociates);
  }

  if (form.observationType === "Suspicious Place") {
    appendObservationLine(lines, "Place Name", form.placeName);
    appendObservationLine(lines, "Premises Type", form.premisesType);
    appendObservationLine(lines, "Reason for Concern", form.placeConcernReason);
    appendObservationLine(lines, "Observed Activity", form.placeObservedActivity);
  }

  if (form.observationType === "Community Tip") {
    appendObservationLine(lines, "Source Type", form.communityTipSourceType);
    appendObservationLine(lines, "Information Status", form.communityTipInformationStatus || "Unverified");
    appendObservationLine(lines, "Public/Operational Summary", form.communityTipSummary);
    appendObservationLine(lines, "Reference Number", form.referenceNumber);
  }

  if (form.observationType === "Infrastructure Concern") {
    appendObservationLine(lines, "Infrastructure Type", form.infrastructureType);
    appendObservationLine(lines, "Reference Number", form.referenceNumber);
    appendObservationLine(lines, "Notes", form.infrastructureConcernNotes);
  }

  appendObservationLine(lines, "Description", form.description);

  return lines.join("\n");
}

function hasStructuredObservationDetails(form) {
  const fields = [
    form.description,
    ...(Array.isArray(form.observationTags) ? form.observationTags : []),
    form.vehicleRegistration,
    form.vehiclePartialRegistration,
    form.vehicleMake,
    form.vehicleModel,
    form.vehicleColour,
    form.vehicleType,
    form.vehicleOccupants,
    form.vehicleDirection,
    form.vehicleMarks,
    form.personAlias,
    form.personClothing,
    form.personDescription,
    form.personBehaviour,
    form.personDirection,
    form.personVehicle,
    form.personAssociates,
    form.placeName,
    form.premisesType,
    form.placeConcernReason,
    form.placeObservedActivity,
    form.communityTipSummary,
    form.referenceNumber,
    form.infrastructureType,
    form.infrastructureConcernNotes,
  ];

  return fields.some(hasValue);
}

export default function PatrolOperationsSection({
  token,
  user,
  members,
  getAuthHeaders,
  getJsonAuthHeaders,
}) {
  const [activePatrols, setActivePatrols] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [patrollers, setPatrollers] = useState(members || []);
  const [selectedCrewIds, setSelectedCrewIds] = useState([]);
  const [crewPickerOpen, setCrewPickerOpen] = useState(false);
  const [crewSearch, setCrewSearch] = useState("");
  const [crewLoadError, setCrewLoadError] = useState("");
  const [startForm, setStartForm] = useState(INITIAL_START_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [endForm, setEndForm] = useState({ endKm: "", summary: "" });
  const [incidentCodes, setIncidentCodes] = useState([]);
  const [incidentSubcodes, setIncidentSubcodes] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [infrastructureTypes, setInfrastructureTypes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [incidentCodesLoading, setIncidentCodesLoading] = useState(false);
  const [incidentSubcodesLoading, setIncidentSubcodesLoading] = useState(false);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);
  const [infrastructureTypesLoading, setInfrastructureTypesLoading] = useState(false);
  const [incidentRegisterError, setIncidentRegisterError] = useState("");
  const [serviceTypeError, setServiceTypeError] = useState("");
  const [infrastructureTypeError, setInfrastructureTypeError] = useState("");
  const [areaError, setAreaError] = useState("");
  const [selectedPatrolAction, setSelectedPatrolAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [operationLabel, setOperationLabel] = useState("");
  const [message, setMessage] = useState("");
  const requestInFlightRef = useRef(false);

  // The patrol session is the active operational context. Driver, vehicle/call
  // sign, and selected crew travel under this same session.
  const activePatrol = activePatrols[0] || null;
  const isDriver = Boolean(activePatrol && activePatrol.userId === user?.id);
  const isActivePatrol = activePatrol && ACTIVE_PATROL_STATUSES.includes(activePatrol.status);
  const currentPatrolAction = PATROL_ACTIONS[selectedPatrolAction] || null;
  const showEmergencyForm = selectedPatrolAction === "emergency";
  const showIncidentResponseForm = selectedPatrolAction === "incidentResponse";
  const showObservationForm = selectedPatrolAction === "observation";
  const showInfrastructureForm = selectedPatrolAction === "infrastructure";
  const showEndForm = selectedPatrolAction === "end";
  const assignedIncident = (activePatrol?.incidents || []).find((incident) => incident?.id) || null;
  const showIncidentStatusPanel = showIncidentResponseForm && Boolean(assignedIncident?.id);
  const displayMessage = operationLabel || (/incident not found/i.test(message) ? "" : message);

  function beginOperation(label) {
    if (requestInFlightRef.current) return false;

    requestInFlightRef.current = true;
    setLoading(true);
    setOperationLabel(label);
    setMessage("");
    return true;
  }

  function finishOperation() {
    requestInFlightRef.current = false;
    setLoading(false);
    setOperationLabel("");
  }

  function getSubmitLabel(defaultLabel) {
    return loading ? operationLabel || "Submitting..." : defaultLabel;
  }

  const availableCrewMembers = useMemo(() => {
    const driverMemberId = (activePatrol?.crew || []).find((item) => item.role === "DRIVER")?.memberId;

    return (patrollers || []).filter((member) => {
      if (!member?.id) return false;
      if (member.id === driverMemberId) return false;
      if (member.userId && member.userId === user?.id) return false;
      if (member.user?.id && member.user.id === user?.id) return false;
      return true;
    });
  }, [activePatrol, patrollers, user?.id]);

  const selectedCrewMembers = useMemo(
    () => selectedCrewIds
      .map((id) => availableCrewMembers.find((member) => member.id === id))
      .filter(Boolean),
    [availableCrewMembers, selectedCrewIds]
  );

  const filteredCrewMembers = useMemo(() => {
    const query = crewSearch.trim().toLowerCase();
    const selectableMembers = availableCrewMembers.filter((member) => !selectedCrewIds.includes(member.id));

    if (!query) return selectableMembers.slice(0, 25);

    return selectableMembers.filter((member) => {
      const haystack = [
        getMemberName(member),
        member.callSign,
        member.callsign,
        member.user?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [availableCrewMembers, crewSearch, selectedCrewIds]);

  async function loadJson(url, options = {}) {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || json.message || "Request failed");
    }

    return json;
  }

  async function loadPatrolOperations(options = {}) {
    if (!token) return;
    const { preserveMessage = false } = options;

    try {
      setLoading(true);
      setOperationLabel("Refreshing patrol...");
      if (!preserveMessage) setMessage("");
      setCrewLoadError("");

      const [activeJson, vehicleJson] = await Promise.all([
        loadJson(PATROL_ENDPOINTS.myActive, {
          headers: getAuthHeaders(),
        }),
        loadJson(VEHICLE_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        }).catch(() => []),
      ]);

      const nextActivePatrols = Array.isArray(activeJson) ? activeJson : activeJson ? [activeJson] : [];
      const nextVehicles = Array.isArray(vehicleJson) ? vehicleJson : [];
      let nextPatrollers = members || [];

      try {
        const patrollerJson = await loadJson(MEMBER_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        });
        const loadedPatrollers = Array.isArray(patrollerJson) ? patrollerJson : [];

        // Keep the parent dashboard/register data as a fallback if the crew lookup
        // endpoint returns an empty list for this role/session. This prevents the
        // mobile crew picker from disappearing when Admin has eligible members.
        nextPatrollers = loadedPatrollers.length ? loadedPatrollers : members || [];

        if (!loadedPatrollers.length && (members || []).length) {
          setCrewLoadError("Crew lookup returned no members. Showing available register members from the current session.");
        }
      } catch (memberError) {
        nextPatrollers = members || [];
        setCrewLoadError(
          (members || []).length
            ? "Crew lookup unavailable. Showing available register members from the current session."
            : "Crew list unavailable. Contact Control Room or Admin."
        );
      }

      setActivePatrols(nextActivePatrols);
      setVehicles(nextVehicles);
      setPatrollers(nextPatrollers);

      if (!startForm.vehicleId && nextVehicles[0]?.id) {
        setStartForm((current) => ({
          ...current,
          vehicleId: current.vehicleId || nextVehicles[0].id,
        }));
      }
    } catch (error) {
      setMessage(error.message || "Failed to load patrol operations");
    } finally {
      setLoading(false);
      setOperationLabel("");
    }
  }

  useEffect(() => {
    loadPatrolOperations();
  }, [token]);

  useEffect(() => {
    if (showIncidentResponseForm && token && incidentCodes.length === 0 && !incidentCodesLoading) {
      loadIncidentCodes();
    }
  }, [showIncidentResponseForm, token, incidentCodes.length, incidentCodesLoading]);

  useEffect(() => {
    if (showEmergencyForm && token && serviceTypes.length === 0 && !serviceTypesLoading) {
      loadServiceTypes();
    }
  }, [showEmergencyForm, token, serviceTypes.length, serviceTypesLoading]);

  useEffect(() => {
    if (showInfrastructureForm && token && infrastructureTypes.length === 0 && !infrastructureTypesLoading) {
      loadInfrastructureTypes();
    }
  }, [showInfrastructureForm, token, infrastructureTypes.length, infrastructureTypesLoading]);

  useEffect(() => {
    if (
      (showIncidentResponseForm || showObservationForm || showEmergencyForm || showInfrastructureForm) &&
      token &&
      areas.length === 0
    ) {
      loadAreas();
    }
  }, [
    showIncidentResponseForm,
    showObservationForm,
    showEmergencyForm,
    showInfrastructureForm,
    token,
    areas.length,
  ]);

  useEffect(() => {
    if (
      showObservationForm &&
      eventForm.observationType === "Infrastructure Concern" &&
      token &&
      infrastructureTypes.length === 0 &&
      !infrastructureTypesLoading
    ) {
      loadInfrastructureTypes();
    }
  }, [showObservationForm, eventForm.observationType, token, infrastructureTypes.length, infrastructureTypesLoading]);

  async function loadIncidentCodes() {
    try {
      setIncidentCodesLoading(true);
      setIncidentRegisterError("");

      const json = await loadJson(`${INCIDENT_CODES_ENDPOINT}?active=true`, {
        headers: getAuthHeaders(),
      });

      setIncidentCodes(Array.isArray(json) ? json : []);
    } catch (error) {
      setIncidentRegisterError(error.message || "Failed to load incident codes.");
    } finally {
      setIncidentCodesLoading(false);
    }
  }

  async function loadIncidentSubcodes(incidentCodeId) {
    if (!incidentCodeId) {
      setIncidentSubcodes([]);
      return;
    }

    try {
      setIncidentSubcodesLoading(true);
      setIncidentRegisterError("");

      const query = new URLSearchParams({
        incidentCodeId,
        active: "true",
      });
      const json = await loadJson(`${INCIDENT_SUBCODES_ENDPOINT}?${query.toString()}`, {
        headers: getAuthHeaders(),
      });

      setIncidentSubcodes(Array.isArray(json) ? json : []);
    } catch (error) {
      setIncidentRegisterError(error.message || "Failed to load incident subcodes.");
    } finally {
      setIncidentSubcodesLoading(false);
    }
  }

  async function loadServiceTypes() {
    try {
      setServiceTypesLoading(true);
      setServiceTypeError("");

      const json = await loadJson(`${SERVICE_TYPES_ENDPOINT}?active=true&controlRoomManaged=true`, {
        headers: getAuthHeaders(),
      });

      setServiceTypes(Array.isArray(json) ? json : []);
    } catch (error) {
      setServiceTypeError(error.message || "Failed to load service types.");
    } finally {
      setServiceTypesLoading(false);
    }
  }

  async function loadInfrastructureTypes() {
    try {
      setInfrastructureTypesLoading(true);
      setInfrastructureTypeError("");

      const json = await loadJson(`${INFRASTRUCTURE_TYPES_ENDPOINT}?active=true`, {
        headers: getAuthHeaders(),
      });

      setInfrastructureTypes(Array.isArray(json) ? json : []);
    } catch (error) {
      setInfrastructureTypeError(error.message || "Failed to load infrastructure types.");
    } finally {
      setInfrastructureTypesLoading(false);
    }
  }

  async function loadAreas() {
    try {
      setAreaError("");
      const json = await loadJson(`${ADMIN_REGISTER_ENDPOINTS.areas}?active=true`, {
        headers: getAuthHeaders(),
      });

      setAreas(Array.isArray(json) ? json : []);
    } catch (error) {
      setAreaError(error.message || "Failed to load areas.");
    }
  }

  function updateStartForm(field, value) {
    setStartForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addCrewMember(memberId) {
    setSelectedCrewIds((current) => (
      current.includes(memberId) ? current : [...current, memberId]
    ));
    setCrewSearch("");
  }

  function removeCrewMember(memberId) {
    setSelectedCrewIds((current) => current.filter((id) => id !== memberId));
  }

  function updateIncidentCodeSelection(incidentCodeId) {
    const selectedIncidentCode = incidentCodes.find((item) => item.id === incidentCodeId);

    setEventForm((current) => ({
      ...current,
      incidentCodeId,
      incidentSubcodeId: "",
      incidentCode: selectedIncidentCode?.code || "",
      incidentType: selectedIncidentCode?.code || "",
    }));
    setIncidentSubcodes([]);

    if (incidentCodeId) {
      loadIncidentSubcodes(incidentCodeId);
    }
  }

  function updateServiceTypeSelection(serviceTypeId) {
    const selectedServiceType = serviceTypes.find((item) => item.id === serviceTypeId);

    setEventForm((current) => ({
      ...current,
      serviceTypeId,
      assistance: selectedServiceType?.type || "",
    }));
  }

  function updateInfrastructureTypeSelection(infrastructureTypeId) {
    const selectedInfrastructureType = infrastructureTypes.find((item) => item.id === infrastructureTypeId);

    setEventForm((current) => ({
      ...current,
      infrastructureTypeId,
      infrastructureType: selectedInfrastructureType?.type || "",
    }));
  }

  function updateAreaSelection(areaId) {
    const selectedArea = areas.find((item) => item.id === areaId);

    setEventForm((current) => ({
      ...current,
      areaId,
      suburb: selectedArea?.officialName || current.suburb,
    }));
  }

  function selectPatrolAction(action) {
    setSelectedPatrolAction(action.id);
    setMessage("");

    if (action.id === "end") return;

    setEventForm((current) => ({
      ...current,
      type: action.id === "incidentResponse" ? "MOBILE" : action.type,
      referenceNumber: "",
      incidentCode: "",
      incidentCodeId: "",
      incidentSubcodeId: "",
      incidentType: "",
      serviceTypeId: "",
      infrastructureTypeId: "",
      infrastructureType: "",
      areaId: "",
      description: action.description,
      assistance: "",
      streetNumber: "",
      streetName: "",
      suburb: "",
      locationNotes: "",
      latitude: "",
      longitude: "",
      observationType: "General",
      observationTags: [],
      vehicleRegistration: "",
      vehiclePartialRegistration: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleColour: "",
      vehicleType: "",
      vehicleOccupants: "",
      vehicleDirection: "",
      vehicleMarks: "",
      personAlias: "",
      personClothing: "",
      personDescription: "",
      personBehaviour: "",
      personDirection: "",
      personVehicle: "",
      personAssociates: "",
      placeName: "",
      premisesType: "",
      placeConcernReason: "",
      placeObservedActivity: "",
      communityTipSourceType: "Community member",
      communityTipSummary: "",
      communityTipInformationStatus: "Unverified",
      infrastructureConcernNotes: "",
    }));
    setIncidentSubcodes([]);
  }

  async function startPatrol(event) {
    event.preventDefault();

    const callSign = startForm.callSign.trim();

    if (!callSign) {
      setMessage("Call Sign is required.");
      return;
    }

    if (!beginOperation("Starting patrol...")) return;

    try {
      const payload = {
        vehicleId: startForm.vehicleId,
        callSign,
        sector: startForm.sector,
        startKm: startForm.startKm,
        crewIds: selectedCrewIds,
        crewCallSigns: startForm.crewCallSigns,
      };

      await loadJson(PATROL_ENDPOINTS.start, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });

      setStartForm(INITIAL_START_FORM);
      setSelectedCrewIds([]);
      setCrewPickerOpen(false);
      setCrewSearch("");
      setMessage("Patrol started.");
      await loadPatrolOperations({ preserveMessage: true });
    } catch (error) {
      setMessage(error.message || "Failed to start patrol");
    } finally {
      finishOperation();
    }
  }

  async function submitPatrolEvent(event) {
    event.preventDefault();

    if (!activePatrol?.id) return;

    const needsLocation = ["emergency", "incidentResponse", "observation", "infrastructure"].includes(selectedPatrolAction);
    const hasLocationAnchor = Boolean(eventForm.streetName.trim() || eventForm.locationNotes.trim());

    if (needsLocation && !hasLocationAnchor) {
      setMessage("Street Name or Landmark / Location Notes is required.");
      return;
    }

    if (selectedPatrolAction === "observation" && !hasStructuredObservationDetails(eventForm)) {
      setMessage("Add a description, tag, reference, or at least one observation detail.");
      return;
    }

    const submittingLabel =
      selectedPatrolAction === "emergency"
        ? "Requesting assistance..."
        : selectedPatrolAction === "incidentResponse"
          ? "Submitting incident response..."
          : selectedPatrolAction === "observation"
            ? "Submitting observation..."
            : selectedPatrolAction === "infrastructure"
              ? "Submitting infrastructure report..."
              : "Submitting patrol event...";

    if (!beginOperation(submittingLabel)) return;

    try {
      const eventType = selectedPatrolAction === "incidentResponse"
        ? "MOBILE"
        : PATROL_ACTIONS[selectedPatrolAction]?.type || eventForm.type;
      const referenceNumber = eventForm.referenceNumber.trim();
      const description = selectedPatrolAction === "observation"
        ? buildObservationDescription(eventForm)
        : eventForm.description.trim();
      const assistance = selectedPatrolAction === "emergency"
        ? eventForm.assistance || "Emergency Assistance"
        : eventForm.assistance || null;

      await loadJson(PATROL_ENDPOINTS.events, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          patrolId: activePatrol.id,
          type: eventType,
          incidentId: null,
          referenceNumber: referenceNumber || null,
          serviceTypeId: eventForm.serviceTypeId || null,
          incidentCodeId: eventForm.incidentCodeId || null,
          incidentSubcodeId: eventForm.incidentSubcodeId || null,
          infrastructureTypeId: eventForm.infrastructureTypeId || null,
          areaId: eventForm.areaId || null,
          streetNumber: eventForm.streetNumber || null,
          streetName: eventForm.streetName || null,
          suburb: eventForm.suburb || null,
          locationNotes: eventForm.locationNotes || null,
          latitude: eventForm.latitude || null,
          longitude: eventForm.longitude || null,
          incidentCode: eventForm.incidentCode || null,
          incidentType: eventForm.incidentType || eventForm.incidentCode || null,
          description: description || eventType,
          // Emergency Assistance must write to PatrolEvent.assistance, the same
          // source Control Room reads for its assistance queue.
          assistance,
          sceneActive: !["STAND_DOWN", "RESUME_PATROL"].includes(eventType),
        }),
      });

      setEventForm(INITIAL_EVENT_FORM);
      setSelectedPatrolAction("");
      setMessage("Patrol event submitted.");
      await loadPatrolOperations({ preserveMessage: true });
    } catch (error) {
      const nextMessage = error.message || "Failed to submit patrol event";
      setMessage(/incident not found/i.test(nextMessage) ? "" : nextMessage);
    } finally {
      finishOperation();
    }
  }

  async function submitPatrolStatus(type) {
    if (!activePatrol?.id) return;

    const selectedStatus = PATROL_STATUS_ACTIONS.find((action) => action.type === type);
    if (!beginOperation(`Updating status to ${selectedStatus?.label || type}...`)) return;

    try {
      await loadJson(PATROL_ENDPOINTS.events, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          patrolId: activePatrol.id,
          incidentId: null,
          type,
          description: `Patrol status: ${selectedStatus?.label || type}`,
          sceneActive: !["STAND_DOWN", "RESUME_PATROL"].includes(type),
        }),
      });

      setMessage("Patrol status updated.");
      await loadPatrolOperations({ preserveMessage: true });
    } catch (error) {
      setMessage(error.message || "Failed to update patrol status");
    } finally {
      finishOperation();
    }
  }

  async function endPatrol(event) {
    event.preventDefault();

    if (!activePatrol?.id) return;
    if (!beginOperation("Ending patrol...")) return;

    try {
      await loadJson(PATROL_ENDPOINTS.end(activePatrol.id), {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          endKm: endForm.endKm,
          summary: endForm.summary,
        }),
      });

      setEndForm({ endKm: "", summary: "" });
      setMessage("Patrol completed.");
      await loadPatrolOperations({ preserveMessage: true });
    } catch (error) {
      setMessage(error.message || "Failed to end patrol");
    } finally {
      finishOperation();
    }
  }

  async function submitIncidentStatus(type) {
    if (!activePatrol?.id || !assignedIncident?.id) return;
    const selectedStatus = INCIDENT_STATUS_ACTIONS.find((action) => action.type === type);
    if (!beginOperation(`Updating incident to ${selectedStatus?.label || type}...`)) return;

    try {
      await loadJson(PATROL_ENDPOINTS.events, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          patrolId: activePatrol.id,
          incidentId: assignedIncident.id,
          type,
          description: `Incident status: ${type}`,
          sceneActive: !["STAND_DOWN", "RESUME_PATROL"].includes(type),
        }),
      });

      setMessage("Incident status updated.");
      await loadPatrolOperations({ preserveMessage: true });
    } catch (error) {
      setMessage(error.message || "Failed to update incident status");
    } finally {
      finishOperation();
    }
  }

  function updateEventForm(field, value) {
    setEventForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateObservationType(observationType) {
    setEventForm((current) => ({
      ...current,
      observationType,
    }));
  }

  function toggleObservationTag(tag) {
    setEventForm((current) => {
      const tags = Array.isArray(current.observationTags) ? current.observationTags : [];
      const nextTags = tags.includes(tag)
        ? tags.filter((item) => item !== tag)
        : [...tags, tag];

      return {
        ...current,
        observationTags: nextTags,
      };
    });
  }

  function renderObservationTags() {
    return (
      <div className="patrol-observation-tags">
        {OBSERVATION_TAGS.map((tag) => (
          <label className="patrol-check-option" key={tag}>
            <input
              type="checkbox"
              checked={(eventForm.observationTags || []).includes(tag)}
              onChange={() => toggleObservationTag(tag)}
            />
            <span>{tag}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderObservationTypeFields() {
    if (eventForm.observationType === "Suspicious Vehicle") {
      return (
        <>
          <label>
            Registration Number
            <input value={eventForm.vehicleRegistration} onChange={(event) => updateEventForm("vehicleRegistration", event.target.value)} />
          </label>
          <label>
            Partial Registration
            <input value={eventForm.vehiclePartialRegistration} onChange={(event) => updateEventForm("vehiclePartialRegistration", event.target.value)} />
          </label>
          <label>
            Make
            <input value={eventForm.vehicleMake} onChange={(event) => updateEventForm("vehicleMake", event.target.value)} />
          </label>
          <label>
            Model
            <input value={eventForm.vehicleModel} onChange={(event) => updateEventForm("vehicleModel", event.target.value)} />
          </label>
          <label>
            Colour
            <input value={eventForm.vehicleColour} onChange={(event) => updateEventForm("vehicleColour", event.target.value)} />
          </label>
          <label>
            Vehicle Type
            <input value={eventForm.vehicleType} onChange={(event) => updateEventForm("vehicleType", event.target.value)} />
          </label>
          <label>
            Occupants Count
            <input inputMode="numeric" value={eventForm.vehicleOccupants} onChange={(event) => updateEventForm("vehicleOccupants", event.target.value)} />
          </label>
          <label>
            Direction of Travel
            <input value={eventForm.vehicleDirection} onChange={(event) => updateEventForm("vehicleDirection", event.target.value)} />
          </label>
          <label>
            Distinguishing Marks
            <textarea value={eventForm.vehicleMarks} onChange={(event) => updateEventForm("vehicleMarks", event.target.value)} />
          </label>
        </>
      );
    }

    if (eventForm.observationType === "Suspicious Person") {
      return (
        <>
          <label>
            Alias/Name if Volunteered
            <input value={eventForm.personAlias} onChange={(event) => updateEventForm("personAlias", event.target.value)} />
          </label>
          <label>
            Clothing
            <input value={eventForm.personClothing} onChange={(event) => updateEventForm("personClothing", event.target.value)} />
          </label>
          <label>
            Person Description
            <textarea value={eventForm.personDescription} onChange={(event) => updateEventForm("personDescription", event.target.value)} />
          </label>
          <label>
            Behaviour Observed
            <textarea value={eventForm.personBehaviour} onChange={(event) => updateEventForm("personBehaviour", event.target.value)} />
          </label>
          <label>
            Direction of Movement
            <input value={eventForm.personDirection} onChange={(event) => updateEventForm("personDirection", event.target.value)} />
          </label>
          <label>
            Associated Vehicle
            <input value={eventForm.personVehicle} onChange={(event) => updateEventForm("personVehicle", event.target.value)} />
          </label>
          <label>
            Associates
            <input value={eventForm.personAssociates} onChange={(event) => updateEventForm("personAssociates", event.target.value)} />
          </label>
        </>
      );
    }

    if (eventForm.observationType === "Suspicious Place") {
      return (
        <>
          <label>
            Place Name
            <input value={eventForm.placeName} onChange={(event) => updateEventForm("placeName", event.target.value)} />
          </label>
          <label>
            Premises Type
            <input value={eventForm.premisesType} onChange={(event) => updateEventForm("premisesType", event.target.value)} placeholder="House, business, park, school, street corner..." />
          </label>
          <label>
            Reason for Concern
            <textarea value={eventForm.placeConcernReason} onChange={(event) => updateEventForm("placeConcernReason", event.target.value)} />
          </label>
          <label>
            Observed Activity
            <textarea value={eventForm.placeObservedActivity} onChange={(event) => updateEventForm("placeObservedActivity", event.target.value)} />
          </label>
        </>
      );
    }

    if (eventForm.observationType === "Community Tip") {
      return (
        <>
          <label>
            Source Type
            <select
              value={eventForm.communityTipSourceType}
              onChange={(event) => updateEventForm("communityTipSourceType", event.target.value)}
            >
              {COMMUNITY_TIP_SOURCE_TYPES.map((sourceType) => (
                <option key={sourceType} value={sourceType}>{sourceType}</option>
              ))}
            </select>
          </label>
          <label>
            Information Status
            <input value={eventForm.communityTipInformationStatus} readOnly />
            <span className="patrol-muted">Community tips captured by Patrol are treated as unverified source information.</span>
          </label>
          <label>
            Public/Operational Summary
            <textarea value={eventForm.communityTipSummary} onChange={(event) => updateEventForm("communityTipSummary", event.target.value)} />
          </label>
          <label>
            Reference Number
            <input value={eventForm.referenceNumber} onChange={(event) => updateEventForm("referenceNumber", event.target.value)} />
          </label>
        </>
      );
    }

    if (eventForm.observationType === "Infrastructure Concern") {
      return (
        <>
          {infrastructureTypesLoading && (
            <p className="patrol-muted">Loading infrastructure types...</p>
          )}
          {infrastructureTypeError && (
            <div className="patrol-message">{infrastructureTypeError}</div>
          )}
          <label>
            Infrastructure Type
            <select
              value={eventForm.infrastructureTypeId}
              onChange={(event) => updateInfrastructureTypeSelection(event.target.value)}
            >
              <option value="">Select infrastructure type</option>
              {infrastructureTypes.map((infrastructureType) => (
                <option key={infrastructureType.id} value={infrastructureType.id}>
                  {infrastructureType.type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reference Number
            <input value={eventForm.referenceNumber} onChange={(event) => updateEventForm("referenceNumber", event.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={eventForm.infrastructureConcernNotes} onChange={(event) => updateEventForm("infrastructureConcernNotes", event.target.value)} />
          </label>
        </>
      );
    }

    return null;
  }

  function renderLocationFields() {
    return (
      <>
        <label>
          Street Number
          <input value={eventForm.streetNumber} onChange={(event) => updateEventForm("streetNumber", event.target.value)} />
        </label>
        <label>
          Street Name
          <input value={eventForm.streetName} onChange={(event) => updateEventForm("streetName", event.target.value)} />
        </label>
        <label>
          Area / Suburb
          <select value={eventForm.areaId} onChange={(event) => updateAreaSelection(event.target.value)}>
            <option value="">Other / Not Listed</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.officialName}
              </option>
            ))}
          </select>
        </label>
        {areaError && <p className="card-detail">{areaError}</p>}
        <label>
          Raw Suburb / Area Text
          <input value={eventForm.suburb} onChange={(event) => updateEventForm("suburb", event.target.value)} />
        </label>
        <label>
          Landmark / Location Notes
          <textarea value={eventForm.locationNotes} onChange={(event) => updateEventForm("locationNotes", event.target.value)} />
        </label>
        <label>
          Latitude
          <input inputMode="decimal" value={eventForm.latitude} onChange={(event) => updateEventForm("latitude", event.target.value)} />
        </label>
        <label>
          Longitude
          <input inputMode="decimal" value={eventForm.longitude} onChange={(event) => updateEventForm("longitude", event.target.value)} />
        </label>
      </>
    );
  }

  return (
    <div className="patrol-phone-wrap">
      <section className="patrol-phone">
        <div className="patrol-phone-header">
          <div>
            <span className="patrol-phone-kicker">Patroller Console</span>
            <h2>Patrol Operations</h2>
          </div>
          <button className="patrol-refresh-btn" type="button" onClick={loadPatrolOperations} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {displayMessage && (
          <div className="patrol-message" role="status" aria-live="polite">
            {displayMessage}
          </div>
        )}

        {!isActivePatrol && (
          <form className="patrol-mobile-form" onSubmit={startPatrol}>
            <div className="patrol-step-card">
              <div className="patrol-step-label">Start Patrol</div>

              <label>
                Registered Vehicle
                <select
                  value={startForm.vehicleId}
                  onChange={(event) => updateStartForm("vehicleId", event.target.value)}
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration} {vehicle.make ? `- ${vehicle.make}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Call Sign
                <input
                  type="text"
                  value={startForm.callSign}
                  onChange={(event) => updateStartForm("callSign", event.target.value)}
                  required
                />
              </label>

              <label>
                Sector
                <input value={startForm.sector} onChange={(event) => updateStartForm("sector", event.target.value)} required />
              </label>

              <label>
                Start KM
                <input
                  type="number"
                  min="0"
                  value={startForm.startKm}
                  onChange={(event) => updateStartForm("startKm", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Crew</div>
              <p className="patrol-muted">
                {selectedCrewMembers.length
                  ? `${selectedCrewMembers.length} selected: ${selectedCrewMembers.map(getMemberName).join(", ")}`
                  : "No crew selected. Driver-only patrol is allowed."}
              </p>
              {crewLoadError && <div className="patrol-message">{crewLoadError}</div>}

              <label>
                Crew Call Signs
                <textarea
                  value={startForm.crewCallSigns}
                  onChange={(event) => updateStartForm("crewCallSigns", event.target.value)}
                  placeholder="WW75, WC22, WW83"
                  rows="3"
                />
              </label>

              <button
                type="button"
                className="patrol-refresh-btn"
                onClick={() => setCrewPickerOpen((current) => !current)}
                disabled={loading}
              >
                {crewPickerOpen ? "Close Crew" : "Add Crew"}
              </button>

              {availableCrewMembers.length === 0 && (
                <p className="patrol-muted">No eligible crew members are loaded yet. Open Add Crew or press Refresh to retry.</p>
              )}

              {crewPickerOpen && (
                <div className="patrol-field-stack">
                  {selectedCrewMembers.length > 0 && (
                    <div className="patrol-service-options">
                      {selectedCrewMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className="secondary-btn"
                          onClick={() => removeCrewMember(member.id)}
                          disabled={loading}
                        >
                          Remove {getMemberName(member)}
                        </button>
                      ))}
                    </div>
                  )}

                  <label>
                    Search Crew
                    <input
                      value={crewSearch}
                      onChange={(event) => setCrewSearch(event.target.value)}
                      placeholder="Name or call sign"
                    />
                  </label>

                  {filteredCrewMembers.length === 0 && (
                    <p className="patrol-muted">
                      {crewSearch.trim()
                        ? "No matching crew found."
                        : "No eligible crew members are available from the crew register for this session."}
                    </p>
                  )}

                  {filteredCrewMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="patrol-list-item"
                      onClick={() => addCrewMember(member.id)}
                      disabled={loading}
                    >
                      <span>
                        <strong>{getMemberName(member)}</strong>
                        <span className="patrol-muted"> {member.callSign || member.callsign || ""}</span>
                      </span>
                      <span className="badge">Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="patrol-primary-action" type="submit" disabled={loading}>
              {getSubmitLabel("Start Patrol")}
            </button>
          </form>
        )}

        {isActivePatrol && (
          <div className="patrol-mobile-form">
            <div className="patrol-status-card">
              <div className="patrol-status-topline">
                <span className="patrol-live-badge">ON PATROL</span>
                <span>{activePatrol.status}</span>
              </div>
              <div className="patrol-status-title">{getVehicleLabel(activePatrol)}</div>
              <div className="patrol-facts">
                <div>
                  <span>Call Sign</span>
                  <strong>{activePatrol.callSign || "-"}</strong>
                </div>
                <div>
                  <span>Sector</span>
                  <strong>{activePatrol.sector || "-"}</strong>
                </div>
                <div>
                  <span>Start KM</span>
                  <strong>{activePatrol.startKm ?? "-"}</strong>
                </div>
              </div>
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Crew</div>
              {(activePatrol.crew || []).length === 0 && <p className="patrol-muted">No crew recorded.</p>}
              {(activePatrol.crew || []).map((item) => (
                <div key={item.id} className="patrol-list-item">
                  <div>
                    <strong>{getCrewName(item)}</strong>
                    <div className="patrol-muted">{item.attendanceStatus || "PRESENT"} {item.creditGranted ? "- credit granted" : "- no credit"}</div>
                  </div>
                  <span className="badge">{item.role || "CREW"}</span>
                </div>
              ))}
            </div>

            <div className="patrol-step-card">
              <div className="patrol-step-label">Patrol Actions</div>
              <div className="patrol-action-grid">
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-emergency ${selectedPatrolAction === "emergency" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "emergency", ...PATROL_ACTIONS.emergency })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "emergency"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.emergency}</span>
                  <span>Emergency</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-incident-response ${selectedPatrolAction === "incidentResponse" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "incidentResponse", ...PATROL_ACTIONS.incidentResponse })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "incidentResponse"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.incidentResponse}</span>
                  <span>Incident Response</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-observation ${selectedPatrolAction === "observation" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "observation", ...PATROL_ACTIONS.observation })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "observation"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.observation}</span>
                  <span>Observation</span>
                </button>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-infrastructure ${selectedPatrolAction === "infrastructure" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "infrastructure", ...PATROL_ACTIONS.infrastructure })}
                  disabled={loading}
                  aria-pressed={selectedPatrolAction === "infrastructure"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.infrastructure}</span>
                  <span>Infrastructure</span>
                </button>
                <label className="patrol-action-btn patrol-action-status">
                  <span className="patrol-action-icon">▾</span>
                  <span>{loading ? "Updating..." : "Status"}</span>
                  <select
                    value=""
                    onChange={(event) => {
                      const nextStatus = event.target.value;
                      if (nextStatus) submitPatrolStatus(nextStatus);
                    }}
                    disabled={loading || !isDriver}
                    title={isDriver ? "Update patrol status" : "Driver-only control"}
                    aria-label="Update patrol status"
                  >
                    <option value="">Select status</option>
                    {PATROL_STATUS_ACTIONS.map((action) => (
                      <option key={action.type} value={action.type}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={`patrol-action-btn patrol-action-end ${selectedPatrolAction === "end" ? "active" : ""}`}
                  onClick={() => selectPatrolAction({ id: "end", ...PATROL_ACTIONS.end })}
                  disabled={loading || !isDriver}
                  title={isDriver ? "End patrol" : "Driver-only control"}
                  aria-pressed={selectedPatrolAction === "end"}
                >
                  <span className="patrol-action-icon">{ACTION_ICONS.end}</span>
                  <span>End Patrol</span>
                </button>
              </div>
            </div>

            {showIncidentStatusPanel && (
              <div className="patrol-step-card">
                <div className="patrol-step-label">Incident Status</div>
                <div className="patrol-action-grid">
                  {INCIDENT_STATUS_ACTIONS.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      className="patrol-action-btn"
                      onClick={() => submitIncidentStatus(action.type)}
                      disabled={loading}
                    >
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showEmergencyForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              {serviceTypesLoading && (
                <p className="patrol-muted">Loading service types...</p>
              )}
              {serviceTypeError && (
                <div className="patrol-message">{serviceTypeError}</div>
              )}
              <label>
                Assistance / Service Type
                <select
                  value={eventForm.serviceTypeId}
                  onChange={(event) => updateServiceTypeSelection(event.target.value)}
                >
                  <option value="">Select service type</option>
                  {serviceTypes.map((serviceType) => (
                    <option key={serviceType.id} value={serviceType.id}>
                      {serviceType.type} {serviceType.category ? `- ${serviceType.category}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => updateEventForm("description", event.target.value)} />
              </label>
              <label>
                Reference Number
                <input value={eventForm.referenceNumber} onChange={(event) => updateEventForm("referenceNumber", event.target.value)} />
              </label>
              {renderLocationFields()}
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {getSubmitLabel(currentPatrolAction.submitLabel)}
              </button>
            </form>
            )}

            {showIncidentResponseForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              <label>
                Reference Number
                <input
                  value={eventForm.referenceNumber}
                  onChange={(event) => updateEventForm("referenceNumber", event.target.value)}
                />
                <span className="patrol-muted">SAPS, EMS, Control Room, or internal reference if available.</span>
              </label>

              {incidentCodesLoading && (
                <p className="patrol-muted">Loading incident codes...</p>
              )}
              {incidentRegisterError && (
                <div className="patrol-message">{incidentRegisterError}</div>
              )}
              <label>
                Incident Code
                <select
                  value={eventForm.incidentCodeId}
                  onChange={(event) => updateIncidentCodeSelection(event.target.value)}
                  required
                >
                  <option value="">Select incident code</option>
                  {incidentCodes.map((incidentCode) => (
                    <option key={incidentCode.id} value={incidentCode.id}>
                      {incidentCode.code} - {incidentCode.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Incident Subcode
                <select
                  value={eventForm.incidentSubcodeId}
                  onChange={(event) =>
                    updateEventForm("incidentSubcodeId", event.target.value)
                  }
                  disabled={!eventForm.incidentCodeId || incidentSubcodesLoading}
                >
                  <option value="">
                    {eventForm.incidentCodeId ? "Select incident subcode" : "Select code first"}
                  </option>
                  {incidentSubcodes.map((incidentSubcode) => (
                    <option key={incidentSubcode.id} value={incidentSubcode.id}>
                      {incidentSubcode.subcode} - {incidentSubcode.name}
                    </option>
                  ))}
                </select>
              </label>
              {incidentSubcodesLoading && (
                <p className="patrol-muted">Loading incident subcodes...</p>
              )}
              {eventForm.incidentCodeId && !incidentSubcodesLoading && incidentSubcodes.length === 0 && (
                <p className="patrol-muted">No subcodes available for this incident code.</p>
              )}
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => updateEventForm("description", event.target.value)} />
              </label>
              {renderLocationFields()}
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {getSubmitLabel(currentPatrolAction.submitLabel)}
              </button>
            </form>
            )}

            {showObservationForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              <label>
                Observation Type
                <select
                  value={eventForm.observationType}
                  onChange={(event) => updateObservationType(event.target.value)}
                >
                  {OBSERVATION_TYPES.map((observationType) => (
                    <option key={observationType} value={observationType}>
                      {observationType}
                    </option>
                  ))}
                </select>
              </label>

              {renderObservationTypeFields()}

              <label>
                Description / Notes
                <textarea value={eventForm.description} onChange={(event) => updateEventForm("description", event.target.value)} />
              </label>

              <div>
                <div className="patrol-step-label">Optional Tags</div>
                <p className="patrol-muted">Operational source tags only for patrol review.</p>
                {renderObservationTags()}
              </div>

              {renderLocationFields()}
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {getSubmitLabel(currentPatrolAction.submitLabel)}
              </button>
            </form>
            )}

            {showInfrastructureForm && (
            <form id="patrol-event-form" className="patrol-step-card patrol-mobile-form" onSubmit={submitPatrolEvent}>
              <div className="patrol-step-label">{currentPatrolAction.formTitle}</div>
              {infrastructureTypesLoading && (
                <p className="patrol-muted">Loading infrastructure types...</p>
              )}
              {infrastructureTypeError && (
                <div className="patrol-message">{infrastructureTypeError}</div>
              )}
              <label>
                Infrastructure Type
                <select
                  value={eventForm.infrastructureTypeId}
                  onChange={(event) => updateInfrastructureTypeSelection(event.target.value)}
                  required
                >
                  <option value="">Select infrastructure type</option>
                  {infrastructureTypes.map((infrastructureType) => (
                    <option key={infrastructureType.id} value={infrastructureType.id}>
                      {infrastructureType.type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea value={eventForm.description} onChange={(event) => updateEventForm("description", event.target.value)} />
              </label>
              {renderLocationFields()}
              <button className="patrol-primary-action" type="submit" disabled={loading}>
                {getSubmitLabel(currentPatrolAction.submitLabel)}
              </button>
            </form>
            )}

            {isDriver && showEndForm && (
              <form id="patrol-end-form" className="patrol-step-card patrol-mobile-form" onSubmit={endPatrol}>
                <div className="patrol-step-label">End Patrol</div>
                <label>
                  End KM
                  <input
                    type="number"
                    min={activePatrol.startKm || 0}
                    value={endForm.endKm}
                    onChange={(event) => setEndForm({ ...endForm, endKm: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Summary
                  <textarea value={endForm.summary} onChange={(event) => setEndForm({ ...endForm, summary: event.target.value })} />
                </label>
                <button className="patrol-primary-action patrol-end-submit" type="submit" disabled={loading}>
                  {getSubmitLabel("End Patrol")}
                </button>
              </form>
            )}

            {!isDriver && (
              <div className="patrol-message">
                Driver-only odometer and end patrol controls are hidden for crew members.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
