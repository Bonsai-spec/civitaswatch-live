import { useEffect, useMemo, useState } from "react";
import { INTELLIGENCE_ENDPOINTS } from "../core/endpoints";
import {
  buildAutoLinkSuggestions,
  getAutoLinkSuggestionKey,
} from "../modules/intelligence/intelligence.utils";
import {
  getRecordTimestamp,
  parseIntelDate,
} from "../utils/date.utils";

function emptyIntelForm() {
  return {
    entityType: "PERSON",
    displayName: "",
    description: "",
    riskLevel: "LOW",
    status: "ACTIVE",
    address: "",
    suburb: "",
    sector: "",
    latitude: "",
    longitude: "",
    vehicleRegistration: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColour: "",
    vehicleType: "",
    vehicleMarks: "",
    vehicleNotes: "",
  };
}

function getIntelTimeWindowStart(preset) {
  const now = new Date();

  if (preset === "24H") {
    now.setHours(now.getHours() - 24);
    return now;
  }

  if (preset === "7D") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (preset === "30D") {
    now.setDate(now.getDate() - 30);
    return now;
  }

  if (preset === "90D") {
    now.setDate(now.getDate() - 90);
    return now;
  }

  return null;
}

function isWithinIntelTimeFilter(record, timeFilter) {
  if (!timeFilter || timeFilter.preset === "ALL") return true;

  const timestamp = getRecordTimestamp(record);
  const recordDate = parseIntelDate(timestamp);

  // Keep legacy records visible when using ALL only. For a time window,
  // records without dates are hidden so the timeline stays meaningful.
  if (!recordDate) return false;

  if (timeFilter.preset === "CUSTOM") {
    const from = parseIntelDate(timeFilter.from);
    const to = parseIntelDate(timeFilter.to);

    if (from && recordDate < from) return false;

    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (recordDate > endOfDay) return false;
    }

    return true;
  }

  const start = getIntelTimeWindowStart(timeFilter.preset);
  return start ? recordDate >= start : true;
}

export function useIntelligence({
  token,
  active,
  canViewIntelligence,
  getAuthHeaders,
  getJsonAuthHeaders,
}) {
  const [intelligenceEntities, setIntelligenceEntities] = useState([]);
  const [selectedIntelEntity, setSelectedIntelEntity] = useState(null);
  const [intelForm, setIntelForm] = useState(null);
  const [isEditingIntel, setIsEditingIntel] = useState(false);
  const [intelSearch, setIntelSearch] = useState("");
  const [intelTimeFilter, setIntelTimeFilter] = useState({
    preset: "ALL",
    from: "",
    to: "",
  });
  const [intelLinkForm, setIntelLinkForm] = useState({
    fromEntityId: "",
    toEntityId: "",
    relationship: "LINKED_TO",
    strength: "",
    notes: "",
  });
  const [hiddenAutoLinkSuggestionKeys, setHiddenAutoLinkSuggestionKeys] = useState(new Set());

  function scrollToIntelSpiderMap(delay = 250) {
    window.setTimeout(() => {
      document.getElementById("intel-spider-map")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, delay);
  }

  function resetIntelligence() {
    setIntelligenceEntities([]);
    setSelectedIntelEntity(null);
    setIntelForm(null);
    setHiddenAutoLinkSuggestionKeys(new Set());
  }

  async function loadIntelligence() {
    if (!token || !canViewIntelligence) return;

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.list, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to load intelligence");
        return;
      }

      setIntelligenceEntities(Array.isArray(json) ? json : json.entities || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load intelligence");
    }
  }

  async function refreshIntelligence() {
    await loadIntelligence();

    if (selectedIntelEntity?.id) {
      await viewIntelEntity(selectedIntelEntity);
    }
  }

  function startAddIntelEntity() {
    if (!canViewIntelligence) return;
    setSelectedIntelEntity(null);
    setIsEditingIntel(false);
    setIntelForm(emptyIntelForm());
  }

  function startEditIntelEntity(entity) {
    if (!canViewIntelligence) return;
    setSelectedIntelEntity(null);
    setIsEditingIntel(true);
    setIntelForm({
      ...emptyIntelForm(),
      ...entity,
      address: entity.address || "",
      suburb: entity.suburb || "",
      sector: entity.sector || "",
      latitude: entity.latitude ?? "",
      longitude: entity.longitude ?? "",
      vehicleRegistration: entity.voivehicleDetails?.registrationNumber || "",
      vehicleMake: entity.voivehicleDetails?.make || "",
      vehicleModel: entity.voivehicleDetails?.model || "",
      vehicleColour: entity.voivehicleDetails?.colour || "",
      vehicleType: entity.voivehicleDetails?.vehicleType || "",
      vehicleMarks: entity.voivehicleDetails?.distinguishingMarks || "",
      vehicleNotes: entity.voivehicleDetails?.notes || "",
    });
  }

  function cancelIntelForm() {
    setIntelForm(null);
    setIsEditingIntel(false);
  }

  async function saveIntelEntity(e) {
    e.preventDefault();

    if (!canViewIntelligence) {
      alert("You do not have permission to save intelligence.");
      return;
    }

    if (!intelForm.displayName.trim()) {
      alert("Display name is required.");
      return;
    }

    const hasLatitude = intelForm.latitude !== "" && intelForm.latitude !== null && intelForm.latitude !== undefined;
    const hasLongitude = intelForm.longitude !== "" && intelForm.longitude !== null && intelForm.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      alert("Latitude and longitude must be entered together.");
      return;
    }

    if (hasLatitude && (Number.isNaN(Number(intelForm.latitude)) || Number(intelForm.latitude) < -90 || Number(intelForm.latitude) > 90)) {
      alert("Latitude must be a valid number between -90 and 90.");
      return;
    }

    if (hasLongitude && (Number.isNaN(Number(intelForm.longitude)) || Number(intelForm.longitude) < -180 || Number(intelForm.longitude) > 180)) {
      alert("Longitude must be a valid number between -180 and 180.");
      return;
    }

    try {
      const url = isEditingIntel
        ? INTELLIGENCE_ENDPOINTS.detail(intelForm.id)
        : INTELLIGENCE_ENDPOINTS.list;

      const method = isEditingIntel ? "PATCH" : "POST";

      const payload = {
        entityType: intelForm.entityType,
        displayName: intelForm.displayName.trim(),
        description: intelForm.description || null,
        address: intelForm.address || null,
        suburb: intelForm.suburb || null,
        sector: intelForm.sector || null,
        latitude: intelForm.latitude === "" || intelForm.latitude === null ? null : Number(intelForm.latitude),
        longitude: intelForm.longitude === "" || intelForm.longitude === null ? null : Number(intelForm.longitude),
        riskLevel: intelForm.riskLevel || "LOW",
        status: intelForm.status || "ACTIVE",
        vehicleDetails:
          intelForm.entityType === "VEHICLE"
            ? {
                registrationNumber: intelForm.vehicleRegistration || "UNKNOWN",
                make: intelForm.vehicleMake || null,
                model: intelForm.vehicleModel || null,
                colour: intelForm.vehicleColour || null,
                vehicleType: intelForm.vehicleType || null,
                distinguishingMarks: intelForm.vehicleMarks || null,
                notes: intelForm.vehicleNotes || null,
              }
            : null,
      };

      const res = await fetch(url, {
        method,
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to save intelligence entity");
        return;
      }

      setIntelForm(null);
      setIsEditingIntel(false);
      setSelectedIntelEntity(json);
      await loadIntelligence();
    } catch (err) {
      console.error(err);
      alert("Failed to save intelligence entity");
    }
  }

  async function viewIntelEntity(entity) {
    if (!entity?.id) return;

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.connections(entity.id), {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || json.message || "Failed to load intelligence profile");
        return;
      }

      setIntelForm(null);
      setSelectedIntelEntity(json);
      setHiddenAutoLinkSuggestionKeys(new Set());
      setIntelLinkForm((prev) => ({
        ...prev,
        fromEntityId: json.id,
      }));

      scrollToIntelSpiderMap();
    } catch (err) {
      console.error(err);
      alert("Failed to load intelligence profile");
    }
  }

  async function deleteIntelEntity(entity) {
    if (!canViewIntelligence || !entity?.id) return;
    if (!confirm(`Archive intelligence entity: ${entity.displayName}?`)) return;

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.detail(entity.id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to archive intelligence entity");
        return;
      }

      if (selectedIntelEntity?.id === entity.id) {
        setSelectedIntelEntity(null);
      }

      await loadIntelligence();
    } catch (err) {
      console.error(err);
      alert("Failed to archive intelligence entity");
    }
  }

  async function createIntelLink(e) {
    e.preventDefault();

    if (!canViewIntelligence) {
      alert("You do not have permission to link intelligence.");
      return;
    }

    if (!intelLinkForm.fromEntityId || !intelLinkForm.toEntityId) {
      alert("Select both source and target entities.");
      return;
    }

    if (intelLinkForm.fromEntityId === intelLinkForm.toEntityId) {
      alert("An entity cannot link to itself.");
      return;
    }

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.links, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          fromEntityId: intelLinkForm.fromEntityId,
          toEntityId: intelLinkForm.toEntityId,
          relationship: intelLinkForm.relationship,
          strength: intelLinkForm.strength === "" ? null : Number(intelLinkForm.strength),
          notes: intelLinkForm.notes || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create intelligence link");
        return;
      }

      setIntelLinkForm({
        fromEntityId: intelLinkForm.fromEntityId,
        toEntityId: "",
        relationship: "LINKED_TO",
        strength: "",
        notes: "",
      });

      const source = intelligenceEntities.find((item) => item.id === intelLinkForm.fromEntityId) || selectedIntelEntity;
      if (source?.id) await viewIntelEntity(source);
      await loadIntelligence();
    } catch (err) {
      console.error(err);
      alert("Failed to create intelligence link");
    }
  }

  async function deleteIntelLink(link) {
    if (!canViewIntelligence || !link?.id) return;

    const fromName = link.fromEntity?.displayName || link.fromEntityId || "source";
    const toName = link.toEntity?.displayName || link.toEntityId || "target";

    if (!confirm(`Delete link ${fromName} → ${toName} (${link.relationship || "LINK"})?`)) {
      return;
    }

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.linkDetail(link.id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to delete intelligence link");
        return;
      }

      const currentProfileId = selectedIntelEntity?.id;
      await loadIntelligence();

      if (currentProfileId) {
        await viewIntelEntity({ id: currentProfileId });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete intelligence link");
    }
  }

  async function createSuggestedIntelLink(suggestion) {
    if (!canViewIntelligence || !selectedIntelEntity?.id || !suggestion?.targetEntity?.id) return;

    if (!confirm(`Accept suggestion and create ${suggestion.relationship} link to ${suggestion.targetEntity.displayName}?`)) {
      return;
    }

    try {
      const res = await fetch(INTELLIGENCE_ENDPOINTS.links, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          fromEntityId: selectedIntelEntity.id,
          toEntityId: suggestion.targetEntity.id,
          relationship: suggestion.relationship,
          strength: suggestion.strength,
          notes: suggestion.notes,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create suggested link");
        return;
      }

      setHiddenAutoLinkSuggestionKeys((current) => {
        const next = new Set(current);
        next.add(suggestion.key || getAutoLinkSuggestionKey(selectedIntelEntity, suggestion.targetEntity));
        return next;
      });

      await loadIntelligence();
      await viewIntelEntity({ id: selectedIntelEntity.id });
      scrollToIntelSpiderMap(450);
    } catch (err) {
      console.error(err);
      alert("Failed to create suggested link");
    }
  }

  function hideAutoLinkSuggestion(suggestion) {
    if (!selectedIntelEntity?.id || !suggestion?.targetEntity?.id) return;

    setHiddenAutoLinkSuggestionKeys((current) => {
      const next = new Set(current);
      next.add(suggestion.key || getAutoLinkSuggestionKey(selectedIntelEntity, suggestion.targetEntity));
      return next;
    });
  }

  function rejectAutoLinkSuggestion(suggestion) {
    if (!suggestion?.targetEntity?.displayName) return;

    if (!confirm(`Reject auto-link suggestion for ${suggestion.targetEntity.displayName}?`)) {
      return;
    }

    hideAutoLinkSuggestion(suggestion);
  }

  const autoLinkSuggestions = useMemo(
    () =>
      buildAutoLinkSuggestions(selectedIntelEntity, intelligenceEntities).filter(
        (suggestion) => !hiddenAutoLinkSuggestionKeys.has(suggestion.key)
      ),
    [selectedIntelEntity, intelligenceEntities, hiddenAutoLinkSuggestionKeys]
  );

  const filteredIntelligenceEntities = intelligenceEntities.filter((entity) =>
    isWithinIntelTimeFilter(entity, intelTimeFilter) &&
    [
      entity.entityType,
      entity.displayName,
      entity.description,
      entity.riskLevel,
      entity.status,
      entity.address,
      entity.suburb,
      entity.sector,
      entity.voivehicleDetails?.registrationNumber,
      entity.voivehicleDetails?.make,
      entity.voivehicleDetails?.model,
      entity.voivehicleDetails?.colour,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(intelSearch.toLowerCase())
  );

  useEffect(() => {
    if (active === "Intelligence" && canViewIntelligence) {
      loadIntelligence();
    }
  }, [active, canViewIntelligence]);

  return {
    intelligenceEntities,
    setIntelligenceEntities,
    selectedIntelEntity,
    setSelectedIntelEntity,
    intelForm,
    setIntelForm,
    isEditingIntel,
    intelSearch,
    setIntelSearch,
    intelTimeFilter,
    setIntelTimeFilter,
    intelLinkForm,
    setIntelLinkForm,
    hiddenAutoLinkSuggestionKeys,
    setHiddenAutoLinkSuggestionKeys,
    autoLinkSuggestions,
    filteredIntelligenceEntities,
    loadIntelligence,
    refreshIntelligence,
    startAddIntelEntity,
    startEditIntelEntity,
    cancelIntelForm,
    saveIntelEntity,
    viewIntelEntity,
    deleteIntelEntity,
    createIntelLink,
    deleteIntelLink,
    createSuggestedIntelLink,
    hideAutoLinkSuggestion,
    rejectAutoLinkSuggestion,
    scrollToIntelSpiderMap,
    resetIntelligence,
  };
}
