import { useState } from "react";
import { INCIDENT_ENDPOINTS } from "../core/endpoints";

const emptyForm = {
  title: "",
  incidentType: "ASSAULT",
  areaId: "",
  street: "",
  suburb: "",
  description: "",
  sector: "Sector 1",
  severity: "MEDIUM",
  date: "",
  time: "",
};

export function useIncidents({
  canCreateIncidents,
  canUpdateIncidents,
  canAssignPatrol,
  getAuthHeaders,
  getJsonAuthHeaders,
  loadDashboard,
  loadWorkload,
  setActive,
}) {
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);

  function resetIncidents() {
    setSelectedIncident(null);
  }

  async function autoAssignIncident(id) {
    if (!canAssignPatrol) {
      alert("You do not have permission to auto assign incidents.");
      return;
    }

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.autoAssign(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Auto assign failed");
        return;
      }

      setSelectedIncident(json.incident);
      await loadDashboard();
      await loadWorkload();
    } catch (err) {
      console.error(err);
      alert("Auto assign failed");
    }
  }

  async function createIncident(e) {
    e.preventDefault();

    if (!canCreateIncidents) {
      alert("You do not have permission to create incidents.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.create, {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create incident");
        return;
      }

      setForm(emptyForm);
      setSelectedIncident(json);
      setActive("Incidents");
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to create incident");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    if (!canUpdateIncidents) {
      alert("You do not have permission to update incident status.");
      return;
    }

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.updateStatus(id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to update status");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  async function archiveIncident(id) {
    if (!canCreateIncidents) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.archive(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to archive incident");
        return;
      }

      setSelectedIncident(null);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to archive incident");
    }
  }

  async function deleteIncident(id) {
    if (!canCreateIncidents) return;
    if (!confirm("Delete incident permanently?")) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.detail(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to delete incident");
        return;
      }

      setSelectedIncident(null);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to delete incident");
    }
  }

  async function assignPatrol(id, patrolId, vehicleId) {
    if (!canAssignPatrol || (!patrolId && !vehicleId)) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.assignPatrol(id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ patrolId, vehicleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to assign patrol");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to assign patrol");
    }
  }

  async function unassignPatrol(id) {
    if (!canAssignPatrol) return;

    try {
      const res = await fetch(INCIDENT_ENDPOINTS.unassignPatrol(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to unassign patrol");
        return;
      }

      setSelectedIncident(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to unassign patrol");
    }
  }

  function viewIncident(incident) {
    alert(`Viewing: ${incident.title}`);
  }

  function editIncident(incident) {
    alert(`Edit: ${incident.title}`);
  }

  return {
    loading,
    setLoading,
    selectedIncident,
    setSelectedIncident,
    filter,
    setFilter,
    form,
    setForm,
    resetIncidents,
    autoAssignIncident,
    createIncident,
    updateStatus,
    archiveIncident,
    deleteIncident,
    assignPatrol,
    unassignPatrol,
    viewIncident,
    editIncident,
  };
}
