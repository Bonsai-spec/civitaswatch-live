import React from "react";

function formatIntelPatrolEventLocation(event) {
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

function formatIntelPatrolEventClassification(event) {
  return [
    event?.incidentCodeRef?.code || event?.incident?.incidentCodeRef?.code || event?.incidentCode,
    event?.incidentSubcodeRef?.subcode || event?.incident?.incidentSubcodeRef?.subcode,
    event?.serviceTypeRef?.type,
    event?.infrastructureTypeRef?.type,
  ].filter(Boolean).join(" / ");
}

export default function IntelligenceSection({
  intelligenceEntities,
  filteredIntelligenceEntities,
  intelSearch,
  setIntelSearch,
  intelTimeFilter,
  setIntelTimeFilter,
  intelForm,
  setIntelForm,
  isEditingIntel,
  selectedIntelEntity,
  setSelectedIntelEntity,
  intelLinkForm,
  setIntelLinkForm,
  autoLinkSuggestions,
  intelEntityTypes,
  intelRiskLevels,
  intelStatuses,
  intelRelationships,
  IntelSpiderGraph,
  IntelGeoMap,
  startAddIntelEntity,
  refreshIntelligence,
  cancelIntelForm,
  saveIntelEntity,
  startEditIntelEntity,
  createIntelLink,
  createSuggestedIntelLink,
  rejectAutoLinkSuggestion,
  hideAutoLinkSuggestion,
  viewIntelEntity,
  deleteIntelLink,
  deleteIntelEntity,
  getIntelTimeFilterLabel,
  getIntelRiskBadge,
  getEntityLatLng,
  getIntelAgeLabel,
}) {
  return (
    <div className="panel">
      <div className="details-header">
        <div>
          <h2>Crime Intelligence</h2>
          <p className="card-detail">
            Restricted workspace for persons, vehicles, locations and linked intelligence.
          </p>
        </div>
        <button className="primary-btn" onClick={startAddIntelEntity}>
          Add Entity
        </button>
      </div>

      <div className="filter-bar">
        <label>
          Search intelligence
          <input
            value={intelSearch}
            onChange={(e) => setIntelSearch(e.target.value)}
            placeholder="Search person, vehicle, location, risk, status..."
          />
        </label>
        <button onClick={() => setIntelSearch("")}>Clear</button>
        <button className="secondary-btn" onClick={refreshIntelligence}>Refresh Intelligence</button>

        <label>
          Time layer
          <select
            value={intelTimeFilter.preset}
            onChange={(e) =>
              setIntelTimeFilter({
                ...intelTimeFilter,
                preset: e.target.value,
              })
            }
          >
            <option value="ALL">All time</option>
            <option value="24H">Last 24 hours</option>
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
            <option value="90D">Last 90 days</option>
            <option value="CUSTOM">Custom range</option>
          </select>
        </label>

        {intelTimeFilter.preset === "CUSTOM" && (
          <>
            <label>
              From
              <input
                type="date"
                value={intelTimeFilter.from}
                onChange={(e) =>
                  setIntelTimeFilter({ ...intelTimeFilter, from: e.target.value })
                }
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={intelTimeFilter.to}
                onChange={(e) =>
                  setIntelTimeFilter({ ...intelTimeFilter, to: e.target.value })
                }
              />
            </label>
          </>
        )}
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-title">Intelligence Intake / Review Queue</div>
          <div className="card-value">Planned</div>
          <div className="card-detail">
            Future analyst review queue for promoted incidents, patrol events, Control Room flags,
            and confidential-source intake.
          </div>
        </div>
        <div className="card">
          <div className="card-title">Entities</div>
          <div className="card-value">{intelligenceEntities.length}</div>
          <div className="card-detail">Total intelligence records</div>
        </div>
        <div className="card">
          <div className="card-title">Time Layer</div>
          <div className="card-value">{filteredIntelligenceEntities.length}</div>
          <div className="card-detail">{getIntelTimeFilterLabel(intelTimeFilter)}</div>
        </div>
        <div className="card">
          <div className="card-title">High / Critical</div>
          <div className="card-value">
            {intelligenceEntities.filter((item) => ["HIGH", "CRITICAL"].includes(item.riskLevel)).length}
          </div>
          <div className="card-detail">Priority attention</div>
        </div>
        <div className="card">
          <div className="card-title">Vehicles</div>
          <div className="card-value">
            {intelligenceEntities.filter((item) => item.entityType === "VEHICLE").length}
          </div>
          <div className="card-detail">Vehicles of interest</div>
        </div>
        <div className="card">
          <div className="card-title">Watchlist</div>
          <div className="card-value">
            {intelligenceEntities.filter((item) => item.status === "WATCHLIST").length}
          </div>
          <div className="card-detail">Currently monitored</div>
        </div>
      </div>

      {intelForm && (
        <div className="incident-details">
          <div className="details-header">
            <h3>{isEditingIntel ? "Edit Intelligence Entity" : "Add Intelligence Entity"}</h3>
            <button className="secondary-btn" onClick={cancelIntelForm}>Close</button>
          </div>

          <form className="form" onSubmit={saveIntelEntity}>
            <label>
              Entity Type
              <select
                value={intelForm.entityType}
                onChange={(e) => setIntelForm({ ...intelForm, entityType: e.target.value })}
              >
                {intelEntityTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>
              Display Name
              <input
                value={intelForm.displayName}
                onChange={(e) => setIntelForm({ ...intelForm, displayName: e.target.value })}
                placeholder="Example: White Toyota Quantum / John Doe / Hotspot"
                required
              />
            </label>

            <label>
              Description / Notes
              <textarea
                value={intelForm.description || ""}
                onChange={(e) => setIntelForm({ ...intelForm, description: e.target.value })}
                placeholder="Source notes, observations, behaviour, identifying details"
              />
            </label>

            <label>
              Risk Level
              <select
                value={intelForm.riskLevel}
                onChange={(e) => setIntelForm({ ...intelForm, riskLevel: e.target.value })}
              >
                {intelRiskLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={intelForm.status}
                onChange={(e) => setIntelForm({ ...intelForm, status: e.target.value })}
              >
                {intelStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <div className="panel">
              <h3>Location / Geo Data</h3>
              <p className="card-detail">
                Address is human-readable. Latitude/longitude powers the Geo Map pin.
              </p>

              <label>
                Street / Address
                <input
                  value={intelForm.address || ""}
                  onChange={(e) => setIntelForm({ ...intelForm, address: e.target.value })}
                  placeholder="Example: 12 Main Road"
                />
              </label>

              <label>
                Suburb / Area
                <input
                  value={intelForm.suburb || ""}
                  onChange={(e) => setIntelForm({ ...intelForm, suburb: e.target.value })}
                  placeholder="Example: Claremont"
                />
              </label>

              <label>
                Sector
                <select
                  value={intelForm.sector || ""}
                  onChange={(e) => setIntelForm({ ...intelForm, sector: e.target.value })}
                >
                  <option value="">No sector</option>
                  <option>Sector 1</option>
                  <option>Sector 2</option>
                  <option>Sector 3</option>
                  <option>Sector 4</option>
                </select>
              </label>

              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={intelForm.latitude ?? ""}
                  onChange={(e) => setIntelForm({ ...intelForm, latitude: e.target.value })}
                  placeholder="Example: -33.9249"
                />
              </label>

              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={intelForm.longitude ?? ""}
                  onChange={(e) => setIntelForm({ ...intelForm, longitude: e.target.value })}
                  placeholder="Example: 18.4241"
                />
              </label>
            </div>

            {intelForm.entityType === "VEHICLE" && (
              <div className="panel">
                <h3>Vehicle of Interest Details</h3>
                <label>
                  Registration Number
                  <input
                    value={intelForm.vehicleRegistration || ""}
                    onChange={(e) => setIntelForm({ ...intelForm, vehicleRegistration: e.target.value })}
                    placeholder="Unknown allowed"
                  />
                </label>
                <label>Make<input value={intelForm.vehicleMake || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleMake: e.target.value })} /></label>
                <label>Model<input value={intelForm.vehicleModel || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleModel: e.target.value })} /></label>
                <label>Colour<input value={intelForm.vehicleColour || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleColour: e.target.value })} /></label>
                <label>Vehicle Type<input value={intelForm.vehicleType || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleType: e.target.value })} /></label>
                <label>Distinguishing Marks<textarea value={intelForm.vehicleMarks || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleMarks: e.target.value })} /></label>
                <label>Vehicle Notes<textarea value={intelForm.vehicleNotes || ""} onChange={(e) => setIntelForm({ ...intelForm, vehicleNotes: e.target.value })} /></label>
              </div>
            )}

            <div className="action-row">
              <button className="primary-btn" type="submit">{isEditingIntel ? "Update Entity" : "Create Entity"}</button>
              <button className="secondary-btn" type="button" onClick={cancelIntelForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {selectedIntelEntity && (
        <div className="incident-details">
          <div className="details-header">
            <div>
              <h3>Intel Profile: {selectedIntelEntity.displayName}</h3>
              <p className="card-detail">
                {selectedIntelEntity.entityType} • {getIntelRiskBadge(selectedIntelEntity)}
              </p>
            </div>
            <div className="action-row">
              <button className="secondary-btn" onClick={() => startEditIntelEntity(selectedIntelEntity)}>
                Edit Profile
              </button>
              <button className="secondary-btn" onClick={() => setSelectedIntelEntity(null)}>
                Close
              </button>
            </div>
          </div>

          <div className="cards">
            <div className="card">
              <div className="card-title">Risk</div>
              <div className="card-value">{selectedIntelEntity.riskLevel || "LOW"}</div>
              <div className="card-detail">Current risk level</div>
            </div>

            <div className="card">
              <div className="card-title">Status</div>
              <div className="card-value">{selectedIntelEntity.status || "ACTIVE"}</div>
              <div className="card-detail">Intel record status</div>
            </div>

            <div className="card">
              <div className="card-title">Links</div>
              <div className="card-value">
                {(selectedIntelEntity.outgoingLinks || []).length +
                  (selectedIntelEntity.incomingLinks || []).length}
              </div>
              <div className="card-detail">Known entity relationships</div>
            </div>

            <div className="card">
              <div className="card-title">Activity</div>
              <div className="card-value">
                {(selectedIntelEntity.incidentVOILinks || []).length +
                  (selectedIntelEntity.patrolEventVOILinks || []).length}
              </div>
              <div className="card-detail">Incident / patrol references</div>
            </div>
          </div>

          <div className="grid">
            <div className="panel">
              <h3>Profile Summary</h3>
              <p><strong>Name / Label:</strong> {selectedIntelEntity.displayName}</p>
              <p><strong>Type:</strong> {selectedIntelEntity.entityType}</p>
              <p><strong>Risk / Status:</strong> {getIntelRiskBadge(selectedIntelEntity)}</p>
              <p><strong>Description:</strong> {selectedIntelEntity.description || "-"}</p>
              <p><strong>Address:</strong> {[selectedIntelEntity.address, selectedIntelEntity.suburb].filter(Boolean).join(", ") || "-"}</p>
              <p><strong>Sector:</strong> {selectedIntelEntity.sector || "-"}</p>
              <p><strong>Coordinates:</strong>{" "}{getEntityLatLng(selectedIntelEntity) ? getEntityLatLng(selectedIntelEntity).join(", ") : "-"}</p>
              <p>
                <strong>Created:</strong>{" "}
                {selectedIntelEntity.createdAt
                  ? new Date(selectedIntelEntity.createdAt).toLocaleString()
                  : "-"}
              </p>
              <p>
                <strong>Updated:</strong>{" "}
                {selectedIntelEntity.updatedAt
                  ? new Date(selectedIntelEntity.updatedAt).toLocaleString()
                  : "-"}
              </p>
              <p><strong>Timeline:</strong> {getIntelAgeLabel(selectedIntelEntity)}</p>
            </div>

            {selectedIntelEntity.voivehicleDetails && (
              <div className="panel">
                <h3>Vehicle of Interest</h3>
                <p><strong>Registration:</strong> {selectedIntelEntity.voivehicleDetails.registrationNumber || "-"}</p>
                <p>
                  <strong>Make / Model:</strong>{" "}
                  {[selectedIntelEntity.voivehicleDetails.make, selectedIntelEntity.voivehicleDetails.model]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </p>
                <p><strong>Colour:</strong> {selectedIntelEntity.voivehicleDetails.colour || "-"}</p>
                <p><strong>Type:</strong> {selectedIntelEntity.voivehicleDetails.vehicleType || "-"}</p>
                <p><strong>Marks:</strong> {selectedIntelEntity.voivehicleDetails.distinguishingMarks || "-"}</p>
                <p><strong>Notes:</strong> {selectedIntelEntity.voivehicleDetails.notes || "-"}</p>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Create Intelligence Link</h3>
            <form className="form" onSubmit={createIntelLink}>
              <label>
                From
                <select
                  value={intelLinkForm.fromEntityId || selectedIntelEntity.id}
                  onChange={(e) => setIntelLinkForm({ ...intelLinkForm, fromEntityId: e.target.value })}
                >
                  <option value={selectedIntelEntity.id}>{selectedIntelEntity.displayName}</option>
                  {intelligenceEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>{entity.displayName}</option>
                  ))}
                </select>
              </label>

              <label>
                To
                <select
                  value={intelLinkForm.toEntityId}
                  onChange={(e) => setIntelLinkForm({ ...intelLinkForm, toEntityId: e.target.value })}
                >
                  <option value="">Select target entity</option>
                  {intelligenceEntities
                    .filter((entity) => entity.id !== (intelLinkForm.fromEntityId || selectedIntelEntity.id))
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.displayName} ({entity.entityType})
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Relationship
                <select
                  value={intelLinkForm.relationship}
                  onChange={(e) => setIntelLinkForm({ ...intelLinkForm, relationship: e.target.value })}
                >
                  {intelRelationships.map((relationship) => (
                    <option key={relationship} value={relationship}>{relationship}</option>
                  ))}
                </select>
              </label>

              <label>
                Strength 1-10
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={intelLinkForm.strength}
                  onChange={(e) => setIntelLinkForm({ ...intelLinkForm, strength: e.target.value })}
                />
              </label>

              <label>
                Link Notes
                <textarea
                  value={intelLinkForm.notes}
                  onChange={(e) => setIntelLinkForm({ ...intelLinkForm, notes: e.target.value })}
                />
              </label>

              <button className="primary-btn" type="submit">Create Link</button>
            </form>
          </div>

          <div className="panel">
            <div className="details-header">
              <div>
                <h3>Auto Link Suggestions</h3>
                <p className="card-detail">
                  Suggested matches are based on registration, names, address, suburb and sector. Analyst approval is required: Accept, Reject, or Ignore.
                </p>
              </div>
              <span className="badge">{autoLinkSuggestions.length} suggestions</span>
            </div>

            {autoLinkSuggestions.length === 0 ? (
              <div>
                <p>No new auto-link suggestions for this profile.</p>
                <p className="card-detail">All strong matches may already be linked, ignored, or rejected.</p>
              </div>
            ) : (
              autoLinkSuggestions.map((suggestion) => (
                <div key={suggestion.targetEntity.id} className="item">
                  <div>
                    <strong>{suggestion.targetEntity.displayName}</strong>
                    <div>
                      {suggestion.targetEntity.entityType || "ENTITY"} • Suggested relationship: {suggestion.relationship}
                    </div>
                    <div>
                      Confidence: {suggestion.strength}/10 • Score: {suggestion.score}
                    </div>
                    <div className="card-detail">
                      {suggestion.reasons.join(" • ")}
                    </div>
                  </div>
                  <div className="action-row">
                    <button
                      className="primary-btn"
                      onClick={() => createSuggestedIntelLink(suggestion)}
                    >
                      Accept
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => rejectAutoLinkSuggestion(suggestion)}
                    >
                      Reject
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => hideAutoLinkSuggestion(suggestion)}
                    >
                      Ignore
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => viewIntelEntity(suggestion.targetEntity)}
                    >
                      Open Target
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid">
            <div className="panel">
              <h3>Outgoing Links</h3>
              {(selectedIntelEntity.outgoingLinks || []).length === 0 && <p>No outgoing links.</p>}
              {(selectedIntelEntity.outgoingLinks || []).map((link) => (
                <div key={link.id} className="item">
                  <div>
                    <strong>{link.relationship}</strong>
                    <div>{link.toEntity?.displayName || link.toEntityId}</div>
                    <div>{link.toEntity?.entityType || "Linked entity"}</div>
                    <div>{link.notes || "No notes"}</div>
                    <div className="card-detail">{getIntelAgeLabel(link)}</div>
                    <div className="action-row">
                      <button
                        className="secondary-btn"
                        onClick={() => viewIntelEntity(link.toEntity || { id: link.toEntityId })}
                      >
                        Open Linked Profile
                      </button>
                      <button
                        className="secondary-btn danger"
                        onClick={() => deleteIntelLink(link)}
                      >
                        Delete Link
                      </button>
                    </div>
                  </div>
                  <span className="badge">{link.strength || "-"}</span>
                </div>
              ))}
            </div>

            <div className="panel">
              <h3>Incoming Links</h3>
              {(selectedIntelEntity.incomingLinks || []).length === 0 && <p>No incoming links.</p>}
              {(selectedIntelEntity.incomingLinks || []).map((link) => (
                <div key={link.id} className="item">
                  <div>
                    <strong>{link.relationship}</strong>
                    <div>{link.fromEntity?.displayName || link.fromEntityId}</div>
                    <div>{link.fromEntity?.entityType || "Linked entity"}</div>
                    <div>{link.notes || "No notes"}</div>
                    <div className="card-detail">{getIntelAgeLabel(link)}</div>
                    <div className="action-row">
                      <button
                        className="secondary-btn"
                        onClick={() => viewIntelEntity(link.fromEntity || { id: link.fromEntityId })}
                      >
                        Open Linked Profile
                      </button>
                      <button
                        className="secondary-btn danger"
                        onClick={() => deleteIntelLink(link)}
                      >
                        Delete Link
                      </button>
                    </div>
                  </div>
                  <span className="badge">{link.strength || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid">
            <div className="panel">
              <h3>Linked Incidents</h3>
              {(selectedIntelEntity.incidentVOILinks || []).length === 0 && <p>No incident links yet.</p>}
              {(selectedIntelEntity.incidentVOILinks || []).map((item) => (
                <div key={item.id} className="item">
                  <div>
                    <strong>{item.incident?.incidentCode || "Incident"}</strong>
                    <div>{item.incident?.title || "-"}</div>
                    <div>{item.incident?.status || "-"} • {item.incident?.severity || "-"}</div>
                    <div>{item.roleInIncident || item.notes || "-"}</div>
                    <div className="card-detail">{getIntelAgeLabel({ ...item, ...(item.incident || {}) })}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <h3>Patrol Observations</h3>
              {(selectedIntelEntity.patrolEventVOILinks || []).length === 0 && <p>No patrol observations yet.</p>}
              {(selectedIntelEntity.patrolEventVOILinks || []).map((item) => {
                const event = item.patrolEvent || {};
                const classification = formatIntelPatrolEventClassification(event);
                const location = formatIntelPatrolEventLocation(event);

                return (
                  <div key={item.id} className="item">
                    <div>
                      <strong>{item.observationType || "Observation"}</strong>
                      <div>{event.type || "Patrol event"}</div>
                      {classification && <div>Classification: {classification}</div>}
                      {event.referenceNumber && <div>Reference: {event.referenceNumber}</div>}
                      {location && <div>Location: {location}</div>}
                      <div>{item.notes || event.description || "-"}</div>
                      <div className="card-detail">{getIntelAgeLabel({ ...item, ...event })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div id="intel-spider-map">
            <IntelSpiderGraph
              entity={selectedIntelEntity}
              allEntities={intelligenceEntities}
              onOpenEntity={viewIntelEntity}
              onDeleteLink={deleteIntelLink}
              timeFilter={intelTimeFilter}
            />
          </div>

          <IntelGeoMap
            entities={intelligenceEntities}
            selectedEntity={selectedIntelEntity}
            onOpenEntity={viewIntelEntity}
            timeFilter={intelTimeFilter}
          />

          <div className="panel">
            <h3>Relationship Summary</h3>
            <p className="card-detail">
              The Spider Map above uses outgoing links, incoming links, incident links and patrol observations
              to show the live intelligence network around this profile.
            </p>
          </div>
        </div>
      )}

      <h3>Intelligence Entity Register</h3>
      {filteredIntelligenceEntities.length === 0 ? (<p>No intelligence entities found.</p>) : (
        <table>
          <thead><tr><th>Type</th><th>Name</th><th>Risk</th><th>Status</th><th>Age</th><th>Vehicle Reg</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>{filteredIntelligenceEntities.map((entity) => (<tr key={entity.id}><td>{entity.entityType}</td><td>{entity.displayName}</td><td>{entity.riskLevel || "LOW"}</td><td>{entity.status || "ACTIVE"}</td><td>{getIntelAgeLabel(entity)}</td><td>{entity.voivehicleDetails?.registrationNumber || "-"}</td><td>{entity.description || "-"}</td><td><button onClick={() => viewIntelEntity(entity)}>View</button><button onClick={() => startEditIntelEntity(entity)}>Edit</button><button onClick={() => deleteIntelEntity(entity)}>Archive</button></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
