import React from "react";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import {
  getIntelAgeLabel,
  getIntelTimeFilterLabel,
  getRecordTimestamp,
  parseIntelDate,
} from "../../utils/date.utils";
import {
  getEntityLatLng,
  getIntelRiskBadge,
} from "./intelligence.utils";

function getIntelTimeWindowStart(preset) {
  const now = new Date();

  if (preset === "24H") {
    now.setHours(now.getHours() - 24);
    return now;
  }

  if (preset === "7D") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (preset === "30D") {
    now.setDate(now.getDate() - 30);
    return now;
  }

  if (preset === "90D") {
    now.setDate(now.getDate() - 90);
    return now;
  }

  return null;
}

function isWithinIntelTimeFilter(record, timeFilter) {
  if (!timeFilter || timeFilter.preset === "ALL") return true;

  const timestamp = getRecordTimestamp(record);
  const recordDate = parseIntelDate(timestamp);

  // Keep legacy records visible when using ALL only. For a time window,
  // records without dates are hidden so the timeline stays meaningful.
  if (!recordDate) return false;

  if (timeFilter.preset === "CUSTOM") {
    const from = parseIntelDate(timeFilter.from);
    const to = parseIntelDate(timeFilter.to);

    if (from && recordDate < from) return false;

    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (recordDate > endOfDay) return false;
    }

    return true;
  }

  const start = getIntelTimeWindowStart(timeFilter.preset);
  return start ? recordDate >= start : true;
}

export default function IntelGeoMap({ entities, selectedEntity, onOpenEntity, timeFilter }) {
  const validEntities = (entities || [])
    .filter((entity) => isWithinIntelTimeFilter(entity, timeFilter))
    .map((entity) => ({ entity, position: getEntityLatLng(entity) }))
    .filter((item) => item.position);

  const selectedPosition = getEntityLatLng(selectedEntity);
  const mapCenter = selectedPosition || validEntities[0]?.position || [-33.9249, 18.4241];

  return (
    <div className="panel">
      <div className="details-header">
        <div>
          <h3>Geo Map Intelligence</h3>
          <p className="card-detail">
            Location layer for intelligence entities. Time layer: {getIntelTimeFilterLabel(timeFilter)}.
          </p>
        </div>
        <span className="badge">{validEntities.length} mapped</span>
      </div>

      {validEntities.length === 0 ? (
        <div>
          <p>No mapped entities yet.</p>
          <p className="card-detail">
            Next step: add coordinate fields to intelligence entities, incidents and patrol sightings.
          </p>
        </div>
      ) : (
        <div style={{ height: 520, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: "520px", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {validEntities.map(({ entity, position }) => (
              <Marker key={entity.id} position={position}>
                <Popup>
                  <strong>{entity.displayName || "Unnamed entity"}</strong>
                  <br />
                  {entity.entityType || "ENTITY"} • {getIntelRiskBadge(entity)}
                  <br />
                  {entity.description || "No description"}
                  <br />
                  {[entity.address, entity.suburb].filter(Boolean).join(", ") || "No address"}
                  <br />
                  <small>{position.join(", ")} • {getIntelAgeLabel(entity)}</small>
                  <br />
                  <button style={{ marginTop: 8 }} onClick={() => onOpenEntity(entity)}>
                    Open Profile
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
