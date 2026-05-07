import { getIntelAgeLabel } from "../../utils/date.utils";
import { getIntelAgeOpacity } from "./intelligence.utils";

export function buildIntelGraph(
  entity,
  timeFilter = { preset: "ALL", from: "", to: "" },
  contextEntities = [],
  isWithinIntelTimeFilter = () => true
) {
  if (!entity) return { nodes: [], links: [] };

  const nodesById = new Map();
  const links = [];
  const linkKeys = new Set();

  function addNode(item, group = "ENTITY") {
    if (!item?.id) return;

    if (!nodesById.has(item.id)) {
      nodesById.set(item.id, {
        id: item.id,
        name: item.displayName || item.title || item.incidentCode || item.type || "Unknown",
        label: item.displayName || item.title || item.incidentCode || item.type || "Unknown",
        entityType: item.entityType || group,
        riskLevel: item.riskLevel || "LOW",
        status: item.status || "ACTIVE",
        sourceObject: item,
        group,
        isCenter: item.id === entity.id,
      });
    }
  }

  function addLink(source, target, label, strength = null, sourceObject = null) {
    if (!source || !target) return;

    const uniqueKey = `${source}->${target}->${sourceObject?.id || label || "LINK"}`;
    if (linkKeys.has(uniqueKey)) return;
    linkKeys.add(uniqueKey);

    links.push({
      source,
      target,
      label: label || "LINKED_TO",
      strength,
      sourceObject,
      createdAt: sourceObject?.createdAt || null,
      updatedAt: sourceObject?.updatedAt || null,
      observedAt: sourceObject?.observedAt || sourceObject?.reportedAt || null,
      opacity: getIntelAgeOpacity(sourceObject),
      ageLabel: getIntelAgeLabel(sourceObject),
    });
  }

  addNode(entity, "CENTER");

  const allContextEntities = Array.isArray(contextEntities) ? contextEntities : [];

  allContextEntities.forEach((contextEntity) => {
    if (!contextEntity?.id) return;
    addNode(contextEntity, contextEntity.id === entity.id ? "CENTER" : "ENTITY");
  });

  allContextEntities.forEach((contextEntity) => {
    if (!contextEntity?.id) return;

    (contextEntity.outgoingLinks || []).forEach((link) => {
      if (!isWithinIntelTimeFilter(link, timeFilter)) return;

      const targetEntity = link.toEntity || allContextEntities.find((item) => item.id === link.toEntityId);
      if (!targetEntity?.id) return;

      addNode(contextEntity, contextEntity.id === entity.id ? "CENTER" : "ENTITY");
      addNode(targetEntity, targetEntity.id === entity.id ? "CENTER" : "ENTITY");
      addLink(contextEntity.id, targetEntity.id, link.relationship, link.strength, link);
    });

    (contextEntity.incomingLinks || []).forEach((link) => {
      if (!isWithinIntelTimeFilter(link, timeFilter)) return;

      const sourceEntity = link.fromEntity || allContextEntities.find((item) => item.id === link.fromEntityId);
      if (!sourceEntity?.id) return;

      addNode(sourceEntity, sourceEntity.id === entity.id ? "CENTER" : "ENTITY");
      addNode(contextEntity, contextEntity.id === entity.id ? "CENTER" : "ENTITY");
      addLink(sourceEntity.id, contextEntity.id, link.relationship, link.strength, link);
    });
  });

  (entity.outgoingLinks || []).forEach((link) => {
    if (!link.toEntity || !isWithinIntelTimeFilter(link, timeFilter)) return;
    addNode(link.toEntity, "ENTITY");
    addLink(entity.id, link.toEntity.id, link.relationship, link.strength, link);
  });

  (entity.incomingLinks || []).forEach((link) => {
    if (!link.fromEntity || !isWithinIntelTimeFilter(link, timeFilter)) return;
    addNode(link.fromEntity, "ENTITY");
    addLink(link.fromEntity.id, entity.id, link.relationship, link.strength, link);
  });

  (entity.incidentVOILinks || []).forEach((item) => {
    const timeRecord = { ...item, ...(item.incident || {}) };
    if (!item.incident?.id || !isWithinIntelTimeFilter(timeRecord, timeFilter)) return;

    const incidentNode = {
      ...item.incident,
      displayName: item.incident.incidentCode || item.incident.title || "Incident",
      entityType: "INCIDENT",
      riskLevel: item.incident.severity || "MEDIUM",
    };

    addNode(incidentNode, "INCIDENT");
    addLink(entity.id, item.incident.id, item.roleInIncident || "INCIDENT_LINK", null, timeRecord);
  });

  (entity.patrolEventVOILinks || []).forEach((item) => {
    const timeRecord = { ...item, ...(item.patrolEvent || {}) };
    if (!item.patrolEvent?.id || !isWithinIntelTimeFilter(timeRecord, timeFilter)) return;

    const patrolNode = {
      ...item.patrolEvent,
      displayName: item.patrolEvent.type || "Patrol Observation",
      entityType: "PATROL_EVENT",
      riskLevel: "LOW",
    };

    addNode(patrolNode, "PATROL_EVENT");
    addLink(entity.id, item.patrolEvent.id, item.observationType || "PATROL_OBSERVATION", null, timeRecord);
  });

  return {
    nodes: Array.from(nodesById.values()),
    links,
  };
}
