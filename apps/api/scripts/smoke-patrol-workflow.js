import "dotenv/config";

const API_BASE_URL = String(process.env.API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const TEST_RUN_ID = String(process.env.TEST_RUN_ID || `TEST-RUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`).trim();
const TEST_RUN_TOKEN = `[${TEST_RUN_ID}]`;
const PATROLLER_EMAIL = String(process.env.PATROLLER_EMAIL || "patroller@civitaswatch.com").trim().toLowerCase();
const PATROLLER_PASSWORD = String(process.env.PATROLLER_PASSWORD || "").trim();
const CONTROL_ROOM_EMAIL = String(process.env.CONTROL_ROOM_EMAIL || "control@civitaswatch.com").trim().toLowerCase();
const CONTROL_ROOM_PASSWORD = String(process.env.CONTROL_ROOM_PASSWORD || "").trim();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@test.com").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();

function isApplyMode(args = process.argv.slice(2)) {
  return args.includes("--apply");
}

function isoDateParts(value = new Date()) {
  const date = new Date(value);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}`,
  };
}

async function requestJson(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = new Error(json?.error || `Request failed: ${method} ${path}`);
    error.status = res.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function login(email, password, label) {
  if (!password) {
    throw new Error(`${label} password is required. Set ${label.toUpperCase()}_PASSWORD.`);
  }

  const result = await requestJson("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  return {
    token: result.token,
    user: result.user,
  };
}

function checklistFor(index, callSign, vehicleLabel) {
  const notes = [
    TEST_RUN_TOKEN,
    `Session: ${callSign}`,
    `Vehicle: ${vehicleLabel}`,
    "Tyres visually checked",
    "Lights / hazards working",
    "Fuel level acceptable",
    "Phone / radio charged",
    "Reflective jacket / bib available",
    "Torch available",
    "Emergency numbers available",
    "First aid kit available",
    "Vehicle damage / defects: none noted",
    "Final readiness confirmed",
  ].join("\n");

  return {
    vehicleInspected: true,
    lightsHazardsWorking: true,
    fuelLevelAcceptable: true,
    phoneRadioCharged: true,
    reflectiveJacketAvailable: true,
    torchAvailable: true,
    emergencyNumbersAvailable: true,
    firstAidKitAvailable: true,
    damageNotes: `${TEST_RUN_TOKEN} no damage noted`,
    safetyCheckCompleted: true,
    callSignConfirmed: true,
    vehicleFuelLevel: "Acceptable",
    notes: `${notes}\n[/TEST-RUN]`,
    _index: index,
  };
}

function sessionPlan(index, kind, vehicle, crewCallSigns = []) {
  const suffix = String.fromCharCode(65 + index);
  const callSign = `${TEST_RUN_TOKEN}-${suffix}`;
  const temporary = kind === "TEMPORARY";

  return {
    label: `Session ${suffix}`,
    callSign,
    sector: "Sector 1",
    startKm: 10000 + index * 25 + 1,
    vehicleMode: kind,
    vehicleId: temporary ? "" : vehicle.id,
    crewCallSigns,
    tempVehicleRegistration: temporary ? `${TEST_RUN_TOKEN}-TEMP-${suffix}` : "",
    tempVehicleMake: temporary ? "QA" : "",
    tempVehicleModel: temporary ? "Test" : "",
    tempVehicleColour: temporary ? "White" : "",
    tempVehicleType: temporary ? "Passenger" : "",
    tempVehicleNotes: temporary ? `${TEST_RUN_TOKEN} temporary patrol vehicle` : "",
    checklist: checklistFor(index, callSign, temporary ? `${TEST_RUN_TOKEN}-TEMP-${suffix}` : vehicle.registration),
  };
}

function createIncidentPayload(index, code, subcode, timestamp) {
  const suffix = String.fromCharCode(65 + index);
  const stamp = `${TEST_RUN_TOKEN}-${suffix}`;
  return {
    title: `${TEST_RUN_TOKEN} Incident ${suffix}`,
    incidentCode: `${TEST_RUN_TOKEN}-INC-${suffix}`,
    incidentType: "Patrol Test",
    street: `${stamp} Street`,
    suburb: `${stamp} Suburb`,
    description: `${TEST_RUN_TOKEN} patrol workflow incident`,
    sector: "Sector 1",
    severity: index % 2 === 0 ? "MEDIUM" : "HIGH",
    date: timestamp.date,
    time: timestamp.time,
    incidentCodeId: code.id,
    incidentSubcodeId: subcode.id,
  };
}

async function main() {
  const apply = isApplyMode();
  const timestamp = isoDateParts(new Date());

  console.log("Patrol workflow smoke test");
  console.log(`API base: ${API_BASE_URL}`);
  console.log(`Test run: ${TEST_RUN_ID}`);
  console.log(`Test token: ${TEST_RUN_TOKEN}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");

  const patroller = await login(PATROLLER_EMAIL, PATROLLER_PASSWORD, "patroller");
  const controlRoom = await login(CONTROL_ROOM_EMAIL, CONTROL_ROOM_PASSWORD, "control room");
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");

  const [incidentCodes, incidentSubcodes, serviceTypes, infrastructureTypes, vehicles] = await Promise.all([
    requestJson("/admin/incident-codes?active=true", { token: admin.token }),
    requestJson("/admin/incident-subcodes?active=true", { token: admin.token }),
    requestJson("/admin/service-types?active=true", { token: admin.token }),
    requestJson("/admin/infrastructure-types?active=true", { token: admin.token }),
    requestJson("/vehicles", { token: patroller.token }),
  ]);

  const selectedIncidentCode = incidentCodes.find((code) => code.active !== false) || incidentCodes[0];
  const selectedIncidentSubcode =
    incidentSubcodes.find((subcode) => subcode.incidentCode?.id === selectedIncidentCode?.id) ||
    incidentSubcodes[0];
  const selectedServiceType = serviceTypes.find((serviceType) => serviceType.active !== false) || serviceTypes[0];
  const selectedInfrastructureType =
    infrastructureTypes.find((infrastructureType) => infrastructureType.active !== false) ||
    infrastructureTypes[0];
  const registeredVehicle = vehicles.find((vehicle) => vehicle.isActive);

  if (!selectedIncidentCode || !selectedIncidentSubcode || !selectedServiceType || !selectedInfrastructureType) {
    throw new Error("Required master register data is missing.");
  }

  if (!registeredVehicle) {
    throw new Error("No active registered vehicle found for the registered vehicle path.");
  }

  const sessions = [
    sessionPlan(0, "TEMPORARY", registeredVehicle, ["WC22"]),
    sessionPlan(1, "REGISTERED", registeredVehicle, ["WV75"]),
    sessionPlan(2, "TEMPORARY", registeredVehicle, ["WC22", "WV75"]),
  ];

  const incidents = [
    createIncidentPayload(0, selectedIncidentCode, selectedIncidentSubcode, timestamp),
    createIncidentPayload(1, selectedIncidentCode, selectedIncidentSubcode, timestamp),
  ];

  console.log("Planned test records:");
  console.log(JSON.stringify({ sessions, incidents }, null, 2));
  console.log("");

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply after setting passwords to execute the workflow.");
    return;
  }

  const results = {
    started: [],
    incidents: [],
    events: [],
    ended: [],
  };

  const activeBefore = await requestJson("/patrols/active", { token: controlRoom.token });
  console.log(`Active patrols before test: ${activeBefore.length}`);

  const startPayloads = sessions.map((session, index) => ({
    vehicleMode: session.vehicleMode,
    vehicleId: session.vehicleId,
    callSign: session.callSign,
    sector: session.sector,
    startKm: session.startKm,
    crewCallSigns: session.crewCallSigns,
    tempVehicleRegistration: session.tempVehicleRegistration,
    tempVehicleMake: session.tempVehicleMake,
    tempVehicleModel: session.tempVehicleModel,
    tempVehicleColour: session.tempVehicleColour,
    tempVehicleType: session.tempVehicleType,
    tempVehicleNotes: session.tempVehicleNotes,
    prePatrolChecklist: session.checklist,
  }));

  for (const [index, session] of sessions.entries()) {
    const startResponse = await requestJson("/patrols/start", {
      method: "POST",
      token: patroller.token,
      body: startPayloads[index],
    });

    results.started.push({
      id: startResponse.id,
      callSign: startResponse.callSign,
      vehicleLabel: startResponse.vehicleLabel,
      vehicleMode: startResponse.vehicleMode,
    });

    const activePatrols = await requestJson("/patrols/active", { token: controlRoom.token });
    const activeMatch = activePatrols.find((patrol) => patrol.id === startResponse.id);

    if (!activeMatch) {
      throw new Error(`Control Room could not see active patrol ${startResponse.id}.`);
    }

    if (session.vehicleMode === "TEMPORARY" && !String(activeMatch.vehicleLabel || "").includes(TEST_RUN_TOKEN)) {
      throw new Error(`Temporary vehicle label did not include the test marker for ${session.callSign}.`);
    }

    if (session.vehicleMode === "REGISTERED" && activeMatch.vehicleLabel !== registeredVehicle.registration) {
      throw new Error(`Registered vehicle label mismatch for ${session.callSign}.`);
    }

    if (index === 0) {
      const observation = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "MOBILE",
          referenceNumber: `${TEST_RUN_TOKEN}-OBS-A`,
          description: `${TEST_RUN_TOKEN} observation/status update`,
          streetName: `${TEST_RUN_TOKEN} Observation Street`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} observation note`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(observation.id);

      const assistance = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "MOBILE",
          referenceNumber: `${TEST_RUN_TOKEN}-ASST-A`,
          assistance: `${TEST_RUN_TOKEN} assistance request 1`,
          serviceTypeId: selectedServiceType.id,
          description: `${TEST_RUN_TOKEN} assistance request 1`,
          streetName: `${TEST_RUN_TOKEN} Assistance Street`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} assistance note`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(assistance.id);

      const infrastructure = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "INFRASTRUCTURE",
          referenceNumber: `${TEST_RUN_TOKEN}-INF-A`,
          infrastructureTypeId: selectedInfrastructureType.id,
          description: `${TEST_RUN_TOKEN} infrastructure report 1`,
          streetName: `${TEST_RUN_TOKEN} Infrastructure Street`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} infrastructure note`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(infrastructure.id);
    }

    if (index === 1) {
      const incident = await requestJson("/admin/incidents", {
        method: "POST",
        token: patroller.token,
        body: incidents[0],
      });
      results.incidents.push(incident.id);

      const notified = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "NOTIFIED",
          incidentId: incident.id,
          incidentCodeId: selectedIncidentCode.id,
          incidentSubcodeId: selectedIncidentSubcode.id,
          referenceNumber: `${TEST_RUN_TOKEN}-INC-A`,
          description: `${TEST_RUN_TOKEN} incident response 1`,
          streetName: `${TEST_RUN_TOKEN} Incident Street`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} incident note`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(notified.id);

      const infrastructure = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "INFRASTRUCTURE",
          referenceNumber: `${TEST_RUN_TOKEN}-INF-B`,
          infrastructureTypeId: selectedInfrastructureType.id,
          description: `${TEST_RUN_TOKEN} infrastructure report 2`,
          streetName: `${TEST_RUN_TOKEN} Infrastructure Street 2`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} infrastructure note 2`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(infrastructure.id);
    }

    if (index === 2) {
      const incident = await requestJson("/admin/incidents", {
        method: "POST",
        token: patroller.token,
        body: incidents[1],
      });
      results.incidents.push(incident.id);

      const notified = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "NOTIFIED",
          incidentId: incident.id,
          incidentCodeId: selectedIncidentCode.id,
          incidentSubcodeId: selectedIncidentSubcode.id,
          referenceNumber: `${TEST_RUN_TOKEN}-INC-B`,
          description: `${TEST_RUN_TOKEN} incident response 2`,
          streetName: `${TEST_RUN_TOKEN} Incident Street 2`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} incident note 2`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(notified.id);

      const assistance = await requestJson("/patrol-events", {
        method: "POST",
        token: patroller.token,
        body: {
          patrolId: startResponse.id,
          type: "MOBILE",
          referenceNumber: `${TEST_RUN_TOKEN}-ASST-B`,
          assistance: `${TEST_RUN_TOKEN} assistance request 2`,
          serviceTypeId: selectedServiceType.id,
          description: `${TEST_RUN_TOKEN} assistance request 2`,
          streetName: `${TEST_RUN_TOKEN} Assistance Street 2`,
          suburb: "Sector 1",
          locationNotes: `${TEST_RUN_TOKEN} assistance note 2`,
          latitude: "",
          longitude: "",
        },
      });
      results.events.push(assistance.id);
    }

    const endResponse = await requestJson(`/patrols/${startResponse.id}/end`, {
      method: "POST",
      token: patroller.token,
      body: {
        endKm: session.startKm + 18,
        summary: `${TEST_RUN_TOKEN} completed ${session.callSign}`,
      },
    });

    results.ended.push({
      id: endResponse.id,
      status: endResponse.status,
    });
  }

  const activeAfter = await requestJson("/patrols/active", { token: controlRoom.token });
  const remainingTestPatrols = activeAfter.filter((patrol) => String(patrol.callSign || "").includes(TEST_RUN_TOKEN));

  if (remainingTestPatrols.length) {
    throw new Error(`Test patrols still active after end: ${remainingTestPatrols.map((patrol) => patrol.id).join(", ")}`);
  }

  const dashboard = await requestJson("/admin/dashboard?status=ALL", { token: controlRoom.token });
  const testPatrols = (dashboard.patrols || []).filter(
    (patrol) =>
      String(patrol.callSign || "").includes(TEST_RUN_TOKEN) ||
      String(patrol.summary || "").includes(TEST_RUN_TOKEN) ||
      String(patrol.tempVehicleRegistration || "").includes(TEST_RUN_TOKEN)
  );

  const testIncidents = (dashboard.incidents || []).filter(
    (incident) =>
      String(incident.title || "").includes(TEST_RUN_TOKEN) ||
      String(incident.description || "").includes(TEST_RUN_TOKEN) ||
      String(incident.incidentCode || "").includes(TEST_RUN_TOKEN)
  );

  console.log("");
  console.log("Smoke test results:");
  console.log(JSON.stringify(results, null, 2));
  console.log("");
  console.log(`Control Room dashboard test patrols: ${testPatrols.length}`);
  console.log(`Control Room dashboard test incidents: ${testIncidents.length}`);
  console.log(`Active patrols after test: ${activeAfter.length}`);
  console.log("Patrol workflow smoke test complete.");
}

main().catch((error) => {
  console.error("Patrol workflow smoke test failed:", error);
  process.exitCode = 1;
});
