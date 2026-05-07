import { getIntelAgeDays } from "../../utils/date.utils";

export function getIntelRiskBadge(entity) {
  return (entity?.riskLevel || "LOW") + " / " + (entity?.status || "ACTIVE");
}

export function getIntelAgeOpacity(record) {
  const days = getIntelAgeDays(record);

  if (days === null) return 0.5;
  if (days <= 7) return 1;
  if (days <= 30) return 0.78;
  if (days <= 90) return 0.55;
  return 0.35;
}

export function getShortRelationshipLabel(label) {
  const shortLabels = {
    ASSOCIATED_WITH: "ASSOC",
    LINKED_TO: "LINK",
    SAME_VEHICLE: "SAME",
    SEEN_WITH: "SEEN",
    OPERATES_IN: "AREA",
    INVOLVED_IN: "INVOLVED",
    INCIDENT_LINK: "INCIDENT",
    PATROL_OBSERVATION: "OBS",
  };

  return shortLabels[label] || label || "LINK";
}

export function normalizeIntelMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function normalizeVehicleRegistration(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function getEntityVehicleRegistration(entity) {
  return normalizeVehicleRegistration(
    entity?.voivehicleDetails?.registrationNumber ||
      entity?.vehicleRegistration ||
      (entity?.entityType === "VEHICLE" ? entity?.displayName : "")
  );
}

export function getEntitySearchText(entity) {
  return [
    entity?.entityType,
    entity?.displayName,
    entity?.description,
    entity?.address,
    entity?.suburb,
    entity?.sector,
    entity?.voivehicleDetails?.registrationNumber,
    entity?.voivehicleDetails?.make,
    entity?.voivehicleDetails?.model,
    entity?.voivehicleDetails?.colour,
    entity?.voivehicleDetails?.vehicleType,
    entity?.voivehicleDetails?.distinguishingMarks,
    entity?.voivehicleDetails?.notes,
  ]
    .filter(Boolean)
    .join(" ");
}

export function hasExistingIntelRelationship(selectedEntity, targetEntity) {
  if (!selectedEntity?.id || !targetEntity?.id) return true;

  const targetId = targetEntity.id;

  return [
    ...(selectedEntity.outgoingLinks || []).map((link) => link.toEntityId || link.toEntity?.id),
    ...(selectedEntity.incomingLinks || []).map((link) => link.fromEntityId || link.fromEntity?.id),
  ].includes(targetId);
}

export function getAutoLinkSuggestionKey(selectedEntity, targetEntity) {
  return `${selectedEntity?.id || "source"}->${targetEntity?.id || "target"}`;
}

export function getSuggestedRelationship(selectedEntity, targetEntity, reasons = []) {
  if (reasons.some((reason) => reason.toLowerCase().includes("registration"))) {
    return "SAME_VEHICLE";
  }
  if (selectedEntity?.entityType === "PERSON" && targetEntity?.entityType === "VEHICLE") return "SEEN_WITH";
  if (selectedEntity?.entityType === "VEHICLE" && targetEntity?.entityType === "PERSON") return "SEEN_WITH";
  if (selectedEntity?.entityType === "LOCATION" || targetEntity?.entityType === "LOCATION") return "OPERATES_IN";
  return "ASSOCIATED_WITH";
}

export function buildAutoLinkSuggestions(selectedEntity, entities = []) {
  if (!selectedEntity?.id) return [];

  const selectedName = normalizeIntelMatchText(selectedEntity.displayName);
  const selectedReg = getEntityVehicleRegistration(selectedEntity);
  const selectedText = normalizeIntelMatchText(getEntitySearchText(selectedEntity));
  const suggestions = [];

  (entities || []).forEach((targetEntity) => {
    if (!targetEntity?.id || targetEntity.id === selectedEntity.id) return;
    if (hasExistingIntelRelationship(selectedEntity, targetEntity)) return;

    const targetName = normalizeIntelMatchText(targetEntity.displayName);
    const targetReg = getEntityVehicleRegistration(targetEntity);
    const targetText = normalizeIntelMatchText(getEntitySearchText(targetEntity));
    const reasons = [];
    let score = 0;

    if (selectedReg && targetReg && selectedReg === targetReg) {
      score += 100;
      reasons.push(`Exact registration match: ${selectedReg}`);
    } else if (selectedReg && targetText.includes(selectedReg.toLowerCase())) {
      score += 82;
      reasons.push(`Target notes mention registration: ${selectedReg}`);
    } else if (targetReg && selectedText.includes(targetReg.toLowerCase())) {
      score += 82;
      reasons.push(`Current notes mention registration: ${targetReg}`);
    }

    if (selectedName && targetName && selectedName === targetName) {
      score += 78;
      reasons.push("Matching display name");
    }

    if (
      selectedEntity.address &&
      targetEntity.address &&
      normalizeIntelMatchText(selectedEntity.address) === normalizeIntelMatchText(targetEntity.address)
    ) {
      score += 45;
      reasons.push("Same street/address");
    }

    if (
      selectedEntity.suburb &&
      targetEntity.suburb &&
      normalizeIntelMatchText(selectedEntity.suburb) === normalizeIntelMatchText(targetEntity.suburb)
    ) {
      score += 25;
      reasons.push("Same suburb/area");
    }

    if (
      selectedEntity.sector &&
      targetEntity.sector &&
      selectedEntity.sector === targetEntity.sector
    ) {
      score += 15;
      reasons.push("Same sector");
    }

    if (score < 50) return;

    const relationship = getSuggestedRelationship(selectedEntity, targetEntity, reasons);
    const strength = Math.max(4, Math.min(10, Math.round(score / 10)));

    suggestions.push({
      key: getAutoLinkSuggestionKey(selectedEntity, targetEntity),
      targetEntity,
      relationship,
      strength,
      score,
      reasons,
      notes: `Auto suggestion: ${reasons.join("; ")}`,
    });
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function getGraphNodeColor(node) {
  if (node.isCenter) return "#2563eb";
  if (node.entityType === "PERSON") return "#7c3aed";
  if (node.entityType === "VEHICLE") return "#ea580c";
  if (node.entityType === "LOCATION") return "#16a34a";
  if (node.entityType === "INCIDENT") return "#dc2626";
  if (node.entityType === "PATROL_EVENT") return "#0891b2";
  if (node.riskLevel === "CRITICAL") return "#b91c1c";
  if (node.riskLevel === "HIGH") return "#f97316";
  return "#64748b";
}

export function getEntityLatLng(entity) {
  if (!entity) return null;

  const latValue =
    entity.latitude ??
    entity.lat ??
    entity.locationLatitude ??
    entity.geoLatitude ??
    entity.coordinates?.latitude ??
    entity.location?.latitude;

  const lngValue =
    entity.longitude ??
    entity.lng ??
    entity.lon ??
    entity.locationLongitude ??
    entity.geoLongitude ??
    entity.coordinates?.longitude ??
    entity.location?.longitude;

  const lat = Number(latValue);
  const lng = Number(lngValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}
