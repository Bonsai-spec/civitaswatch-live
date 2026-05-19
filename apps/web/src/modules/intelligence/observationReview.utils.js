const OBSERVATION_LABEL_FIELDS = {
  "observation type": "observationType",
  tags: "tags",
  registration: "registration",
  "partial registration": "partialRegistration",
  make: "make",
  model: "model",
  colour: "colour",
  color: "colour",
  "vehicle type": "vehicleType",
  occupants: "occupants",
  "direction of travel": "directionOfTravel",
  "direction of movement": "directionOfTravel",
  "distinguishing marks": "distinguishingMarks",
  "alias/name volunteered": "aliasName",
  "alias / name": "aliasName",
  alias: "aliasName",
  clothing: "clothing",
  "person description": "physicalDescription",
  "physical description": "physicalDescription",
  "behaviour observed": "behaviour",
  behavior: "behaviour",
  behaviour: "behaviour",
  "place name": "placeName",
  "premises type": "premisesType",
  "reason for concern": "reasonForConcern",
  "observed activity": "observedActivity",
  "source type": "sourceType",
  "information status": "informationStatus",
  "public/operational summary": "notesDescription",
  "reference number": "referenceNumber",
  "infrastructure type": "infrastructureType",
  notes: "notesDescription",
  description: "notesDescription",
};

function normalizeLabel(label) {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function appendField(fields, key, value) {
  const text = String(value || "").trim();
  if (!key || !text) return;

  fields[key] = fields[key] ? `${fields[key]}\n${text}` : text;
}

export function parseObservationDescription(description) {
  const fields = {};
  let lastKey = "";

  String(description || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = OBSERVATION_LABEL_FIELDS[normalizeLabel(match[1])];
        if (key) {
          appendField(fields, key, match[2]);
          lastKey = key;
          return;
        }
      }

      appendField(fields, lastKey || "notesDescription", trimmed);
    });

  return fields;
}

export function isStructuredObservationEvent(event) {
  const description = String(event?.description || "");

  return (
    String(event?.type || "").toUpperCase() === "OBSERVATION" ||
    /(^|\n)\s*Observation Type:/i.test(description)
  );
}

export function getObservationReviewRows(events) {
  return (events || [])
    .filter(isStructuredObservationEvent)
    .map((event) => ({
      event,
      fields: parseObservationDescription(event.description),
    }));
}

export function getSuggestedEntityTypeForObservation(fields) {
  const observationType = String(fields?.observationType || "").toLowerCase();

  if (observationType.includes("vehicle")) return "VEHICLE";
  if (observationType.includes("person")) return "PERSON";
  if (observationType.includes("place")) return fields?.reasonForConcern ? "RISK_LOCATION" : "LOCATION";
  if (observationType.includes("infrastructure")) return "RISK_LOCATION";
  if (observationType.includes("community tip")) return "INCIDENT_PATTERN";

  return "OTHER";
}

export function getObservationPromotionDefaults(event) {
  const fields = parseObservationDescription(event?.description);
  const entityType = getSuggestedEntityTypeForObservation(fields);
  const vehicleLabel = [
    fields.registration || fields.partialRegistration,
    fields.colour,
    fields.make,
    fields.model,
  ].filter(Boolean).join(" ");
  const personLabel = [fields.aliasName, fields.physicalDescription].filter(Boolean).join(" - ");
  const placeLabel = [fields.placeName, event?.suburb].filter(Boolean).join(" - ");
  const displayName =
    vehicleLabel ||
    personLabel ||
    placeLabel ||
    fields.reasonForConcern ||
    fields.observationType ||
    `Patrol observation - ${event?.createdAt ? new Date(event.createdAt).toLocaleDateString() : "source"}`;

  return {
    entityType,
    displayName,
    description: [
      fields.notesDescription,
      fields.reasonForConcern ? `Reason for concern: ${fields.reasonForConcern}` : null,
      fields.behaviour ? `Behaviour: ${fields.behaviour}` : null,
      fields.tags ? `Tags: ${fields.tags}` : null,
    ].filter(Boolean).join("\n"),
    riskLevel: "LOW",
    status: "ACTIVE",
    notes: "Reviewed from Intelligence Observation Review.",
    roleInIncident: "",
    observationType: fields.observationType || event?.type || "PATROL_EVENT",
    vehicleRegistration: fields.registration || "",
    vehicleMake: fields.make || "",
    vehicleModel: fields.model || "",
    vehicleColour: fields.colour || "",
    vehicleType: fields.vehicleType || "",
    vehicleMarks: fields.distinguishingMarks || "",
    vehicleNotes: [
      fields.partialRegistration ? `Partial registration: ${fields.partialRegistration}` : null,
      fields.occupants ? `Occupants: ${fields.occupants}` : null,
      fields.directionOfTravel ? `Direction: ${fields.directionOfTravel}` : null,
    ].filter(Boolean).join("\n"),
  };
}
