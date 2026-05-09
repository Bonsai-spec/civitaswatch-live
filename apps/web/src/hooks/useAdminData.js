import { useEffect, useState } from "react";
import { DASHBOARD_ENDPOINTS, MEMBER_ENDPOINTS } from "../core/endpoints";
import { getAuthHeaders as buildAuthHeaders } from "../core/http.utils";
import { buildLocalWorkload } from "../modules/patrols/patrol.utils";

const EMPTY_ADMIN_DATA = {
  incidents: [],
  patrols: [],
  vehicles: [],
  organisations: [],
  members: [],
};

export function useAdminData({
  token,
  user,
  filter,
  isPatrol,
  canViewPatrols,
  selectedIncident,
  setSelectedIncident,
  onUnauthorized,
}) {
  const [data, setData] = useState(EMPTY_ADMIN_DATA);
  const [workload, setWorkload] = useState([]);

  function resetAdminData() {
    setWorkload([]);
    setData({
      incidents: [],
      patrols: [],
      vehicles: [],
      organisations: [],
      members: [],
    });
  }

  function getAuthHeaders(customToken = token) {
    return buildAuthHeaders(customToken);
  }

  async function loadDashboard() {
    if (!token) return;

    try {
      const dashboardUrl = DASHBOARD_ENDPOINTS.dashboard(filter, isPatrol);

      const res = await fetch(dashboardUrl, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) onUnauthorized();
        else alert(json.error || "Failed to load dashboard");
        return;
      }

      let incidents = json.incidents || [];

      if (isPatrol && user?.id) {
        incidents = incidents.filter((incident) => {
          const patrolId =
            incident.assignedPatrolId ||
            incident.patrolId ||
            incident.linkedPatrolId;

          return patrolId === user.id;
        });
      }

      let members = [];

      try {
        const membersRes = await fetch(MEMBER_ENDPOINTS.list, {
          headers: getAuthHeaders(),
        });

        if (membersRes.ok) {
          members = await membersRes.json();
        }
      } catch (err) {
        console.warn("Failed to load members", err);
      }

      const nextData = {
        incidents,
        patrols: json.patrols || [],
        vehicles: json.vehicles || [],
        organisations: json.organisations || [],
        members,
      };

      setData(nextData);

      if (selectedIncident) {
        const updatedSelected = nextData.incidents.find(
          (incident) => incident.id === selectedIncident.id
        );

        setSelectedIncident(updatedSelected || null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load dashboard");
    }
  }

  async function loadWorkload() {
    if (!token || !canViewPatrols) return;

    // Local workload keeps the console clean while the API workload route is not enabled.
    // Re-enable the fetch here only when /admin/patrols/workload exists on the API.
    setWorkload(buildLocalWorkload(data.patrols, data.incidents));
  }

  useEffect(() => {
    if (token && user) {
      loadDashboard();
    }
  }, [token, user?.id, user?.role, filter]);

  useEffect(() => {
    if (canViewPatrols) {
      loadWorkload();
    }
  }, [canViewPatrols, data.incidents.length, data.patrols.length]);

  return {
    data,
    setData,
    workload,
    loadDashboard,
    loadWorkload,
    resetAdminData,
  };
}
