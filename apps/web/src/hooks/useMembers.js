import { useState } from "react";
import { MEMBER_ENDPOINTS } from "../core/endpoints";
import { getMemberRoles, saveRolesIntoNotes } from "../modules/members/member.utils";

function emptyMemberForm() {
  return {
    firstName: "",
    surname: "",
    idNumber: "",
    cellNumber: "",
    email: "",
    address: "",
    suburb: "",
    sector: "Sector 1",
    callSign: "",
    vettingStatus: "PENDING",
    isActive: true,
    nextOfKinName: "",
    nextOfKinPhone: "",
    medicalNotes: "",
    allergies: "",
    medication: "",
    bloodType: "",
    driversLicence: false,
    licenceCode: "",
    pdp: false,
    firstAid: false,
    fireTraining: false,
    radioTraining: false,
    patrolTraining: false,
    controlRoomTraining: false,
    patrolApproved: false,
    patrolStatus: "NOT_PATROLLER",
    patrolNotes: "",
    patrollerPassword: "",
    notes: "",
    roles: [],
  };
}

export function useMembers({
  canManageMembers,
  getJsonAuthHeaders,
  loadDashboard,
}) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberForm, setMemberForm] = useState(null);
  const [isEditingMember, setIsEditingMember] = useState(false);

  function startAddMember() {
    if (!canManageMembers) {
      alert("You do not have permission to add members.");
      return;
    }

    setSelectedMember(null);
    setIsEditingMember(false);
    setMemberForm(emptyMemberForm());
  }

  function startEditMember(member) {
    if (!canManageMembers) {
      alert("You do not have permission to edit members.");
      return;
    }

    setSelectedMember(null);
    setIsEditingMember(true);
    setMemberForm({
      ...emptyMemberForm(),
      ...member,
      roles: getMemberRoles(member),
    });
  }

  function cancelMemberForm() {
    setMemberForm(null);
    setIsEditingMember(false);
  }

  async function saveMember(e) {
    e.preventDefault();

    if (!canManageMembers) {
      alert("You do not have permission to save members.");
      return;
    }

    if (!memberForm.firstName || !memberForm.surname) {
      alert("First name and surname are required.");
      return;
    }

    try {
      const url = isEditingMember
        ? MEMBER_ENDPOINTS.detail(memberForm.id)
        : MEMBER_ENDPOINTS.list;

      const method = isEditingMember ? "PATCH" : "POST";

      const payload = {
        ...memberForm,
        firstName: memberForm.firstName.trim(),
        surname: memberForm.surname.trim(),
        callSign: memberForm.callSign || null,
        cellNumber: memberForm.cellNumber || null,
        email: memberForm.email || null,
        address: memberForm.address || null,
        suburb: memberForm.suburb || null,
        idNumber: memberForm.idNumber || null,
        nextOfKinName: memberForm.nextOfKinName || null,
        nextOfKinPhone: memberForm.nextOfKinPhone || null,
        medicalNotes: memberForm.medicalNotes || null,
        allergies: memberForm.allergies || null,
        medication: memberForm.medication || null,
        bloodType: memberForm.bloodType || null,
        licenceCode: memberForm.licenceCode || null,
        patrolApproved: Boolean(memberForm.patrolApproved),
        patrolStatus: memberForm.patrolStatus || "NOT_PATROLLER",
        patrolNotes: memberForm.patrolNotes || null,
        notes: saveRolesIntoNotes(memberForm.notes, memberForm.roles),
      };

      delete payload.roles;
      delete payload.user;
      delete payload.userId;
      delete payload.patrollerPassword;
      delete payload.id;
      delete payload.createdAt;
      delete payload.updatedAt;

      const res = await fetch(url, {
        method,
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to save member");
        return;
      }

      setMemberForm(null);
      setIsEditingMember(false);
      setSelectedMember(json);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to save member");
    }
  }

  async function disableMember(member) {
    if (!canManageMembers) {
      alert("You do not have permission to disable members.");
      return;
    }

    if (!confirm(`Disable ${member.firstName || "this"} ${member.surname || "member"}?`)) {
      return;
    }

    try {
      const res = await fetch(MEMBER_ENDPOINTS.detail(member.id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ isActive: false }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to disable member");
        return;
      }

      if (selectedMember?.id === member.id) {
        setSelectedMember(json);
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to disable member");
    }
  }

  async function enableMember(member) {
    if (!canManageMembers) {
      alert("You do not have permission to enable members.");
      return;
    }

    try {
      const res = await fetch(MEMBER_ENDPOINTS.detail(member.id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ isActive: true }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to enable member");
        return;
      }

      if (selectedMember?.id === member.id) {
        setSelectedMember(json);
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to enable member");
    }
  }

  async function createPatrollerLogin(member) {
    if (!canManageMembers || !member?.id) return;

    const suggestedPassword = "password123";
    const password = prompt(
      `Create patroller login for ${[member.firstName, member.surname].filter(Boolean).join(" ") || "member"}?

Email: ${member.email || "NO EMAIL"}

Enter temporary password:`,
      suggestedPassword
    );

    if (password === null) return;

    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      const res = await fetch(MEMBER_ENDPOINTS.createPatrollerLogin(member.id), {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create patroller login");
        return;
      }

      setSelectedMember(json);
      await loadDashboard();
      alert("Patroller login created / linked.");
    } catch (err) {
      console.error(err);
      alert("Failed to create patroller login");
    }
  }

  async function updatePatrollerStatus(member, patrolStatus, patrolApproved = false) {
    if (!canManageMembers || !member?.id) return;

    try {
      const res = await fetch(MEMBER_ENDPOINTS.patrollerStatus(member.id), {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          patrolStatus,
          patrolApproved,
          patrolNotes: member.patrolNotes || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to update patroller status");
        return;
      }

      if (selectedMember?.id === member.id) {
        setSelectedMember(json);
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to update patroller status");
    }
  }

  return {
    selectedMember,
    setSelectedMember,
    memberForm,
    setMemberForm,
    isEditingMember,
    startAddMember,
    startEditMember,
    cancelMemberForm,
    saveMember,
    disableMember,
    enableMember,
    createPatrollerLogin,
    updatePatrollerStatus,
  };
}
