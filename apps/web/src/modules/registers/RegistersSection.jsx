export default function RegistersSection({
  data,
  registerSearch,
  onRegisterSearchChange,
  onClearRegisterSearch,
  registerTabs,
  registerTab,
  onRegisterTabChange,
  filteredRegisterIncidents,
  filteredRegisterVehicles,
  filteredRegisterMembers,
  filteredRegisterPatrollers,
  filteredRegisterPatrols,
  filteredRegisterOrganisations,
  viewIncident,
  editIncident,
  deleteIncident,
  onViewVehicle,
  onEditVehicle,
  canManageMembers,
  startAddMember,
  memberForm,
  isEditingMember,
  cancelMemberForm,
  saveMember,
  setMemberForm,
  selectedMember,
  onViewMember,
  onCloseSelectedMember,
  startEditMember,
  updatePatrollerStatus,
  createPatrollerLogin,
  disableMember,
  enableMember,
  memberRoles,
  roleMarker,
  getMemberRoles,
  getDisplayName,
  getVehicleLabel,
}) {
  return (
    <div className="panel">
      <h2>Registers</h2>

      <div className="filter-bar">
        <label>
          Search register
          <input
            value={registerSearch}
            onChange={(e) => onRegisterSearchChange(e.target.value)}
            placeholder="Search code, name, vehicle, sector, status..."
          />
        </label>

        <button onClick={onClearRegisterSearch}>Clear</button>
      </div>

      <div className="action-row">
        {registerTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onRegisterTabChange(tab)}
            className={registerTab === tab ? "primary-btn" : "secondary-btn"}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-title">Incident Register</div>
          <div className="card-value">{data.incidents.length}</div>
          <div className="card-detail">All captured incidents</div>
        </div>

        <div className="card">
          <div className="card-title">Vehicle Register</div>
          <div className="card-value">{data.vehicles.length}</div>
          <div className="card-detail">Operational vehicles</div>
        </div>

        <div className="card">
          <div className="card-title">Member Register</div>
          <div className="card-value">{data.members.length}</div>
          <div className="card-detail">Vetted sector members</div>
        </div>

        <div className="card">
          <div className="card-title">Patroller Register</div>
          <div className="card-value">{filteredRegisterPatrollers.length}</div>
          <div className="card-detail">Approved / pending patrol members</div>
        </div>

        <div className="card">
          <div className="card-title">Patrol Register</div>
          <div className="card-value">{data.patrols.length}</div>
          <div className="card-detail">Patrollers / patrol sessions</div>
        </div>

        <div className="card">
          <div className="card-title">Organisation Register</div>
          <div className="card-value">{data.organisations.length}</div>
          <div className="card-detail">Linked organisations</div>
        </div>
      </div>

      {registerTab === "Incidents" && (
        <>
          <h3>Incident Register</h3>
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
              {filteredRegisterIncidents.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.incidentCode || "-"}</td>
                  <td>{incident.title || "-"}</td>
                  <td>{incident.incidentType || "-"}</td>
                  <td>{incident.sector || "-"}</td>
                  <td>{incident.status || "-"}</td>
                  <td>{incident.severity || "-"}</td>
                  <td>{[incident.street, incident.suburb].filter(Boolean).join(", ") || "-"}</td>
                  <td>
                    <button onClick={() => viewIncident(incident)}>View</button>
                    <button onClick={() => editIncident(incident)}>Edit</button>
                    <button onClick={() => deleteIncident(incident.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Vehicles" && (
        <>
          <h3>Vehicle Register</h3>
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make</th>
                <th>Type</th>
                <th>Colour</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.registration || "-"}</td>
                  <td>{vehicle.make || "-"}</td>
                  <td>{vehicle.type || "-"}</td>
                  <td>{vehicle.colour || "-"}</td>
                  <td>{vehicle.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => onViewVehicle(vehicle)}>View</button>
                    <button onClick={onEditVehicle}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Members" && (
        <>
          <div className="details-header">
            <h3>Member Register</h3>
            {canManageMembers && (
              <button className="primary-btn" onClick={startAddMember}>
                Add Member
              </button>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Callsign</th>
                <th>Cell</th>
                <th>Sector</th>
                <th>Vetting</th>
                <th>Driver</th>
                <th>Competence</th>
                <th>Roles</th>
                <th>Patrol Status</th>
                <th>Login</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterMembers.map((member) => (
                <tr key={member.id}>
                  <td>{[member.firstName, member.surname].filter(Boolean).join(" ") || "-"}</td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.cellNumber || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>{member.vettingStatus || "-"}</td>
                  <td>
                    {member.driversLicence
                      ? `Yes${member.licenceCode ? ` (${member.licenceCode})` : ""}`
                      : "No"}
                  </td>
                  <td>
                    {[
                      member.firstAid ? "First Aid" : null,
                      member.fireTraining ? "Fire" : null,
                      member.radioTraining ? "Radio" : null,
                      member.patrolTraining ? "Patrol" : null,
                      member.controlRoomTraining ? "Control Room" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                  <td>{getMemberRoles(member).join(", ") || "-"}</td>
                  <td>
                    {member.patrolStatus || "NOT_PATROLLER"}
                    {member.patrolApproved ? " / APPROVED" : ""}
                  </td>
                  <td>
                    {member.user
                      ? `${member.user.email || member.user.fullName} (${member.user.role})`
                      : "No login"}
                  </td>
                  <td>{member.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => onViewMember(member)}>View Profile</button>
                    {canManageMembers && (
                      <>
                        <button onClick={() => startEditMember(member)}>Edit</button>
                        <button onClick={() => updatePatrollerStatus(member, "APPROVED", true)}>
                          Approve Patrol
                        </button>
                        {!member.user && member.email && (
                          <button onClick={() => createPatrollerLogin(member)}>Create Login</button>
                        )}
                        {member.isActive ? (
                          <button onClick={() => disableMember(member)}>Disable</button>
                        ) : (
                          <button onClick={() => enableMember(member)}>Enable</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {memberForm && (
            <div className="incident-details">
              <div className="details-header">
                <h3>{isEditingMember ? "Edit Member" : "Add Member"}</h3>
                <button className="secondary-btn" onClick={cancelMemberForm}>
                  Close
                </button>
              </div>

              <form className="form" onSubmit={saveMember}>
                <label>
                  First Name
                  <input
                    value={memberForm.firstName}
                    onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Surname
                  <input
                    value={memberForm.surname}
                    onChange={(e) => setMemberForm({ ...memberForm, surname: e.target.value })}
                    required
                  />
                </label>

                <label>
                  ID Number
                  <input
                    value={memberForm.idNumber || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, idNumber: e.target.value })}
                  />
                </label>

                <label>
                  Cell Number
                  <input
                    value={memberForm.cellNumber || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, cellNumber: e.target.value })}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={memberForm.email || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  />
                </label>

                <label>
                  Address
                  <input
                    value={memberForm.address || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  />
                </label>

                <label>
                  Suburb
                  <input
                    value={memberForm.suburb || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, suburb: e.target.value })}
                  />
                </label>

                <label>
                  Sector
                  <select
                    value={memberForm.sector || "Sector 1"}
                    onChange={(e) => setMemberForm({ ...memberForm, sector: e.target.value })}
                  >
                    <option>Sector 1</option>
                    <option>Sector 2</option>
                    <option>Sector 3</option>
                    <option>Sector 4</option>
                  </select>
                </label>

                <label>
                  Call Sign
                  <input
                    value={memberForm.callSign || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, callSign: e.target.value })}
                  />
                </label>

                <label>
                  Vetting Status
                  <select
                    value={memberForm.vettingStatus || "PENDING"}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, vettingStatus: e.target.value })
                    }
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  Patrol Status
                  <select
                    value={memberForm.patrolStatus || "NOT_PATROLLER"}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolStatus: e.target.value })
                    }
                  >
                    <option value="NOT_PATROLLER">NOT_PATROLLER</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.patrolApproved)}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        patrolApproved: e.target.checked,
                        patrolStatus: e.target.checked ? "APPROVED" : memberForm.patrolStatus,
                      })
                    }
                  />
                  Approved for Patrol Duty
                </label>

                <label>
                  Patrol Notes
                  <textarea
                    value={memberForm.patrolNotes || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolNotes: e.target.value })
                    }
                  />
                </label>

                <label>
                  Next of Kin Name
                  <input
                    value={memberForm.nextOfKinName || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, nextOfKinName: e.target.value })
                    }
                  />
                </label>

                <label>
                  Next of Kin Phone
                  <input
                    value={memberForm.nextOfKinPhone || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, nextOfKinPhone: e.target.value })
                    }
                  />
                </label>

                <label>
                  Medical Notes
                  <textarea
                    value={memberForm.medicalNotes || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, medicalNotes: e.target.value })
                    }
                  />
                </label>

                <label>
                  Allergies
                  <input
                    value={memberForm.allergies || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, allergies: e.target.value })}
                  />
                </label>

                <label>
                  Medication
                  <input
                    value={memberForm.medication || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, medication: e.target.value })}
                  />
                </label>

                <label>
                  Blood Type
                  <input
                    value={memberForm.bloodType || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, bloodType: e.target.value })}
                  />
                </label>

                <label>
                  Licence Code
                  <input
                    value={memberForm.licenceCode || ""}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, licenceCode: e.target.value })
                    }
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    value={memberForm.notes || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  />
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.isActive)}
                    onChange={(e) => setMemberForm({ ...memberForm, isActive: e.target.checked })}
                  />
                  Active Member
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.driversLicence)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, driversLicence: e.target.checked })
                    }
                  />
                  Driver Licence
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.pdp)}
                    onChange={(e) => setMemberForm({ ...memberForm, pdp: e.target.checked })}
                  />
                  PDP
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.firstAid)}
                    onChange={(e) => setMemberForm({ ...memberForm, firstAid: e.target.checked })}
                  />
                  First Aid
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.fireTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, fireTraining: e.target.checked })
                    }
                  />
                  Fire Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.radioTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, radioTraining: e.target.checked })
                    }
                  />
                  Radio Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.patrolTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, patrolTraining: e.target.checked })
                    }
                  />
                  Patrol Training
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(memberForm.controlRoomTraining)}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, controlRoomTraining: e.target.checked })
                    }
                  />
                  Control Room Training
                </label>

                <div className="panel">
                  <h3>Member Roles</h3>
                  <p className="card-detail">Select all operational roles this member may perform.</p>

                  {memberRoles.map((role) => (
                    <label key={role}>
                      <input
                        type="checkbox"
                        checked={(memberForm.roles || []).includes(role)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const currentRoles = memberForm.roles || [];

                          setMemberForm({
                            ...memberForm,
                            roles: checked
                              ? Array.from(new Set([...currentRoles, role]))
                              : currentRoles.filter((item) => item !== role),
                          });
                        }}
                      />
                      {role.replace("_", " ")}
                    </label>
                  ))}
                </div>

                <div className="action-row">
                  <button className="primary-btn" type="submit">
                    {isEditingMember ? "Update Member" : "Create Member"}
                  </button>
                  <button className="secondary-btn" type="button" onClick={cancelMemberForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {selectedMember && (
            <div className="incident-details">
              <div className="details-header">
                <h3>Member Profile</h3>
                <button className="secondary-btn" onClick={onCloseSelectedMember}>
                  Close
                </button>
              </div>

              <p>
                <strong>Name:</strong>{" "}
                {[selectedMember.firstName, selectedMember.surname].filter(Boolean).join(" ") ||
                  "-"}
              </p>
              <p>
                <strong>Callsign:</strong> {selectedMember.callSign || "-"}
              </p>
              <p>
                <strong>Cell:</strong> {selectedMember.cellNumber || "-"}
              </p>
              <p>
                <strong>Email:</strong> {selectedMember.email || "-"}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {[selectedMember.address, selectedMember.suburb].filter(Boolean).join(", ") || "-"}
              </p>
              <p>
                <strong>Sector:</strong> {selectedMember.sector || "-"}
              </p>
              <p>
                <strong>Vetting:</strong> {selectedMember.vettingStatus || "-"}
              </p>
              <p>
                <strong>Patrol Status:</strong> {selectedMember.patrolStatus || "NOT_PATROLLER"}
                {selectedMember.patrolApproved ? " / APPROVED" : ""}
              </p>
              <p>
                <strong>Login:</strong>{" "}
                {selectedMember.user
                  ? `${selectedMember.user.email || selectedMember.user.fullName} (${selectedMember.user.role})`
                  : "No linked login"}
              </p>
              <p>
                <strong>Roles:</strong> {getMemberRoles(selectedMember).join(", ") || "-"}
              </p>
              <p>
                <strong>Next of Kin:</strong>{" "}
                {[selectedMember.nextOfKinName, selectedMember.nextOfKinPhone]
                  .filter(Boolean)
                  .join(" - ") || "-"}
              </p>
              <p>
                <strong>Medical Notes:</strong> {selectedMember.medicalNotes || "-"}
              </p>
              <p>
                <strong>Allergies:</strong> {selectedMember.allergies || "-"}
              </p>
              <p>
                <strong>Medication:</strong> {selectedMember.medication || "-"}
              </p>
              <p>
                <strong>Blood Type:</strong> {selectedMember.bloodType || "-"}
              </p>
              <p>
                <strong>Driver Licence:</strong> {selectedMember.driversLicence ? "Yes" : "No"}
              </p>
              <p>
                <strong>Licence Code:</strong> {selectedMember.licenceCode || "-"}
              </p>
              <p>
                <strong>PDP:</strong> {selectedMember.pdp ? "Yes" : "No"}
              </p>
              <p>
                <strong>Competencies:</strong>{" "}
                {[
                  selectedMember.firstAid ? "First Aid" : null,
                  selectedMember.fireTraining ? "Fire Training" : null,
                  selectedMember.radioTraining ? "Radio Training" : null,
                  selectedMember.patrolTraining ? "Patrol Training" : null,
                  selectedMember.controlRoomTraining ? "Control Room Training" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
              <p>
                <strong>Patrol Notes:</strong> {selectedMember.patrolNotes || "-"}
              </p>
              <p>
                <strong>Notes:</strong>{" "}
                {(selectedMember.notes || "")
                  .split("\n")
                  .filter((line) => !line.startsWith(roleMarker))
                  .join("\n") || "-"}
              </p>
              {canManageMembers && (
                <div className="action-row">
                  <button onClick={() => startEditMember(selectedMember)}>Edit Member</button>
                  <button onClick={() => updatePatrollerStatus(selectedMember, "APPROVED", true)}>
                    Approve Patrol
                  </button>
                  <button onClick={() => updatePatrollerStatus(selectedMember, "SUSPENDED", false)}>
                    Suspend Patrol
                  </button>
                  {!selectedMember.user && selectedMember.email && (
                    <button onClick={() => createPatrollerLogin(selectedMember)}>
                      Create Patroller Login
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {registerTab === "Patrollers" && (
        <>
          <div className="details-header">
            <h3>Patroller Register</h3>
            <p className="card-detail">
              Live-ready patroller records. Create the member first, then approve patrol duty and
              create/link login.
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Login</th>
                <th>Callsign</th>
                <th>Sector</th>
                <th>Patrol Status</th>
                <th>Training</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterPatrollers.map((member) => (
                <tr key={member.id}>
                  <td>{[member.firstName, member.surname].filter(Boolean).join(" ") || "-"}</td>
                  <td>{member.user?.email || member.email || "No email"}</td>
                  <td>{member.callSign || "-"}</td>
                  <td>{member.sector || "-"}</td>
                  <td>
                    {member.patrolStatus || "NOT_PATROLLER"}
                    {member.patrolApproved ? " / APPROVED" : ""}
                  </td>
                  <td>{member.patrolTraining ? "Patrol trained" : "Training not marked"}</td>
                  <td>
                    <button onClick={() => onViewMember(member)}>View</button>
                    <button onClick={() => startEditMember(member)}>Edit</button>
                    <button onClick={() => updatePatrollerStatus(member, "APPROVED", true)}>
                      Approve
                    </button>
                    <button onClick={() => updatePatrollerStatus(member, "SUSPENDED", false)}>
                      Suspend
                    </button>
                    {!member.user && member.email && (
                      <button onClick={() => createPatrollerLogin(member)}>Create Login</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Patrols" && (
        <>
          <h3>Patrol / Patroller Register</h3>
          <table>
            <thead>
              <tr>
                <th>Patroller</th>
                <th>Vehicle</th>
                <th>Sector</th>
                <th>Status</th>
                <th>Start KM</th>
                <th>End KM</th>
                <th>Total KM</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterPatrols.map((patrol) => (
                <tr key={patrol.id}>
                  <td>{patrol.user?.fullName || patrol.user?.email || getDisplayName(patrol)}</td>
                  <td>{patrol.vehicle?.registration || getVehicleLabel(patrol.vehicle)}</td>
                  <td>{patrol.sector || "-"}</td>
                  <td>{patrol.status || "-"}</td>
                  <td>{patrol.startKm ?? "-"}</td>
                  <td>{patrol.endKm ?? "-"}</td>
                  <td>{patrol.totalKm ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {registerTab === "Organisations" && (
        <>
          <h3>Organisation Register</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Sectors</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisterOrganisations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name || "-"}</td>
                  <td>{org.code || "-"}</td>
                  <td>{org.sectors?.map((s) => s.name).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
