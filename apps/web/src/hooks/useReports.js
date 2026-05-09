import { useEffect, useMemo, useState } from "react";
import { PATROL_ENDPOINTS } from "../core/endpoints";
import {
  DEFAULT_REPORT_FILTERS,
} from "../modules/reports/report.constants";
import {
  filterPatrolReports,
  getPatrollerFilterOptions,
  getReportStatusCount,
  getReportTotalKm,
} from "../modules/reports/report.utils";

export function useReports({
  token,
  active,
  canViewReports,
  data,
  getAuthHeaders,
  getJsonAuthHeaders,
  loadDashboard,
}) {
  const [patrolReports, setPatrolReports] = useState([]);
  const [reportFilters, setReportFilters] = useState({ ...DEFAULT_REPORT_FILTERS });
  const [selectedPatrolReport, setSelectedPatrolReport] = useState(null);
  const [editPatrolForm, setEditPatrolForm] = useState(null);
  const [patrolAuditLogs, setPatrolAuditLogs] = useState([]);

  const filteredPatrolReports = useMemo(
    () => filterPatrolReports(patrolReports, reportFilters),
    [patrolReports, reportFilters]
  );

  const patrollerFilterOptions = useMemo(
    () => getPatrollerFilterOptions(patrolReports),
    [patrolReports]
  );
  const reportTotalKm = getReportTotalKm(filteredPatrolReports);
  const completedReportCount = getReportStatusCount(filteredPatrolReports, "COMPLETED");
  const activeReportCount = getReportStatusCount(filteredPatrolReports, "ACTIVE");

  async function loadPatrolReports() {
    if (!token || !canViewReports) return;

    try {
      const params = new URLSearchParams();

      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value && value !== "ALL") {
          params.set(key, value);
        }
      });

      const query = params.toString();
      const url = PATROL_ENDPOINTS.reports(query);

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get("content-type") || "";
      const json = contentType.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        alert(json?.error || "Failed to load patrol reports");
        return;
      }

      setPatrolReports(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
      alert("Failed to load patrol reports");
    }
  }

  function clearReportFilters() {
    setReportFilters({ ...DEFAULT_REPORT_FILTERS });
  }

  function viewPatrolReport(patrol) {
    setSelectedPatrolReport(patrol);
    setEditPatrolForm(null);
    setPatrolAuditLogs([]);
  }

  function editPatrolReport(patrol) {
    setSelectedPatrolReport(patrol);
    setPatrolAuditLogs([]);
    setEditPatrolForm({
      sector: patrol.sector || "",
      startKm: patrol.startKm ?? "",
      endKm: patrol.endKm ?? "",
      summary: patrol.summary || "",
      editReason: "",
    });
  }

  function closePatrolReport() {
    setSelectedPatrolReport(null);
    setEditPatrolForm(null);
    setPatrolAuditLogs([]);
  }

  async function savePatrolReportEdits(patrolId) {
    if (!editPatrolForm) return;

    if (!editPatrolForm.editReason || editPatrolForm.editReason.trim().length < 5) {
      alert("Edit reason is required, minimum 5 characters.");
      return;
    }

    const startKm =
      editPatrolForm.startKm === "" ? null : Number(editPatrolForm.startKm);
    const endKm = editPatrolForm.endKm === "" ? null : Number(editPatrolForm.endKm);

    if (startKm !== null && Number.isNaN(startKm)) {
      alert("Start KM must be a valid number.");
      return;
    }

    if (endKm !== null && Number.isNaN(endKm)) {
      alert("End KM must be a valid number.");
      return;
    }

    if (startKm !== null && endKm !== null && endKm < startKm) {
      alert("End KM cannot be less than Start KM.");
      return;
    }

    try {
      const res = await fetch(PATROL_ENDPOINTS.adminUpdate(patrolId), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          updates: {
            sector: editPatrolForm.sector,
            startKm,
            endKm,
            summary: editPatrolForm.summary,
          },
          editReason: editPatrolForm.editReason.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to update patrol report");
        return;
      }

      const updatedPatrol = json.patrol || json.report || json;

      await loadPatrolReports();
      setSelectedPatrolReport(updatedPatrol);
      setEditPatrolForm(null);
      setPatrolAuditLogs([]);
      alert("Report updated and audit log saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to update patrol report");
    }
  }

  async function loadPatrolReportAudit(patrol) {
    if (!patrol?.id) return;

    setSelectedPatrolReport(patrol);
    setEditPatrolForm(null);

    try {
      const res = await fetch(PATROL_ENDPOINTS.audit(patrol.id), {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to load audit history");
        return;
      }

      setPatrolAuditLogs(Array.isArray(json) ? json : json.auditLogs || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load audit history");
    }
  }

  async function closeActivePatrol(patrol) {
    if (!patrol || patrol.status !== "ACTIVE") return;

    const endKm = prompt("Enter end KM:", patrol.startKm ?? "");

    if (endKm === null) return;

    try {
      const res = await fetch(PATROL_ENDPOINTS.end(patrol.id), {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          endKm: Number(endKm),
          summary: patrol.summary || "Closed by admin/control room",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to close patrol");
        return;
      }

      await loadPatrolReports();
      await loadDashboard();
      setSelectedPatrolReport(json);
      setEditPatrolForm(null);
    } catch (err) {
      console.error(err);
      alert("Failed to close patrol");
    }
  }

  useEffect(() => {
    if (active === "Reports" && canViewReports) {
      loadPatrolReports();
    }
  }, [
    active,
    canViewReports,
    reportFilters.from,
    reportFilters.to,
    reportFilters.sector,
    reportFilters.vehicleId,
    reportFilters.patrollerId,
    reportFilters.status,
  ]);

  return {
    patrolReports,
    setPatrolReports,
    reportFilters,
    setReportFilters,
    selectedPatrolReport,
    setSelectedPatrolReport,
    editPatrolForm,
    setEditPatrolForm,
    patrolAuditLogs,
    setPatrolAuditLogs,
    filteredPatrolReports,
    patrollerFilterOptions,
    reportTotalKm,
    completedReportCount,
    activeReportCount,
    loadPatrolReports,
    clearReportFilters,
    viewPatrolReport,
    editPatrolReport,
    closePatrolReport,
    savePatrolReportEdits,
    loadPatrolReportAudit,
    closeActivePatrol,
  };
}
