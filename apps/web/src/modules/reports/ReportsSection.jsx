import React, { useMemo, useState } from "react";

function formatEventClassification(event) {
  return [
    event?.incidentCodeRef?.code || event?.incident?.incidentCodeRef?.code || event?.incidentCode,
    event?.incidentSubcodeRef?.subcode || event?.incident?.incidentSubcodeRef?.subcode,
  ].filter(Boolean).join(" / ");
}

function formatEventService(event) {
  if (event?.serviceTypeRef?.type) {
    return [event.serviceTypeRef.type, event.serviceTypeRef.category].filter(Boolean).join(" - ");
  }

  if (event?.infrastructureTypeRef?.type) {
    return [event.infrastructureTypeRef.type, event.infrastructureTypeRef.riskLevel].filter(Boolean).join(" - ");
  }

  return event?.assistance || "";
}

function formatEventLocation(event) {
  const street = [event?.streetNumber, event?.streetName].filter(Boolean).join(" ");
  const coordinates =
    event?.latitude !== null &&
    event?.latitude !== undefined &&
    event?.longitude !== null &&
    event?.longitude !== undefined
      ? `${event.latitude}, ${event.longitude}`
      : null;

  return [street, event?.suburb, event?.locationNotes, coordinates].filter(Boolean).join(" - ");
}

function getAssistancePatrolLabel(request) {
  return (
    request?.patrol?.callSign ||
    request?.patrol?.user?.fullName ||
    request?.patrol?.user?.email ||
    request?.patrol?.id ||
    "-"
  );
}

function getAssistanceVehicleLabel(request) {
  return (
    request?.patrol?.vehicle?.registration ||
    request?.patrol?.vehicleRegistration ||
    request?.vehicle?.registration ||
    "-"
  );
}

function getAssistanceLocationLabel(request) {
  const street = [request?.streetNumber, request?.streetName].filter(Boolean).join(" ");
  return [street, request?.suburb, request?.locationNotes].filter(Boolean).join(" - ") || "-";
}

function getAssistanceCrewLabel(request) {
  return (request?.patrol?.crew || []).map(getCrewName).join(", ") || "-";
}

function getAssistanceStatus(request) {
  return request?.resolvedAt || request?.status === "RESOLVED" || request?.sceneActive === false
    ? "RESOLVED"
    : "ACTIVE";
}

function getPatrolCallSign(patrol) {
  return patrol?.callSign || patrol?.patrolCallSign || patrol?.id || "-";
}

function getPatrolDriverLabel(patrol) {
  return patrol?.user?.fullName || patrol?.user?.email || "Unnamed";
}

function getRecordDate(record) {
  return record?.createdAt || record?.startTime || record?.requestedAt || record?.updatedAt || null;
}

function inDateRange(record, reportFilters) {
  const value = getRecordDate(record);
  const date = value ? new Date(value) : null;

  if (reportFilters.from) {
    if (!date) return false;
    if (date < new Date(reportFilters.from)) return false;
  }

  if (reportFilters.to) {
    if (!date) return false;
    const toDate = new Date(reportFilters.to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }

  return true;
}

function includesText(value, search) {
  if (!search) return true;
  return String(value || "").toLowerCase().includes(String(search).trim().toLowerCase());
}

function incidentCodeLabel(record) {
  return (
    record?.incidentCodeRef?.code ||
    record?.incidentCode ||
    record?.incident?.incidentCodeRef?.code ||
    record?.incident?.incidentCode ||
    "-"
  );
}

function incidentSubcodeLabel(record) {
  return (
    record?.incidentSubcodeRef?.subcode ||
    record?.incident?.incidentSubcodeRef?.subcode ||
    "-"
  );
}

function getIncidentCodeParts(record) {
  const codeRef = record?.incidentCodeRef || record?.incident?.incidentCodeRef || null;
  const subcodeRef = record?.incidentSubcodeRef || record?.incident?.incidentSubcodeRef || null;
  const code = codeRef?.code || record?.incidentCode || record?.incident?.incidentCode || "-";
  const codeName = codeRef?.name || record?.incidentType || record?.incident?.incidentType || "-";
  const subcode = subcodeRef?.subcode || "-";
  const subcodeName = subcodeRef?.name || "-";
  const codeLabel = [code, codeName].filter((value) => value && value !== "-").join(" - ") || "-";
  const codeSubcodeLabel =
    subcode && subcode !== "-"
      ? `${codeLabel} / ${subcode}${subcodeName && subcodeName !== "-" ? ` - ${subcodeName}` : ""}`
      : codeLabel;

  return {
    code,
    codeName,
    subcode,
    subcodeName,
    codeLabel,
    codeSubcodeLabel,
  };
}

function getInfrastructureRows(patrolReports) {
  return patrolReports.flatMap((patrol) =>
    (patrol.patrolEvents || [])
      .filter((event) => event.type === "INFRASTRUCTURE" || event.infrastructureTypeRef)
      .map((event) => ({ ...event, patrol }))
  );
}

function getVehicleReportRows(patrolReports) {
  return patrolReports.map((patrol) => ({
    id: patrol.id,
    vehicle: patrol.vehicle,
    patrol,
    registration: patrol.vehicle?.registration || patrol.vehicleLabel || patrol.tempVehicleRegistration || "-",
    driver: getPatrolDriverLabel(patrol),
    sector: patrol.sector || "-",
    status: patrol.status || "-",
    callSign: getPatrolCallSign(patrol),
    startTime: patrol.startTime,
    endTime: patrol.endTime,
    totalKm: patrol.totalKm,
  }));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(filename, columns, rows) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => csvEscape(column.value(row))).join(","))
    .join("\n");
  const blob = new Blob([[header, body].filter(Boolean).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getMonthKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKey(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "";
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function percentChange(current, previous) {
  if (!previous && !current) return "0%";
  if (!previous) return "+100%";
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function countBy(rows, getKey) {
  const counts = new Map();

  rows.forEach((row) => {
    const key = getKey(row) || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countByWithParts(rows, getParts, getKey) {
  const groups = new Map();

  rows.forEach((row) => {
    const parts = getParts(row);
    const key = getKey(parts, row);

    if (!groups.has(key)) {
      groups.set(key, { ...parts, label: key, count: 0 });
    }

    groups.get(key).count += 1;
  });

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function sumBy(rows, getValue) {
  return rows.reduce((sum, row) => sum + Number(getValue(row) || 0), 0);
}

function getPatrolHours(patrol) {
  if (!patrol?.startTime || !patrol?.endTime) return 0;
  const start = new Date(patrol.startTime);
  const end = new Date(patrol.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

function getCrewName(crew) {
  const memberName = [crew?.member?.firstName, crew?.member?.surname].filter(Boolean).join(" ");

  return (
    crew?.member?.callSign ||
    memberName ||
    crew?.user?.fullName ||
    crew?.user?.email ||
    crew?.member?.email ||
    "Crew member"
  );
}

function getCrewKey(crew) {
  return crew?.memberId || crew?.member?.id || crew?.userId || crew?.user?.id || getCrewName(crew);
}

function renderMiniBars(rows, valueKey = "count") {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));

  return (
    <div className="report-bars">
      {rows.slice(0, 8).map((row) => (
        <div className="report-bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="report-bar-track">
            <div
              className="report-bar-fill"
              style={{ width: `${(Number(row[valueKey] || 0) / max) * 100}%` }}
            />
          </div>
          <strong>{Number(row[valueKey] || 0).toFixed(valueKey === "count" ? 0 : 1)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ReportsSection({
  data,
  reportCategory = "Patrol Reports",
  reportFilters,
  onReportFiltersChange,
  onClearReportFilters,
  onRefreshReports,
  onRefreshOperationalData,
  sectorFilterOptions,
  statusFilterOptions,
  patrollerFilterOptions,
  filteredPatrolReports,
  reportTotalKm,
  completedReportCount,
  activeReportCount,
  selectedPatrolReport,
  editPatrolForm,
  onEditPatrolFormChange,
  patrolAuditLogs,
  onClosePatrolReport,
  onSavePatrolReportEdits,
  onViewPatrolReport,
  onEditPatrolReport,
  onLoadPatrolReportAudit,
  onCloseActivePatrol,
  getVehicleLabel,
  filteredIncidentReports = [],
  onViewIncidentReport,
  canPromoteToIntelligence = false,
  onPromoteIncidentToIntelligence,
  onPromotePatrolEventToIntelligence,
  showFilters = true,
  showSummaryCards = true,
  showSelectedPatrolReport = true,
  showReportTable = true,
}) {
  const assistanceRequests = data.assistanceRequests || [];
  const vehicles = data.vehicles || [];
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const refreshHandler =
    reportCategory === "Patrol Reports" ? onRefreshReports : onRefreshOperationalData || onRefreshReports;
  const incidentRows = useMemo(() => {
    return filteredIncidentReports.filter((incident) => {
      const search = [
        incident.incidentCode,
        incident.title,
        incident.description,
        incident.incidentType,
        incident.sector,
        incident.status,
        incident.severity,
        incident.street,
        incident.suburb,
      ].join(" ");

      if (!inDateRange(incident, reportFilters)) return false;
      if (!includesText(search, reportFilters.search)) return false;
      if (reportFilters.sector !== "ALL" && incident.sector !== reportFilters.sector) return false;
      if (reportFilters.status !== "ALL" && incident.status !== reportFilters.status) return false;
      if (reportFilters.severity !== "ALL" && incident.severity !== reportFilters.severity) return false;
      if (reportFilters.incidentCode !== "ALL" && incidentCodeLabel(incident) !== reportFilters.incidentCode) return false;
      if (reportFilters.incidentSubcode !== "ALL" && incidentSubcodeLabel(incident) !== reportFilters.incidentSubcode) return false;
      return true;
    });
  }, [filteredIncidentReports, reportFilters]);
  const assistanceRows = useMemo(() => {
    return assistanceRequests.filter((request) => {
      const patrol = request.patrol || {};
      const service = formatEventService(request) || request.assistance || "";
      const search = [
        service,
        getAssistancePatrolLabel(request),
        getAssistanceVehicleLabel(request),
        getAssistanceLocationLabel(request),
        request.description,
        request.referenceNumber,
      ].join(" ");

      if (!inDateRange(request, reportFilters)) return false;
      if (!includesText(search, reportFilters.search)) return false;
      if (reportFilters.sector !== "ALL" && (patrol.sector || request.sector) !== reportFilters.sector) return false;
      if (reportFilters.callSign && !includesText(patrol.callSign, reportFilters.callSign)) return false;
      if (reportFilters.serviceType !== "ALL" && service !== reportFilters.serviceType) return false;
      if (reportFilters.referenceNumber && !includesText(request.referenceNumber, reportFilters.referenceNumber)) return false;
      if (reportFilters.status !== "ALL") {
        if (getAssistanceStatus(request) !== reportFilters.status) return false;
      }
      return true;
    });
  }, [assistanceRequests, reportFilters]);
  const infrastructureRows = useMemo(() => {
    return getInfrastructureRows(filteredPatrolReports).filter((event) => {
      const search = [
        event.infrastructureTypeRef?.type,
        event.infrastructureTypeRef?.riskLevel,
        event.description,
        formatEventLocation(event),
        event.patrol?.sector,
        getPatrolCallSign(event.patrol),
      ].join(" ");

      if (!inDateRange(event, reportFilters)) return false;
      if (!includesText(search, reportFilters.search)) return false;
      if (reportFilters.sector !== "ALL" && event.patrol?.sector !== reportFilters.sector) return false;
      if (reportFilters.infrastructureType !== "ALL" && event.infrastructureTypeRef?.type !== reportFilters.infrastructureType) return false;
      if (reportFilters.riskLevel !== "ALL" && event.infrastructureTypeRef?.riskLevel !== reportFilters.riskLevel) return false;
      return true;
    });
  }, [filteredPatrolReports, reportFilters]);
  const vehicleRows = useMemo(() => {
    return getVehicleReportRows(filteredPatrolReports).filter((row) => {
      if (!inDateRange(row.patrol, reportFilters)) return false;
      if (reportFilters.vehicleId !== "ALL" && row.patrol.vehicleId !== reportFilters.vehicleId) return false;
      if (reportFilters.sector !== "ALL" && row.sector !== reportFilters.sector) return false;
      if (reportFilters.status !== "ALL" && row.status !== reportFilters.status) return false;
      if (reportFilters.patrollerId !== "ALL" && row.patrol.userId !== reportFilters.patrollerId) return false;
      if (!includesText([row.registration, row.driver, row.callSign].join(" "), reportFilters.search)) return false;
      return true;
    });
  }, [filteredPatrolReports, reportFilters]);

  const incidentCodeOptions = Array.from(new Set(filteredIncidentReports.map(incidentCodeLabel).filter((value) => value && value !== "-")));
  const incidentSubcodeOptions = Array.from(new Set(filteredIncidentReports.map(incidentSubcodeLabel).filter((value) => value && value !== "-")));
  const serviceTypeOptions = Array.from(new Set(assistanceRequests.map((request) => formatEventService(request) || request.assistance).filter(Boolean)));
  const infrastructureTypeOptions = Array.from(new Set(getInfrastructureRows(filteredPatrolReports).map((event) => event.infrastructureTypeRef?.type).filter(Boolean)));
  const riskLevelOptions = Array.from(new Set(getInfrastructureRows(filteredPatrolReports).map((event) => event.infrastructureTypeRef?.riskLevel).filter(Boolean)));
  const selectedMonth = reportFilters.month || getDefaultMonth();
  const previousMonth = getPreviousMonthKey(selectedMonth);
  const monthlyTrendData = useMemo(() => {
    const rows = filteredIncidentReports.filter((incident) => {
      if (reportFilters.sector !== "ALL" && incident.sector !== reportFilters.sector) return false;
      if (reportFilters.status !== "ALL" && incident.status !== reportFilters.status) return false;
      if (reportFilters.severity !== "ALL" && incident.severity !== reportFilters.severity) return false;
      if (reportFilters.incidentCode !== "ALL" && incidentCodeLabel(incident) !== reportFilters.incidentCode) return false;
      if (!includesText([
        incident.title,
        incident.description,
        incident.suburb,
        incident.street,
        incident.sector,
        incident.incidentType,
      ].join(" "), reportFilters.search)) return false;
      return true;
    });
    const currentRows = rows.filter((incident) => getMonthKey(getRecordDate(incident)) === selectedMonth);
    const previousRows = rows.filter((incident) => getMonthKey(getRecordDate(incident)) === previousMonth);
    const incidentsPerMonth = countBy(rows, (incident) => getMonthKey(getRecordDate(incident))).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    const incidentsByCode = countByWithParts(
      currentRows,
      getIncidentCodeParts,
      (parts) => parts.codeLabel
    );
    const incidentsByCodeAndSubcode = countByWithParts(
      currentRows,
      getIncidentCodeParts,
      (parts) => parts.codeSubcodeLabel
    );
    const previousByCodeSubcode = new Map(
      countByWithParts(previousRows, getIncidentCodeParts, (parts) => parts.codeSubcodeLabel).map((row) => [
        row.label,
        row.count,
      ])
    );
    const currentByCodeSubcode = new Map(
      incidentsByCodeAndSubcode.map((row) => [row.label, row])
    );

    previousByCodeSubcode.forEach((count, label) => {
      if (!currentByCodeSubcode.has(label)) {
        const previousIncident = previousRows.find(
          (incident) => getIncidentCodeParts(incident).codeSubcodeLabel === label
        );
        currentByCodeSubcode.set(label, {
          ...getIncidentCodeParts(previousIncident || {}),
          label,
          count: 0,
        });
      }
    });

    const trendRows = Array.from(currentByCodeSubcode.values())
      .map((row) => {
        const previousCount = previousByCodeSubcode.get(row.label) || 0;
        const matchingRows = currentRows.filter(
          (incident) => getIncidentCodeParts(incident).codeSubcodeLabel === row.label
        );
        const topSuburb = countBy(matchingRows, (incident) => incident.suburb)[0]?.label || "-";
        const changeValue = previousCount ? ((row.count - previousCount) / previousCount) * 100 : row.count ? 100 : 0;

        return {
          ...row,
          thisMonth: row.count,
          previousMonth: previousCount,
          change: percentChange(row.count, previousCount),
          changeValue,
          topSuburb,
        };
      })
      .sort((a, b) => b.thisMonth - a.thisMonth || a.label.localeCompare(b.label));
    const suburbRows = countBy(currentRows, (incident) => incident.suburb);
    const topSuburbs = suburbRows.slice(0, 8).map((row) => row.label);
    const codeSuburbMatrix = incidentsByCode.map((codeRow) => {
      const codeRows = currentRows.filter(
        (incident) => getIncidentCodeParts(incident).codeLabel === codeRow.label
      );
      const suburbCounts = new Map(countBy(codeRows, (incident) => incident.suburb).map((row) => [row.label, row.count]));

      return {
        ...codeRow,
        suburbCounts,
        total: codeRows.length,
      };
    });
    const codeTrendByMonth = rows.reduce((acc, incident) => {
      const month = getMonthKey(getRecordDate(incident));
      const parts = getIncidentCodeParts(incident);
      const key = `${month}|${parts.codeLabel}`;
      const existing = acc.get(key) || {
        month,
        code: parts.code,
        codeName: parts.codeName,
        label: parts.codeLabel,
        count: 0,
      };

      existing.count += 1;
      acc.set(key, existing);
      return acc;
    }, new Map());

    return {
      rows,
      currentRows,
      previousRows,
      incidentsPerMonth,
      incidentsByCode,
      incidentsByCodeAndSubcode,
      incidentsBySuburb: suburbRows,
      incidentsBySector: countBy(currentRows, (incident) => incident.sector),
      codeTrendByMonth: Array.from(codeTrendByMonth.values()).sort((a, b) =>
        a.month.localeCompare(b.month) || a.label.localeCompare(b.label)
      ),
      codeSuburbMatrix,
      topSuburbs,
      trendRows,
      topIncreasingCodes: trendRows.filter((row) => row.changeValue > 0).sort((a, b) => b.changeValue - a.changeValue).slice(0, 10),
      topDecreasingCodes: trendRows.filter((row) => row.changeValue < 0).sort((a, b) => a.changeValue - b.changeValue).slice(0, 10),
      bySector: countBy(currentRows, (incident) => incident.sector),
      topLocations: countBy(currentRows, (incident) =>
        [incident.street, incident.suburb].filter(Boolean).join(", ")
      ),
    };
  }, [filteredIncidentReports, reportFilters, selectedMonth, previousMonth]);
  const patrollerActivityRows = useMemo(() => {
    const byPatroller = new Map();

    function ensurePatroller(key, defaults = {}) {
      if (!byPatroller.has(key)) {
        byPatroller.set(key, {
          id: key,
          name: defaults.name || "Unknown",
          callSign: defaults.callSign || "-",
          patrolCount: 0,
          totalHours: 0,
          totalKm: 0,
          driverCount: 0,
          crewCount: 0,
          incidentResponses: 0,
          assistanceRequests: 0,
          infrastructureReports: 0,
          observations: 0,
          events: 0,
        });
      }

      return byPatroller.get(key);
    }

    filteredPatrolReports.forEach((patrol) => {
      if (!inDateRange(patrol, reportFilters)) return;
      if (reportFilters.sector !== "ALL" && patrol.sector !== reportFilters.sector) return;
      if (reportFilters.status !== "ALL" && patrol.status !== reportFilters.status) return;
      if (reportFilters.vehicleId !== "ALL" && patrol.vehicleId !== reportFilters.vehicleId) return;
      if (reportFilters.callSign && !includesText(getPatrolCallSign(patrol), reportFilters.callSign)) return;

      const driver = ensurePatroller(patrol.user?.id || patrol.userId || getPatrolDriverLabel(patrol), {
        name: getPatrolDriverLabel(patrol),
        callSign: patrol.user?.callSign || patrol.callSign || "-",
      });
      driver.patrolCount += 1;
      driver.driverCount += 1;
      driver.totalHours += getPatrolHours(patrol);
      driver.totalKm += Number(patrol.totalKm || 0);

      (patrol.crew || []).forEach((crew) => {
        const member = ensurePatroller(getCrewKey(crew), {
          name: getCrewName(crew),
          callSign: crew.member?.callSign || "-",
        });
        member.patrolCount += 1;
        member.crewCount += 1;
        member.totalHours += getPatrolHours(patrol);
      });

      (patrol.patrolEvents || []).forEach((event) => {
        const eventPatroller = event.createdBy?.id
          ? ensurePatroller(event.createdBy.id, {
              name: event.createdBy.fullName || event.createdBy.email,
              callSign: event.createdBy.callSign || "-",
            })
          : driver;
        eventPatroller.events += 1;
        if (event.incidentCodeId || event.incidentCode || event.incidentCodeRef) eventPatroller.incidentResponses += 1;
        if (event.assistance) eventPatroller.assistanceRequests += 1;
        if (event.type === "INFRASTRUCTURE" || event.infrastructureTypeRef) eventPatroller.infrastructureReports += 1;
        if (event.type === "OBSERVATION" || event.observationType) eventPatroller.observations += 1;
      });
    });

    return Array.from(byPatroller.values())
      .filter((row) => reportFilters.patrollerId === "ALL" || row.id === reportFilters.patrollerId)
      .filter((row) => includesText([row.name, row.callSign].join(" "), reportFilters.search))
      .sort((a, b) => b.totalHours - a.totalHours || b.patrolCount - a.patrolCount);
  }, [filteredPatrolReports, reportFilters]);
  const vehicleUsageRows = useMemo(() => {
    const byVehicle = new Map();

    vehicleRows.forEach((row) => {
      const key = row.patrol.vehicleId || row.registration;
      if (!byVehicle.has(key)) {
        byVehicle.set(key, {
          id: key,
          registration: row.registration,
          patrolCount: 0,
          totalKm: 0,
          drivers: new Set(),
          sessions: [],
          incidentsAttended: 0,
          assistanceRequests: 0,
          infrastructureReports: 0,
        });
      }

      const item = byVehicle.get(key);
      item.patrolCount += 1;
      item.totalKm += Number(row.totalKm || 0);
      item.drivers.add(row.driver);
      item.sessions.push(row);
      item.incidentsAttended += (row.patrol.patrolEvents || []).filter((event) =>
        event.incidentCodeId || event.incidentCode || event.incidentCodeRef
      ).length;
      item.assistanceRequests += (row.patrol.patrolEvents || []).filter((event) => event.assistance).length;
      item.infrastructureReports += (row.patrol.patrolEvents || []).filter((event) =>
        event.type === "INFRASTRUCTURE" || event.infrastructureTypeRef
      ).length;
    });

    return Array.from(byVehicle.values()).map((row) => ({
      ...row,
      driversText: Array.from(row.drivers).filter(Boolean).join(", ") || "-",
    }));
  }, [vehicleRows]);

  function renderReportDetail() {
    if (!selectedReportDetail) return null;

    return (
      <div className="incident-details">
        <div className="details-header">
          <h3>{selectedReportDetail.title}</h3>
          <button className="secondary-btn" onClick={() => setSelectedReportDetail(null)}>
            Close
          </button>
        </div>
        {selectedReportDetail.rows.map(([label, value]) => (
          <p key={label}>
            <strong>{label}:</strong> {value || "-"}
          </p>
        ))}
      </div>
    );
  }

  function renderCommonFilters(extraFilters = null) {
    return (
      <div className="action-row">
        <input
          placeholder="Search"
          value={reportFilters.search || ""}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, search: e.target.value })}
        />
        <input
          type="date"
          value={reportFilters.from}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, from: e.target.value })}
        />
        <input
          type="date"
          value={reportFilters.to}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, to: e.target.value })}
        />
        <select
          value={reportFilters.sector}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, sector: e.target.value })}
        >
          {sectorFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {extraFilters}
        <button onClick={onClearReportFilters}>Clear</button>
      </div>
    );
  }

  if (reportCategory === "Monthly Community Safety Trends") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Monthly Community Safety Trends</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Month-to-month incident trends by Incident Code, Incident Subcode, suburb, sector, and repeat locations.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, month: e.target.value })}
              />
              <select
                value={reportFilters.status}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select
                value={reportFilters.incidentCode}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, incidentCode: e.target.value })}
              >
                <option value="ALL">All Codes</option>
                {incidentCodeOptions.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  exportCsv("monthly-community-safety-trends.csv", [
                    { label: "ID", value: (row) => row.id },
                    { label: "Month", value: (row) => getMonthKey(getRecordDate(row)) },
                    { label: "Incident Code", value: (row) => getIncidentCodeParts(row).code },
                    { label: "Incident Name", value: (row) => getIncidentCodeParts(row).codeName },
                    { label: "Subcode", value: (row) => getIncidentCodeParts(row).subcode },
                    { label: "Subcode Name", value: (row) => getIncidentCodeParts(row).subcodeName },
                    { label: "Title", value: (row) => row.title },
                    { label: "Sector", value: (row) => row.sector },
                    { label: "Suburb", value: (row) => row.suburb },
                    { label: "Street / Location", value: (row) => [row.street, row.suburb].filter(Boolean).join(", ") },
                    { label: "Status", value: (row) => row.status },
                    { label: "Severity", value: (row) => row.severity },
                    { label: "Created", value: (row) => formatDateTime(row.createdAt) },
                  ], monthlyTrendData.currentRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        <div className="cards">
          <div className="card">
            <div className="card-title">Selected Month</div>
            <div className="card-value">{monthlyTrendData.currentRows.length}</div>
            <div className="card-detail">{selectedMonth}</div>
          </div>
          <div className="card">
            <div className="card-title">Previous Month</div>
            <div className="card-value">{monthlyTrendData.previousRows.length}</div>
            <div className="card-detail">{previousMonth || "No comparison"}</div>
          </div>
          <div className="card">
            <div className="card-title">Change</div>
            <div className="card-value">
              {percentChange(monthlyTrendData.currentRows.length, monthlyTrendData.previousRows.length)}
            </div>
            <div className="card-detail">Selected vs previous month</div>
          </div>
          <div className="card">
            <div className="card-title">Hotspots</div>
            <div className="card-value">{monthlyTrendData.topLocations.length}</div>
            <div className="card-detail">Locations in selected month</div>
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h3>Incidents Per Month</h3>
            {renderMiniBars(monthlyTrendData.incidentsPerMonth)}
          </div>
          <div className="panel">
            <h3>Incidents By Incident Code</h3>
            {renderMiniBars(monthlyTrendData.incidentsByCode)}
          </div>
          <div className="panel">
            <h3>Incidents By Code + Subcode</h3>
            {renderMiniBars(monthlyTrendData.incidentsByCodeAndSubcode)}
          </div>
          <div className="panel">
            <h3>Incidents By Suburb</h3>
            {renderMiniBars(monthlyTrendData.incidentsBySuburb)}
          </div>
          <div className="panel">
            <h3>Incidents By Sector</h3>
            {renderMiniBars(monthlyTrendData.incidentsBySector)}
          </div>
        </div>

        <div className="panel">
          <h3>Incident Code Month Comparison</h3>
          {monthlyTrendData.trendRows.length === 0 ? (
            <p>No incident code trends for the selected month.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Incident Code</th>
                  <th>Incident Name</th>
                  <th>Subcode</th>
                  <th>Subcode Name</th>
                  <th>This Month</th>
                  <th>Previous Month</th>
                  <th>Change</th>
                  <th>Top Suburb</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrendData.trendRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.code}</td>
                    <td>{row.codeName}</td>
                    <td>{row.subcode}</td>
                    <td>{row.subcodeName}</td>
                    <td>{row.thisMonth}</td>
                    <td>{row.previousMonth}</td>
                    <td>{row.change}</td>
                    <td>{row.topSuburb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid">
          <div className="panel">
            <h3>Top 10 Increasing Incident Codes</h3>
            {monthlyTrendData.topIncreasingCodes.length === 0 ? (
              <p>No increasing incident codes for the selected month.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Incident Code</th>
                    <th>This Month</th>
                    <th>Previous Month</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrendData.topIncreasingCodes.map((row) => (
                    <tr key={row.label}>
                      <td>{row.codeSubcodeLabel}</td>
                      <td>{row.thisMonth}</td>
                      <td>{row.previousMonth}</td>
                      <td>{row.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="panel">
            <h3>Top 10 Decreasing Incident Codes</h3>
            {monthlyTrendData.topDecreasingCodes.length === 0 ? (
              <p>No decreasing incident codes for the selected month.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Incident Code</th>
                    <th>This Month</th>
                    <th>Previous Month</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrendData.topDecreasingCodes.map((row) => (
                    <tr key={row.label}>
                      <td>{row.codeSubcodeLabel}</td>
                      <td>{row.thisMonth}</td>
                      <td>{row.previousMonth}</td>
                      <td>{row.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Incident Code By Suburb Matrix</h3>
          {monthlyTrendData.codeSuburbMatrix.length === 0 ? (
            <p>No incident code by suburb data for the selected month.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Incident Code</th>
                  <th>Total</th>
                  {monthlyTrendData.topSuburbs.map((suburb) => (
                    <th key={suburb}>{suburb}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyTrendData.codeSuburbMatrix.map((row) => (
                  <tr key={row.label}>
                    <td>{row.codeLabel}</td>
                    <td>{row.total}</td>
                    {monthlyTrendData.topSuburbs.map((suburb) => (
                      <td key={`${row.label}-${suburb}`}>{row.suburbCounts.get(suburb) || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h3>Top Repeat Locations</h3>
          {monthlyTrendData.topLocations.length === 0 ? (
            <p>No incidents for the selected month.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrendData.topLocations.slice(0, 10).map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (reportCategory === "Patroller Activity") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Patroller Activity</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Patroller contribution summary across driver sessions, crew participation, distance, and patrol events.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <select
                value={reportFilters.patrollerId}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, patrollerId: e.target.value })}
              >
                <option value="ALL">All Patrollers</option>
                {patrollerFilterOptions.map((patroller) => (
                  <option key={patroller.id} value={patroller.id}>
                    {patroller.fullName || patroller.email || "Unnamed"}
                  </option>
                ))}
              </select>
              <select
                value={reportFilters.vehicleId}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, vehicleId: e.target.value })}
              >
                <option value="ALL">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration || getVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
              <input
                placeholder="Patrol call sign"
                value={reportFilters.callSign || ""}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, callSign: e.target.value })}
              />
              <button
                type="button"
                onClick={() =>
                  exportCsv("patroller-activity.csv", [
                    { label: "Patroller", value: (row) => row.name },
                    { label: "Call Sign", value: (row) => row.callSign },
                    { label: "Patrol Count", value: (row) => row.patrolCount },
                    { label: "Total Hours", value: (row) => row.totalHours.toFixed(2) },
                    { label: "Total KM", value: (row) => row.totalKm },
                    { label: "Driver Count", value: (row) => row.driverCount },
                    { label: "Crew Count", value: (row) => row.crewCount },
                    { label: "Incident Responses", value: (row) => row.incidentResponses },
                    { label: "Assistance Requests", value: (row) => row.assistanceRequests },
                    { label: "Infrastructure Reports", value: (row) => row.infrastructureReports },
                    { label: "Observations", value: (row) => row.observations },
                  ], patrollerActivityRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        <div className="cards">
          <div className="card">
            <div className="card-title">Patrollers</div>
            <div className="card-value">{patrollerActivityRows.length}</div>
            <div className="card-detail">Matching filters</div>
          </div>
          <div className="card">
            <div className="card-title">Total Hours</div>
            <div className="card-value">{sumBy(patrollerActivityRows, (row) => row.totalHours).toFixed(1)}</div>
            <div className="card-detail">Closed patrol sessions</div>
          </div>
          <div className="card">
            <div className="card-title">Total KM</div>
            <div className="card-value">{sumBy(patrollerActivityRows, (row) => row.totalKm)}</div>
            <div className="card-detail">Driver distance</div>
          </div>
          <div className="card">
            <div className="card-title">Events</div>
            <div className="card-value">{sumBy(patrollerActivityRows, (row) => row.events)}</div>
            <div className="card-detail">Captured patrol events</div>
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h3>Hours By Patroller</h3>
            {renderMiniBars(patrollerActivityRows.map((row) => ({ label: row.name, value: row.totalHours })), "value")}
          </div>
          <div className="panel">
            <h3>KM By Patroller</h3>
            {renderMiniBars(patrollerActivityRows.map((row) => ({ label: row.name, value: row.totalKm })), "value")}
          </div>
        </div>

        {patrollerActivityRows.length === 0 ? (
          <p>No patroller activity matches these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patroller</th>
                <th>Call Sign</th>
                <th>Patrols</th>
                <th>Hours</th>
                <th>KM</th>
                <th>Driver</th>
                <th>Crew</th>
                <th>Incident</th>
                <th>Assistance</th>
                <th>Infrastructure</th>
                <th>Observations</th>
              </tr>
            </thead>
            <tbody>
              {patrollerActivityRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.callSign}</td>
                  <td>{row.patrolCount}</td>
                  <td>{row.totalHours.toFixed(1)}</td>
                  <td>{row.totalKm}</td>
                  <td>{row.driverCount}</td>
                  <td>{row.crewCount}</td>
                  <td>{row.incidentResponses}</td>
                  <td>{row.assistanceRequests}</td>
                  <td>{row.infrastructureReports}</td>
                  <td>{row.observations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (reportCategory === "Incident Reports") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Incident Reports</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Historical incident records for review, follow-up, and accountability.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <select
                value={reportFilters.status}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select
                value={reportFilters.severity}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, severity: e.target.value })}
              >
                <option value="ALL">All Severity</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <select
                value={reportFilters.incidentCode}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, incidentCode: e.target.value })}
              >
                <option value="ALL">All Codes</option>
                {incidentCodeOptions.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <select
                value={reportFilters.incidentSubcode}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, incidentSubcode: e.target.value })}
              >
                <option value="ALL">All Subcodes</option>
                {incidentSubcodeOptions.map((subcode) => (
                  <option key={subcode} value={subcode}>{subcode}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  exportCsv("incident-reports.csv", [
                    { label: "ID", value: (row) => row.id },
                    { label: "Code", value: incidentCodeLabel },
                    { label: "Subcode", value: incidentSubcodeLabel },
                    { label: "Title", value: (row) => row.title },
                    { label: "Sector", value: (row) => row.sector },
                    { label: "Status", value: (row) => row.status },
                    { label: "Severity", value: (row) => row.severity },
                    { label: "Address", value: (row) => [row.street, row.suburb].filter(Boolean).join(", ") },
                    { label: "Created", value: (row) => formatDateTime(row.createdAt) },
                  ], incidentRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        {renderReportDetail()}

        <div className="cards">
          <div className="card">
            <div className="card-title">Incident Reports</div>
            <div className="card-value">{incidentRows.length}</div>
            <div className="card-detail">Operational incident and response history</div>
          </div>
        </div>

        {incidentRows.length === 0 ? (
          <p>No incident reports available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Type</th>
                <th>Sector</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidentRows.map((incident) => (
                <tr key={incident.id}>
                  <td>{incidentCodeLabel(incident)}</td>
                  <td>{incident.title || "-"}</td>
                  <td>{incident.incidentType || "-"}</td>
                  <td>{incident.sector || "-"}</td>
                  <td>{incident.status || "-"}</td>
                  <td>{incident.severity || "-"}</td>
                  <td>{[incident.street, incident.suburb].filter(Boolean).join(", ") || "-"}</td>
                  <td>
                    <button onClick={() => onViewIncidentReport ? onViewIncidentReport(incident) : setSelectedReportDetail({
                      title: "Incident Report",
                      rows: [
                        ["ID", incident.id],
                        ["Code", incidentCodeLabel(incident)],
                        ["Subcode", incidentSubcodeLabel(incident)],
                        ["Title", incident.title],
                        ["Description", incident.description],
                        ["Sector", incident.sector],
                        ["Status", incident.status],
                        ["Severity", incident.severity],
                        ["Address", [incident.street, incident.suburb].filter(Boolean).join(", ")],
                      ],
                    })}>View</button>
                    {canPromoteToIntelligence && onPromoteIncidentToIntelligence && (
                      <button
                        type="button"
                        onClick={() => onPromoteIncidentToIntelligence(incident)}
                      >
                        Promote to Intelligence
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (reportCategory === "Assistance Request Reports") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Assistance Request Reports</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Historical assistance requests submitted by patrol teams. Live coordination remains
          in Control Room.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <input
                placeholder="Patrol call sign"
                value={reportFilters.callSign || ""}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, callSign: e.target.value })}
              />
              <input
                placeholder="Reference number"
                value={reportFilters.referenceNumber || ""}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, referenceNumber: e.target.value })}
              />
              <select
                value={reportFilters.serviceType}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, serviceType: e.target.value })}
              >
                <option value="ALL">All Service Types</option>
                {serviceTypeOptions.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
              <select
                value={reportFilters.status}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  exportCsv("assistance-request-reports.csv", [
                    { label: "ID", value: (row) => row.id },
                    { label: "Service", value: (row) => formatEventService(row) || row.assistance },
                    { label: "Patrol", value: getAssistancePatrolLabel },
                    { label: "Crew", value: getAssistanceCrewLabel },
                    { label: "Vehicle", value: getAssistanceVehicleLabel },
                    { label: "Sector", value: (row) => row?.patrol?.sector || row?.sector },
                    { label: "Status", value: getAssistanceStatus },
                    { label: "Reference Number", value: (row) => row.referenceNumber },
                    { label: "Location", value: getAssistanceLocationLabel },
                    { label: "Description", value: (row) => row.description },
                    { label: "Requested", value: (row) => formatDateTime(row.createdAt) },
                  ], assistanceRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        {renderReportDetail()}

        <div className="cards">
          <div className="card">
            <div className="card-title">Assistance Request Reports</div>
            <div className="card-value">{assistanceRows.length}</div>
            <div className="card-detail">History sourced from Patrol assistance events</div>
          </div>
        </div>

        {assistanceRows.length === 0 ? (
          <p>No assistance request history available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Patrol</th>
                <th>Crew</th>
                <th>Vehicle</th>
                <th>Sector</th>
                <th>Status</th>
                <th>Location</th>
                <th>Description</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assistanceRows.map((request) => (
                <tr key={request.id}>
                  <td>{formatEventService(request) || "-"}</td>
                  <td>{getAssistancePatrolLabel(request)}</td>
                  <td>{getAssistanceCrewLabel(request)}</td>
                  <td>{getAssistanceVehicleLabel(request)}</td>
                  <td>{request?.patrol?.sector || request?.sector || "-"}</td>
                  <td>{getAssistanceStatus(request)}</td>
                  <td>{getAssistanceLocationLabel(request)}</td>
                  <td>{request.description || "-"}</td>
                  <td>{formatDateTime(request.createdAt)}</td>
                  <td>
                    <button onClick={() => setSelectedReportDetail({
                      title: "Assistance Request Report",
                      rows: [
                        ["ID", request.id],
                        ["Service", formatEventService(request) || request.assistance],
                        ["Patrol", getAssistancePatrolLabel(request)],
                        ["Crew", getAssistanceCrewLabel(request)],
                        ["Vehicle", getAssistanceVehicleLabel(request)],
                        ["Sector", request?.patrol?.sector || request?.sector],
                        ["Status", getAssistanceStatus(request)],
                        ["Reference Number", request.referenceNumber],
                        ["Resolved Time", request.resolvedAt ? formatDateTime(request.resolvedAt) : "Not captured"],
                        ["Location", getAssistanceLocationLabel(request)],
                        ["Description", request.description],
                        ["Requested", formatDateTime(request.createdAt)],
                      ],
                    })}>View</button>
                    {canPromoteToIntelligence && onPromotePatrolEventToIntelligence && (
                      <button
                        type="button"
                        onClick={() => onPromotePatrolEventToIntelligence(request)}
                      >
                        Promote to Intelligence
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (reportCategory === "Vehicle Usage") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Vehicle Usage</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Vehicle accountability view built from patrol session history.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <select
                value={reportFilters.vehicleId}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, vehicleId: e.target.value })}
              >
                <option value="ALL">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration || getVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
              <select
                value={reportFilters.patrollerId}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, patrollerId: e.target.value })}
              >
                <option value="ALL">All Drivers</option>
                {patrollerFilterOptions.map((patroller) => (
                  <option key={patroller.id} value={patroller.id}>
                    {patroller.fullName || patroller.email || "Unnamed"}
                  </option>
                ))}
              </select>
              <select
                value={reportFilters.status}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  exportCsv("vehicle-reports.csv", [
                    { label: "Registration", value: (row) => row.registration },
                    { label: "Patrol Count", value: (row) => row.patrolCount },
                    { label: "Total KM", value: (row) => row.totalKm },
                    { label: "Drivers", value: (row) => row.driversText },
                    { label: "Incidents Attended", value: (row) => row.incidentsAttended },
                    { label: "Assistance Requests", value: (row) => row.assistanceRequests },
                    { label: "Infrastructure Reports", value: (row) => row.infrastructureReports },
                    { label: "Patrol Sessions", value: (row) => row.sessions.map((session) => session.id).join("; ") },
                  ], vehicleUsageRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        {renderReportDetail()}

        <div className="cards">
          <div className="card">
            <div className="card-title">Vehicle Usage</div>
            <div className="card-value">{vehicleUsageRows.length}</div>
            <div className="card-detail">Vehicles with matching patrol activity</div>
          </div>
        </div>

        {vehicleUsageRows.length === 0 ? (
          <p>No vehicle activity matches these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Patrols</th>
                <th>Total KM</th>
                <th>Drivers</th>
                <th>Incidents</th>
                <th>Assistance</th>
                <th>Infrastructure</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicleUsageRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.registration}</td>
                  <td>{row.patrolCount}</td>
                  <td>{row.totalKm}</td>
                  <td>{row.driversText}</td>
                  <td>{row.incidentsAttended}</td>
                  <td>{row.assistanceRequests}</td>
                  <td>{row.infrastructureReports}</td>
                  <td>
                    <button onClick={() => setSelectedReportDetail({
                      title: "Vehicle Report",
                      rows: [
                        ["Registration", row.registration],
                        ["Patrol Count", row.patrolCount],
                        ["Total KM", row.totalKm],
                        ["Drivers", row.driversText],
                        ["Incidents Attended", row.incidentsAttended],
                        ["Assistance Requests", row.assistanceRequests],
                        ["Infrastructure Reports", row.infrastructureReports],
                        ["Patrol Sessions", row.sessions.map((session) => `${session.callSign} ${formatDateTime(session.startTime)}`).join("; ")],
                      ],
                    })}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (reportCategory === "Infrastructure Summary / Detail") {
    return (
      <div className="panel">
        <div className="details-header">
          <h2>Infrastructure Summary / Detail</h2>
          {refreshHandler && (
            <button className="secondary-btn" onClick={refreshHandler}>
              Refresh
            </button>
          )}
        </div>
        <p className="card-detail">
          Infrastructure event summary and detail history captured from patrol activity.
        </p>

        {showFilters &&
          renderCommonFilters(
            <>
              <select
                value={reportFilters.infrastructureType}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, infrastructureType: e.target.value })}
              >
                <option value="ALL">All Infrastructure Types</option>
                {infrastructureTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={reportFilters.riskLevel}
                onChange={(e) => onReportFiltersChange({ ...reportFilters, riskLevel: e.target.value })}
              >
                <option value="ALL">All Risk Levels</option>
                {riskLevelOptions.map((risk) => (
                  <option key={risk} value={risk}>{risk}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  exportCsv("infrastructure-reports.csv", [
                    { label: "ID", value: (row) => row.id },
                    { label: "Type", value: (row) => row.infrastructureTypeRef?.type },
                    { label: "Risk Level", value: (row) => row.infrastructureTypeRef?.riskLevel },
                    { label: "Patrol Call Sign", value: (row) => getPatrolCallSign(row.patrol) },
                    { label: "Sector", value: (row) => row.patrol?.sector },
                    { label: "Location", value: formatEventLocation },
                    { label: "Description", value: (row) => row.description },
                    { label: "Created", value: (row) => formatDateTime(row.createdAt) },
                  ], infrastructureRows)
                }
              >
                Export CSV
              </button>
            </>
          )}

        {renderReportDetail()}

        <div className="cards">
          <div className="card">
            <div className="card-title">Infrastructure Reports</div>
            <div className="card-value">{infrastructureRows.length}</div>
            <div className="card-detail">Matching infrastructure events</div>
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h3>By Type</h3>
            {renderMiniBars(countBy(infrastructureRows, (event) => event.infrastructureTypeRef?.type || event.infrastructureType))}
          </div>
          <div className="panel">
            <h3>By Sector</h3>
            {renderMiniBars(countBy(infrastructureRows, (event) => event.patrol?.sector))}
          </div>
          <div className="panel">
            <h3>By Suburb</h3>
            {renderMiniBars(countBy(infrastructureRows, (event) => event.suburb))}
          </div>
          <div className="panel">
            <h3>By Month</h3>
            {renderMiniBars(countBy(infrastructureRows, (event) => getMonthKey(event.createdAt)).sort((a, b) => a.label.localeCompare(b.label)))}
          </div>
        </div>

        {infrastructureRows.length === 0 ? (
          <p>No infrastructure reports match these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Risk</th>
                <th>Patrol</th>
                <th>Sector</th>
                <th>Location</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {infrastructureRows.map((event) => (
                <tr key={event.id}>
                  <td>{event.infrastructureTypeRef?.type || event.infrastructureType || "-"}</td>
                  <td>{event.infrastructureTypeRef?.riskLevel || "-"}</td>
                  <td>{getPatrolCallSign(event.patrol)}</td>
                  <td>{event.patrol?.sector || "-"}</td>
                  <td>{formatEventLocation(event) || "-"}</td>
                  <td>{event.description || "-"}</td>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>
                    <button onClick={() => setSelectedReportDetail({
                      title: "Infrastructure Report",
                      rows: [
                        ["ID", event.id],
                        ["Type", event.infrastructureTypeRef?.type || event.infrastructureType],
                        ["Risk Level", event.infrastructureTypeRef?.riskLevel],
                        ["Patrol", getPatrolCallSign(event.patrol)],
                        ["Sector", event.patrol?.sector],
                        ["Location", formatEventLocation(event)],
                        ["Description", event.description],
                        ["Created", formatDateTime(event.createdAt)],
                      ],
                    })}>View</button>
                    {canPromoteToIntelligence && onPromotePatrolEventToIntelligence && (
                      <button
                        type="button"
                        onClick={() => onPromotePatrolEventToIntelligence(event)}
                      >
                        Promote to Intelligence
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="details-header">
        <h2>Patrol Reports</h2>
        {refreshHandler && (
          <button className="secondary-btn" onClick={refreshHandler}>
            Refresh
          </button>
        )}
      </div>
      <p className="card-detail">
        Patrol session history for review, distance checks, audit, and close-out follow-up.
      </p>

      {showFilters && (
      <div className="action-row">
        <input
          placeholder="Patrol call sign"
          value={reportFilters.callSign || ""}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, callSign: e.target.value })}
        />

        <input
          type="date"
          value={reportFilters.from}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, from: e.target.value })}
        />

        <input
          type="date"
          value={reportFilters.to}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, to: e.target.value })}
        />

        <select
          value={reportFilters.sector}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, sector: e.target.value })}
        >
          {sectorFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={reportFilters.vehicleId}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, vehicleId: e.target.value })}
        >
          <option value="ALL">All Vehicles</option>
          {data.vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registration || getVehicleLabel(vehicle)}
            </option>
          ))}
        </select>

        <select
          value={reportFilters.patrollerId}
          onChange={(e) =>
            onReportFiltersChange({ ...reportFilters, patrollerId: e.target.value })
          }
        >
          <option value="ALL">All Patrollers</option>
          {patrollerFilterOptions.map((patroller) => (
            <option key={patroller.id} value={patroller.id}>
              {patroller.fullName || patroller.email || "Unnamed"}
            </option>
          ))}
        </select>

        <select
          value={reportFilters.status}
          onChange={(e) => onReportFiltersChange({ ...reportFilters, status: e.target.value })}
        >
          {statusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button onClick={onClearReportFilters}>Clear</button>
        <button
          type="button"
          onClick={() =>
            exportCsv("patrol-reports.csv", [
              { label: "ID", value: (row) => row.id },
              { label: "Patrol Call Sign", value: getPatrolCallSign },
              { label: "Driver", value: getPatrolDriverLabel },
              { label: "Vehicle", value: (row) => row.vehicle?.registration || getVehicleLabel(row.vehicle) },
              { label: "Sector", value: (row) => row.sector },
              { label: "Start KM", value: (row) => row.startKm },
              { label: "End KM", value: (row) => row.endKm },
              { label: "Total KM", value: (row) => row.totalKm },
              { label: "Status", value: (row) => row.status },
              { label: "Start Time", value: (row) => formatDateTime(row.startTime) },
              { label: "End Time", value: (row) => formatDateTime(row.endTime) },
            ], filteredPatrolReports)
          }
        >
          Export CSV
        </button>
      </div>
      )}

      {showSummaryCards && (
      <div className="cards">
        <div className="card">
          <div className="card-title">Reports</div>
          <div className="card-value">{filteredPatrolReports.length}</div>
          <div className="card-detail">Matching filters</div>
        </div>

        <div className="card">
          <div className="card-title">Total KM</div>
          <div className="card-value">{reportTotalKm}</div>
          <div className="card-detail">Completed distance captured</div>
        </div>

        <div className="card">
          <div className="card-title">Completed</div>
          <div className="card-value">{completedReportCount}</div>
          <div className="card-detail">Closed patrol sessions</div>
        </div>

        <div className="card">
          <div className="card-title">Active</div>
          <div className="card-value">{activeReportCount}</div>
          <div className="card-detail">Currently on patrol</div>
        </div>
      </div>
      )}

      {showSelectedPatrolReport && selectedPatrolReport && (
        <div className="incident-details">
          <div className="details-header">
            <h3>Patrol Detail</h3>
            <button className="secondary-btn" onClick={onClosePatrolReport}>
              Close
            </button>
          </div>

          <p>
            <strong>Patroller:</strong>{" "}
            {selectedPatrolReport.user?.fullName || selectedPatrolReport.user?.email || "Unnamed"}
          </p>
          <p>
            <strong>Vehicle:</strong>{" "}
            {selectedPatrolReport.vehicle?.registration ||
              getVehicleLabel(selectedPatrolReport.vehicle)}
          </p>
          <p>
            <strong>Sector:</strong> {selectedPatrolReport.sector || "No sector"}
          </p>
          <p>
            <strong>Status:</strong> {selectedPatrolReport.status || "-"}
          </p>
          {(selectedPatrolReport.editCount || selectedPatrolReport.edit_count) > 0 && (
            <p>
              <strong>Edited:</strong>{" "}
              {selectedPatrolReport.editCount || selectedPatrolReport.edit_count} change(s)
            </p>
          )}
          <p>
            <strong>KM:</strong> {selectedPatrolReport.startKm ?? "-"} →{" "}
            {selectedPatrolReport.endKm ?? "-"} = {selectedPatrolReport.totalKm ?? "-"}
          </p>
          <p>
            <strong>Summary:</strong> {selectedPatrolReport.summary || "No summary"}
          </p>

          {(selectedPatrolReport.patrolEvents || []).length > 0 && (
            <div className="panel">
              <h3>Patrol Timeline</h3>
              {(selectedPatrolReport.patrolEvents || []).map((event) => {
                const classification = formatEventClassification(event);
                const service = formatEventService(event);
                const location = formatEventLocation(event);

                return (
                  <div key={event.id} className="item">
                    <div>
                      <strong>{event.type || "Patrol event"}</strong>
                      {classification && <div>Code/Subcode: {classification}</div>}
                      {service && <div>Service / Type: {service}</div>}
                      {event.referenceNumber && <div>Reference number: {event.referenceNumber}</div>}
                      {location && <div>Location: {location}</div>}
                      <div>Description: {event.description || "-"}</div>
                      {event.createdBy && (
                        <div>Created by: {event.createdBy.fullName || event.createdBy.email || "-"}</div>
                      )}
                    </div>
                    <div className="action-row">
                      <span className="badge">
                        {event.createdAt ? new Date(event.createdAt).toLocaleString() : "-"}
                      </span>
                      {canPromoteToIntelligence && onPromotePatrolEventToIntelligence && (
                        <button
                          type="button"
                          onClick={() =>
                            onPromotePatrolEventToIntelligence({
                              ...event,
                              patrol: event.patrol || selectedPatrolReport,
                            })
                          }
                        >
                          Promote to Intelligence
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {editPatrolForm && (
            <div className="form">
              <label>
                Sector
                <select
                  value={editPatrolForm.sector}
                  onChange={(e) =>
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      sector: e.target.value,
                    })
                  }
                >
                  <option value="">No sector</option>
                  <option value="Sector 1">Sector 1</option>
                  <option value="Sector 2">Sector 2</option>
                  <option value="Sector 3">Sector 3</option>
                  <option value="Sector 4">Sector 4</option>
                </select>
              </label>

              <label>
                Start KM
                <input
                  type="number"
                  value={editPatrolForm.startKm}
                  onChange={(e) =>
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      startKm: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                End KM
                <input
                  type="number"
                  value={editPatrolForm.endKm}
                  onChange={(e) =>
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      endKm: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Summary
                <textarea
                  value={editPatrolForm.summary}
                  onChange={(e) =>
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      summary: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Edit Reason
                <textarea
                  value={editPatrolForm.editReason}
                  onChange={(e) =>
                    onEditPatrolFormChange({
                      ...editPatrolForm,
                      editReason: e.target.value,
                    })
                  }
                  placeholder="Required: explain why this report is being edited"
                  required
                />
              </label>

              <button onClick={() => onSavePatrolReportEdits(selectedPatrolReport.id)}>
                Save Changes
              </button>
            </div>
          )}

          {patrolAuditLogs.length > 0 && (
            <div className="panel">
              <h3>Audit History</h3>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Field</th>
                    <th>Old</th>
                    <th>New</th>
                    <th>Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {patrolAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {log.createdAt || log.created_at
                          ? new Date(log.createdAt || log.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        {log.editedBy?.fullName ||
                          log.editedBy?.email ||
                          log.editedByName ||
                          log.edited_by_name ||
                          log.editedById ||
                          log.edited_by ||
                          "-"}
                      </td>
                      <td>{log.editedByRole || log.edited_by_role || "-"}</td>
                      <td>{log.fieldName || log.field_name || "-"}</td>
                      <td>{String(log.oldValue ?? log.old_value ?? "")}</td>
                      <td>{String(log.newValue ?? log.new_value ?? "")}</td>
                      <td>{log.editReason || log.edit_reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showReportTable && (filteredPatrolReports.length === 0 ? (
        <p>No patrol reports match these filters.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Patroller</th>
              <th>Vehicle</th>
              <th>Sector</th>
              <th>Start KM</th>
              <th>End KM</th>
              <th>Total KM</th>
              <th>Status</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatrolReports.map((patrol) => (
              <tr key={patrol.id}>
                <td>{patrol.user?.fullName || patrol.user?.email || "Unnamed"}</td>
                <td>{patrol.vehicle?.registration || getVehicleLabel(patrol.vehicle)}</td>
                <td>{patrol.sector || "No sector"}</td>
                <td>{patrol.startKm ?? "-"}</td>
                <td>{patrol.endKm ?? "-"}</td>
                <td>{patrol.totalKm ?? "-"}</td>
                <td>
                  {patrol.status || "-"}
                  {(patrol.editCount || patrol.edit_count) > 0 && (
                    <div className="card-detail">
                      Edited · {patrol.editCount || patrol.edit_count}
                    </div>
                  )}
                </td>
                <td>{patrol.startTime ? new Date(patrol.startTime).toLocaleString() : "-"}</td>
                <td>{patrol.endTime ? new Date(patrol.endTime).toLocaleString() : "-"}</td>
                <td>
                  <button onClick={() => onViewPatrolReport(patrol)}>View</button>
                  <button onClick={() => onEditPatrolReport(patrol)}>Edit</button>
                  <button onClick={() => onLoadPatrolReportAudit(patrol)}>Audit</button>
                  {patrol.status === "ACTIVE" && (
                    <button onClick={() => onCloseActivePatrol(patrol)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
