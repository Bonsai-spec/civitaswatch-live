import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { getIntelTimeFilterLabel, getRecordTimestamp, parseIntelDate } from "../../utils/date.utils";
import { buildIntelGraph } from "./graph.utils";
import {
  getGraphNodeColor,
  getShortRelationshipLabel,
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

export default function IntelSpiderGraph({ entity, allEntities = [], onOpenEntity, timeFilter, onDeleteLink }) {
  const graphRef = useRef(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const graphData = useMemo(
    () => buildIntelGraph(entity, timeFilter, allEntities, isWithinIntelTimeFilter),
    [entity, timeFilter, allEntities]
  );

  const focusNetwork = useMemo(() => {
    if (!focusedNodeId) {
      return {
        focusedNodeIds: new Set(),
        focusedLinkKeys: new Set(),
      };
    }

    const focusedNodeIds = new Set([focusedNodeId]);
    const focusedLinkKeys = new Set();

    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      if (sourceId === focusedNodeId || targetId === focusedNodeId) {
        focusedNodeIds.add(sourceId);
        focusedNodeIds.add(targetId);
        focusedLinkKeys.add(`${sourceId}->${targetId}`);
      }
    });

    return {
      focusedNodeIds,
      focusedLinkKeys,
    };
  }, [focusedNodeId, graphData.links]);

  function getLinkKey(link) {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    return `${sourceId}->${targetId}`;
  }

  function getNodeOpacity(node) {
    if (!focusedNodeId) return 1;
    if (node.id === focusedNodeId) return 1;
    if (focusNetwork.focusedNodeIds.has(node.id)) return 0.75;
    return 0.05;
  }

  function getLinkOpacity(link) {
    const baseOpacity = link.opacity || 0.8;
    if (!focusedNodeId) return baseOpacity;
    if (focusNetwork.focusedLinkKeys.has(getLinkKey(link))) return 0.95;
    return 0.05;
  }

  function isFocusedNode(node) {
    return Boolean(focusedNodeId && node.id === focusedNodeId);
  }

  useEffect(() => {
    if (!graphRef.current || !entity || graphData.nodes.length <= 1) return;

    const chargeForce = graphRef.current.d3Force("charge");
    if (chargeForce) chargeForce.strength(-990);

    const linkForce = graphRef.current.d3Force("link");
    if (linkForce) linkForce.distance(220);

    graphRef.current.d3ReheatSimulation();

    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit?.(600, 90);
    }, 700);

    return () => clearTimeout(timer);
  }, [entity?.id, graphData.nodes.length, graphData.links.length]);

  useEffect(() => {
    setFocusedNodeId(null);
  }, [entity?.id, timeFilter?.preset, timeFilter?.from, timeFilter?.to]);

  if (!entity) return null;

  if (graphData.nodes.length <= 1) {
    return (
      <div className="panel">
        <h3>Spider Map</h3>
        <p>No linked entities, incidents or patrol observations yet.</p>
        <p className="card-detail">Create links below to build the intelligence network.</p>
        <p className="card-detail">Time layer: {getIntelTimeFilterLabel(timeFilter)}</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="details-header">
        <div>
          <h3>Spider Map</h3>
          <p className="card-detail">
            Click a node to highlight its direct network. Unrelated context nodes fade. Click entity relationship lines to delete links. Time layer: {getIntelTimeFilterLabel(timeFilter)}.
          </p>
        </div>
        <div className="action-row">
          <button
            className={focusedNodeId ? "secondary-btn" : "secondary-btn"}
            disabled={!focusedNodeId}
            onClick={() => setFocusedNodeId(null)}
            title={focusedNodeId ? "Clear selected node focus" : "No focused node selected"}
          >
            Clear Focus
          </button>
          <span className="badge">{graphData.nodes.length} nodes / {graphData.links.length} links</span>
        </div>
      </div>

      <div className="action-row" style={{ marginBottom: 12, gap: 14, flexWrap: "wrap" }}>
        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
          ● Yellow ring = selected node
        </span>
        <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
          ● Blue halo = directly connected
        </span>
        <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>
          ● Faded = unrelated
        </span>
        <span className="badge">
          Click node = focus • Click again/background/Clear Focus = reset
        </span>
      </div>

      {focusedNodeId && (
        <p className="card-detail" style={{ marginTop: -4, marginBottom: 12 }}>
          Focus active: showing the selected node, its direct connections, and fading unrelated intelligence.
        </p>
      )}

      <div style={{ height: 620, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={1200}
          height={620}
          backgroundColor="#ffffff"
          nodeRelSize={8}
          nodeVal={(node) => (node.isCenter ? 12 : 6)}
          cooldownTicks={140}
          d3VelocityDecay={0.35}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.16}
          linkColor={(link) => `rgba(75, 85, 99, ${getLinkOpacity(link)})`}
          linkLabel={(link) => `${link.label || "LINKED_TO"} • ${link.ageLabel || "No date"}`}
          nodeLabel={(node) => `${node.label} (${node.entityType})`}
          nodeColor={getGraphNodeColor}
          linkWidth={(link) => {
            const normalWidth = link.strength ? Math.max(1.5, Number(link.strength) / 3) : 1.5;
            return focusedNodeId && focusNetwork.focusedLinkKeys.has(getLinkKey(link))
              ? normalWidth + 1.5
              : normalWidth;
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx, globalScale) => {
            const start = link.source;
            const end = link.target;
            if (!start || !end || typeof start !== "object" || typeof end !== "object") return;

            const linkOpacity = getLinkOpacity(link);
            if (linkOpacity < 0.15) return;

            const text = getShortRelationshipLabel(link.label);
            const midX = start.x + (end.x - start.x) / 2;
            const midY = start.y + (end.y - start.y) / 2;
            const fontSize = Math.max(5, Math.min(8, 7 / globalScale));
            const yOffset = Math.max(8, 12 / globalScale);

            ctx.save();
            ctx.globalAlpha = linkOpacity;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(midX - textWidth / 2 - 3, midY - yOffset - fontSize / 2 - 2, textWidth + 6, fontSize + 4);
            ctx.fillStyle = "rgba(31, 41, 55, 0.95)";
            ctx.fillText(text, midX, midY - yOffset);
            ctx.restore();
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const rawLabel = node.label || node.name || "Unknown";
            const label = rawLabel.length > 24 ? `${rawLabel.slice(0, 21)}...` : rawLabel;
            const radius = node.isCenter ? 11 : 7;
            const opacity = getNodeOpacity(node);
            const focused = isFocusedNode(node);
            const connected = Boolean(focusedNodeId && focusNetwork.focusedNodeIds.has(node.id));
            const fontSize = Math.max(6, Math.min(node.isCenter ? 13 : 10, (node.isCenter ? 10 : 8) / globalScale));

            ctx.save();
            ctx.globalAlpha = opacity;

            if (focused) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
              ctx.fill();
            } else if (connected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(147, 197, 253, 0.65)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = getGraphNodeColor(node);
            ctx.fill();
            ctx.lineWidth = focused ? 3 : node.isCenter ? 2 : 1;
            ctx.strokeStyle = focused ? "#facc15" : connected ? "#60a5fa" : "#ffffff";
            ctx.stroke();

            if (globalScale < 0.45 && !focused && !connected) {
              ctx.restore();
              return;
            }

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const textY = node.y + radius + 4;
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(node.x - textWidth / 2 - 3, textY - 1, textWidth + 6, fontSize + 3);
            ctx.fillStyle = focused ? "#111827" : connected ? "#1f2937" : "#374151";
            ctx.fillText(label, node.x, textY);
            ctx.restore();
          }}
          onNodeClick={(node) => {
            // Node click is focus-only. Use the Open Linked Profile buttons to change profiles.
            setFocusedNodeId((current) => (current === node.id ? null : node.id));
          }}
          onLinkClick={(link) => {
            const sourceObject = link?.sourceObject;

            if (!sourceObject?.id || !sourceObject?.fromEntityId || !sourceObject?.toEntityId) {
              alert("Only entity-to-entity links can be deleted from the Spider Map.");
              return;
            }

            if (typeof onDeleteLink === "function") {
              onDeleteLink(sourceObject);
            }
          }}
          onBackgroundClick={() => setFocusedNodeId(null)}
        />
      </div>

      <div className="cards">
        <div className="card"><div className="card-title">People</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "PERSON").length}</div><div className="card-detail">Person nodes</div></div>
        <div className="card"><div className="card-title">Vehicles</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "VEHICLE").length}</div><div className="card-detail">Vehicle nodes</div></div>
        <div className="card"><div className="card-title">Incidents</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "INCIDENT").length}</div><div className="card-detail">Incident nodes</div></div>
        <div className="card"><div className="card-title">Observations</div><div className="card-value">{graphData.nodes.filter((node) => node.entityType === "PATROL_EVENT").length}</div><div className="card-detail">Patrol sightings</div></div>
      </div>
    </div>
  );
}
