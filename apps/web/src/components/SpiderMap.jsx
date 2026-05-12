import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

function getLinkEndpointId(endpoint) {
  if (!endpoint) return "";
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

function getRawLinkType(link) {
  return (
    link.relationship ||
    link.type ||
    link.label ||
    link.relationshipType ||
    "LINKED_TO"
  );
}

function getLinkPriority(type) {
  const priority = {
    SAME_VEHICLE: 100,
    SAME: 100,
    DUPLICATE_RECORD: 95,
    DRIVES: 80,
    OWNS: 75,
    INVOLVED_IN: 70,
    INVOLVED: 70,
    SEEN_WITH: 60,
    SEEN: 60,
    ASSOCIATED_WITH: 50,
    ASSOC: 50,
    LINKED_TO: 40,
    LINK: 40,
    OTHER: 10,
  };

  return priority[type] ?? 20;
}

function getShortRelationshipLabel(type) {
  const labels = {
    SAME_VEHICLE: "SAME",
    DUPLICATE_RECORD: "DUP",
    ASSOCIATED_WITH: "ASSOC",
    LINKED_TO: "LINK",
    SEEN_WITH: "SEEN",
    OPERATES_IN: "AREA",
    INVOLVED_IN: "INVOLVED",
    INCIDENT_LINK: "INCIDENT",
    PATROL_OBSERVATION: "OBS",
  };

  return labels[type] || type || "LINK";
}

function buildCleanLinks(rawLinks = []) {
  const cleanMap = new Map();

  rawLinks.forEach((link) => {
    const sourceId = getLinkEndpointId(link.source);
    const targetId = getLinkEndpointId(link.target);

    if (!sourceId || !targetId) return;

    const type = getRawLinkType(link);
    const key =
      sourceId < targetId
        ? `${sourceId}__${targetId}`
        : `${targetId}__${sourceId}`;

    const existing = cleanMap.get(key);

    const currentPriority = getLinkPriority(type);
    const existingPriority = existing
      ? getLinkPriority(existing.relationship || existing.type || existing.label)
      : -1;

    if (!existing || currentPriority > existingPriority) {
      cleanMap.set(key, {
        ...link,
        relationship: type,
        label: getShortRelationshipLabel(type),
        source: link.source,
        target: link.target,
      });
    }
  });

  return Array.from(cleanMap.values());
}

function buildConnectedNodeSet(links, selectedNodeId) {
  const connected = new Set();

  if (!selectedNodeId) return connected;

  links.forEach((link) => {
    const sourceId = getLinkEndpointId(link.source);
    const targetId = getLinkEndpointId(link.target);

    if (sourceId === selectedNodeId) connected.add(targetId);
    if (targetId === selectedNodeId) connected.add(sourceId);
  });

  return connected;
}

function isLinkConnectedToNode(link, nodeId) {
  if (!nodeId) return false;

  const sourceId = getLinkEndpointId(link.source);
  const targetId = getLinkEndpointId(link.target);

  return sourceId === nodeId || targetId === nodeId;
}

function getNodeColor(node) {
  if (node.isCenter) return "#2563eb";
  if (node.entityType === "PERSON") return "#7c3aed";
  if (node.entityType === "VEHICLE") return "#ea580c";
  if (node.entityType === "LOCATION") return "#16a34a";
  if (node.entityType === "INCIDENT") return "#dc2626";
  if (node.entityType === "PATROL_EVENT") return "#0891b2";
  if (node.riskLevel === "CRITICAL") return "#b91c1c";
  if (node.riskLevel === "HIGH") return "#f97316";
  return "#64748b";
}

function getNodeRadius(node) {
  if (node.isCenter) return 9;
  if (node.riskLevel === "CRITICAL") return 8;
  if (node.riskLevel === "HIGH") return 7;
  return 6;
}

export default function SpiderMap({
  graphData,
  timeLabel = "All time",
  onOpenEntity,
  onDeleteLink,
}) {
  const graphRef = useRef(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const cleanGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    return {
      nodes: graphData.nodes || [],
      links: buildCleanLinks(graphData.links || []),
    };
  }, [graphData]);

  const connectedNodes = useMemo(() => {
    return buildConnectedNodeSet(cleanGraphData.links, selectedNodeId);
  }, [cleanGraphData.links, selectedNodeId]);

  useEffect(() => {
    if (!graphRef.current || cleanGraphData.nodes.length <= 1) return;

    const chargeForce = graphRef.current.d3Force("charge");
    if (chargeForce) chargeForce.strength(-650);

    const linkForce = graphRef.current.d3Force("link");
    if (linkForce) linkForce.distance(190);

    graphRef.current.d3ReheatSimulation();

    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit?.(650, 90);
    }, 700);

    return () => clearTimeout(timer);
  }, [cleanGraphData.nodes.length, cleanGraphData.links.length]);

  function clearFocus() {
    setSelectedNodeId(null);
  }

  function handleNodeClick(node) {
    setSelectedNodeId((current) => (current === node.id ? null : node.id));
  }

  function handleLinkClick(link) {
    if (!onDeleteLink) return;

    const relationship = link.relationship || link.label || "LINK";
    const sourceName =
      typeof link.source === "object"
        ? link.source.label || link.source.name || link.source.id
        : link.source;
    const targetName =
      typeof link.target === "object"
        ? link.target.label || link.target.name || link.target.id
        : link.target;

    const ok = window.confirm(
      `Delete relationship ${relationship} between ${sourceName} and ${targetName}?`
    );

    if (ok) {
      onDeleteLink(link);
    }
  }

  if (!cleanGraphData.nodes.length || cleanGraphData.nodes.length <= 1) {
    return (
      <div className="panel">
        <h3>Spider Map</h3>
        <p>No linked intelligence yet.</p>
        <p className="card-detail">
          Create links or accept auto-link suggestions to build the intelligence network.
        </p>
        <p className="card-detail">Time layer: {timeLabel}</p>
      </div>
    );
  }

  return (
    <div className="panel" id="spider-map">
      <div className="details-header">
        <div>
          <h3>Spider Map</h3>
          <p className="card-detail">
            Click a node to highlight its direct network. Unrelated context nodes fade.
            Click entity relationship lines to delete links. Time layer: {timeLabel}.
          </p>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={clearFocus}>
            Clear Focus
          </button>
          <span className="badge">
            {cleanGraphData.nodes.length} nodes / {cleanGraphData.links.length} links
          </span>
        </div>
      </div>

      <div className="legend-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
          • Yellow ring = selected node
        </span>
        <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
          • Blue halo = directly connected
        </span>
        <span className="badge" style={{ background: "#e5e7eb", color: "#374151" }}>
          • Faded = unrelated
        </span>
        <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
          Click node = focus • Click again/background/Clear Focus = reset
        </span>
      </div>

      {selectedNodeId && (
        <p className="card-detail">
          Focus active: showing the selected node, its direct connections, and fading unrelated intelligence.
        </p>
      )}

      <div
        style={{
          height: 620,
          border: "1px solid #ddd",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={cleanGraphData}
          width={1200}
          height={620}
          backgroundColor="#ffffff"
          nodeRelSize={8}
          cooldownTicks={150}
          d3VelocityDecay={0.35}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.16}
          nodeLabel={(node) => `${node.label || node.name || node.id} (${node.entityType || "ENTITY"})`}
          linkLabel={(link) =>
            `${link.relationship || link.label || "LINK"}${
              link.ageLabel ? ` • ${link.ageLabel}` : ""
            }`
          }
          onNodeClick={handleNodeClick}
          onBackgroundClick={clearFocus}
          onLinkClick={handleLinkClick}
          linkColor={(link) => {
            if (!selectedNodeId) return "rgba(75, 85, 99, 0.82)";
            return isLinkConnectedToNode(link, selectedNodeId)
              ? "rgba(31, 41, 55, 0.9)"
              : "rgba(75, 85, 99, 0.12)";
          }}
          linkWidth={(link) => {
            const type = link.relationship || link.type || link.label;

            if (type === "SAME_VEHICLE" || type === "SAME") {
              return selectedNodeId && !isLinkConnectedToNode(link, selectedNodeId) ? 1 : 4;
            }

            if (!selectedNodeId) {
              return link.strength ? Math.max(1.5, Number(link.strength) / 3) : 1.7;
            }

            return isLinkConnectedToNode(link, selectedNodeId) ? 3 : 0.8;
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx, globalScale) => {
            const start = link.source;
            const end = link.target;

            if (!start || !end || typeof start !== "object" || typeof end !== "object") return;

            const isFocused = !selectedNodeId || isLinkConnectedToNode(link, selectedNodeId);
            const text = getShortRelationshipLabel(link.relationship || link.type || link.label);
            const midX = start.x + (end.x - start.x) / 2;
            const midY = start.y + (end.y - start.y) / 2;
            const fontSize = Math.max(5, Math.min(8, 7 / globalScale));
            const yOffset = Math.max(8, 12 / globalScale);

            ctx.save();
            ctx.globalAlpha = isFocused ? 0.95 : 0.16;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(
              midX - textWidth / 2 - 3,
              midY - yOffset - fontSize / 2 - 2,
              textWidth + 6,
              fontSize + 4
            );

            ctx.fillStyle = "#374151";
            ctx.fillText(text, midX, midY - yOffset);
            ctx.restore();
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const rawLabel = node.label || node.name || "Unknown";
            const label = rawLabel.length > 24 ? `${rawLabel.slice(0, 21)}...` : rawLabel;

            const isSelected = selectedNodeId === node.id;
            const isConnected = selectedNodeId ? connectedNodes.has(node.id) : false;

            let opacity = 1;
            if (selectedNodeId) {
              if (isSelected) opacity = 1;
              else if (isConnected) opacity = 0.9;
              else opacity = 0.18;
            }

            const radius = getNodeRadius(node);
            const nodeColor = getNodeColor(node);
            const fontSize = Math.max(
              6,
              Math.min(node.isCenter ? 12 : 9, (node.isCenter ? 10 : 8) / globalScale)
            );

            ctx.save();
            ctx.globalAlpha = opacity;

            if (isConnected && !isSelected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(59, 130, 246, 0.24)";
              ctx.fill();
            }

            if (isSelected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 9, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(250, 204, 21, 0.86)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = nodeColor;
            ctx.fill();
            ctx.lineWidth = node.isCenter || isSelected ? 2 : 1;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const textY = node.y + radius + 4;
            const textWidth = ctx.measureText(label).width;

            ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
            ctx.fillRect(node.x - textWidth / 2 - 3, textY - 1, textWidth + 6, fontSize + 3);

            ctx.fillStyle = "#111827";
            ctx.fillText(label, node.x, textY);

            ctx.restore();
          }}
        />
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-title">People</div>
          <div className="card-value">
            {cleanGraphData.nodes.filter((node) => node.entityType === "PERSON").length}
          </div>
          <div className="card-detail">Person nodes</div>
        </div>

        <div className="card">
          <div className="card-title">Vehicles</div>
          <div className="card-value">
            {cleanGraphData.nodes.filter((node) => node.entityType === "VEHICLE").length}
          </div>
          <div className="card-detail">Vehicle nodes</div>
        </div>

        <div className="card">
          <div className="card-title">Incidents</div>
          <div className="card-value">
            {cleanGraphData.nodes.filter((node) => node.entityType === "INCIDENT").length}
          </div>
          <div className="card-detail">Incident nodes</div>
        </div>

        <div className="card">
          <div className="card-title">Observations</div>
          <div className="card-value">
            {cleanGraphData.nodes.filter((node) => node.entityType === "PATROL_EVENT").length}
          </div>
          <div className="card-detail">Patrol sightings</div>
        </div>
      </div>
    </div>
  );
}
