export function filterPatrolReports(patrolReports, reportFilters) {
  return patrolReports.filter((patrol) => {
    const startDate = patrol.startTime ? new Date(patrol.startTime) : null;

    if (reportFilters.from) {
      if (!startDate) return false;
      if (startDate < new Date(reportFilters.from)) return false;
    }

    if (reportFilters.to) {
      if (!startDate) return false;
      const toDate = new Date(reportFilters.to);
      toDate.setHours(23, 59, 59, 999);
      if (startDate > toDate) return false;
    }

    if (reportFilters.month) {
      if (!startDate) return false;
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey !== reportFilters.month) return false;
    }

    if (reportFilters.sector !== "ALL" && patrol.sector !== reportFilters.sector) {
      return false;
    }

    if (reportFilters.vehicleId !== "ALL" && patrol.vehicleId !== reportFilters.vehicleId) {
      return false;
    }

    if (reportFilters.patrollerId !== "ALL" && patrol.userId !== reportFilters.patrollerId) {
      return false;
    }

    if (reportFilters.status !== "ALL" && patrol.status !== reportFilters.status) {
      return false;
    }

    if (reportFilters.callSign) {
      const callSign = String(patrol.callSign || "").toLowerCase();
      if (!callSign.includes(String(reportFilters.callSign).toLowerCase())) return false;
    }

    return true;
  });
}

export function getPatrollerFilterOptions(patrolReports) {
  const usersById = new Map();

  patrolReports.forEach((report) => {
    if (report.user?.id) {
      usersById.set(report.user.id, report.user);
    }
  });

  return Array.from(usersById.values()).sort((a, b) => {
    const nameA = a.fullName || a.email || "";
    const nameB = b.fullName || b.email || "";
    return nameA.localeCompare(nameB);
  });
}

export function getReportTotalKm(patrolReports) {
  return patrolReports.reduce((sum, patrol) => sum + Number(patrol.totalKm || 0), 0);
}

export function getReportStatusCount(patrolReports, status) {
  return patrolReports.filter((patrol) => patrol.status === status).length;
}

function buildCodeParts(codeRef, subcodeRef) {
  const hasCode = Boolean(codeRef?.code);
  const hasSubcode = Boolean(subcodeRef?.subcode);
  const code = hasCode ? codeRef.code : "Unclassified";
  const codeName = hasCode ? codeRef.name || "" : "";
  const subcode = hasSubcode ? subcodeRef.subcode : "";
  const subcodeName = hasSubcode ? subcodeRef.name || "" : "";
  const codeLabel = hasCode
    ? [code, codeName].filter(Boolean).join(" - ")
    : "Unclassified";
  const subcodeLabel = hasSubcode
    ? [subcode, subcodeName].filter(Boolean).join(" - ")
    : "No Subcode";

  return {
    code,
    codeName,
    subcode,
    subcodeName,
    codeLabel,
    subcodeLabel,
    codeSubcodeLabel: hasSubcode ? `${codeLabel} / ${subcodeLabel}` : codeLabel,
    isClassified: hasCode,
  };
}

function getLinkedPatrolEvents(record) {
  return [
    ...(Array.isArray(record?.patrolEvents) ? record.patrolEvents : []),
    ...(Array.isArray(record?.linkedPatrol?.patrolEvents) ? record.linkedPatrol.patrolEvents : []),
  ];
}

export function resolveIncidentClassification(record) {
  const incident = record?.incident || record || {};
  const formalCodeRef = incident.incidentCodeRef || incident.incidentCode || null;
  const formalSubcodeRef = incident.incidentSubcodeRef || incident.incidentSubcode || null;

  if (formalCodeRef?.code) {
    return buildCodeParts(formalCodeRef, formalSubcodeRef);
  }

  const linkedEvent = getLinkedPatrolEvents(incident).find((event) =>
    event?.incidentCodeRef?.code || event?.incidentCode?.code
  );

  if (linkedEvent) {
    return buildCodeParts(
      linkedEvent.incidentCodeRef || linkedEvent.incidentCode,
      linkedEvent.incidentSubcodeRef || linkedEvent.incidentSubcode || null
    );
  }

  return buildCodeParts(null, null);
}
