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
