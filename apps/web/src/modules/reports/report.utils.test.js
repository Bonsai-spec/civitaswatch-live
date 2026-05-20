import test from "node:test";
import assert from "node:assert/strict";
import {
  getIncidentClassificationCsvColumns,
  getIncidentSuburb,
  resolveIncidentClassification,
} from "./report.utils.js";

test("resolves SAPS incident code relation without using unique incident references", () => {
  const classification = resolveIncidentClassification({
    code: "INC-20260504-062157-34L8",
    incidentCodeRef: {
      code: "037",
      name: "Burglar Alarm",
    },
  });

  assert.equal(classification.codeLabel, "037 - Burglar Alarm");
  assert.equal(classification.code, "037");
  assert.equal(classification.codeName, "Burglar Alarm");
  assert.notEqual(classification.codeLabel, "INC-20260504-062157-34L8");
});

test("resolves SAPS incident code and subcode relation into combined label", () => {
  const classification = resolveIncidentClassification({
    incidentCode: {
      code: "037",
      name: "Burglar Alarm",
    },
    incidentSubcode: {
      subcode: "FROM_VEHICLE",
      name: "Theft From Vehicle",
    },
  });

  assert.equal(
    classification.codeSubcodeLabel,
    "037 - Burglar Alarm / FROM_VEHICLE - Theft From Vehicle"
  );
});

test("does not classify an incident from its unique incident report code", () => {
  const classification = resolveIncidentClassification({
    code: "INC-20260504-062157-34L8",
  });

  assert.equal(classification.codeLabel, "Unclassified");
  assert.equal(classification.code, "Unclassified");
  assert.notEqual(classification.codeLabel, "INC-20260504-062157-34L8");
});

test("does not guess classification from title text", () => {
  const classification = resolveIncidentClassification({
    title: "MVA",
  });

  assert.equal(classification.codeLabel, "Unclassified");
  assert.equal(classification.codeSubcodeLabel, "Unclassified");
});

test("falls back to linked patrol event SAPS classification", () => {
  const classification = resolveIncidentClassification({
    patrolEvents: [
      {
        incidentCodeRef: {
          code: "038",
          name: "Suspicious Person",
        },
      },
    ],
  });

  assert.equal(classification.codeLabel, "038 - Suspicious Person");
});

test("resolves suburb from incident, then linked patrol event, then Unknown", () => {
  assert.equal(
    getIncidentSuburb({
      suburb: "Incident Suburb",
      patrolEvents: [{ suburb: "Patrol Event Suburb" }],
    }),
    "Incident Suburb"
  );
  assert.equal(
    getIncidentSuburb({
      patrolEvents: [{ suburb: "Patrol Event Suburb" }],
    }),
    "Patrol Event Suburb"
  );
  assert.equal(getIncidentSuburb({}), "Unknown");
});

test("classification CSV columns expose SAPS classification fields only", () => {
  const row = {
    code: "INC-20260504-062157-34L8",
    incidentCodeRef: {
      code: "037",
      name: "Burglar Alarm",
    },
    incidentSubcodeRef: {
      subcode: "FROM_VEHICLE",
      name: "Theft From Vehicle",
    },
  };
  const columns = getIncidentClassificationCsvColumns();
  const valuesByLabel = Object.fromEntries(
    columns.map((column) => [column.label, column.value(row)])
  );

  assert.deepEqual(
    columns.map((column) => column.label),
    [
      "Incident Code",
      "Incident Name",
      "Incident Subcode",
      "Incident Subcode Name",
    ]
  );
  assert.equal(valuesByLabel["Incident Code"], "037");
  assert.equal(valuesByLabel["Incident Name"], "Burglar Alarm");
  assert.equal(valuesByLabel["Incident Subcode"], "FROM_VEHICLE");
  assert.equal(valuesByLabel["Incident Subcode Name"], "Theft From Vehicle");
  assert.notEqual(valuesByLabel["Incident Code"], "INC-20260504-062157-34L8");
});
