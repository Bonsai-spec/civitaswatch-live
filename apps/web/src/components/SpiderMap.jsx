import React, { useState, useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function SpiderMap({ graphData, onDeleteLink }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  // ----------------------------------------
  // CONNECTED NODE DETECTION
  // ----------------------------------------
  const getConnectedNodes = (nodeId) => {
    const connected = new Set();

    graphData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      if (sourceId === nodeId) connected.add(targetId);
      if (targetId === nodeId) connected.add(sourceId);
    });

    return connected;
  };

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return null;
    return getConnectedNodes(selectedNode.id);
  }, [selectedNode, graphData]);

  // ----------------------------------------
  // CLICK HANDLERS
  // ----------------------------------------
  const handleNodeClick = (node) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
    }
  };

  const handleBackgroundClick = () => {
    setSelectedNode(null);
  };

  const handleLinkClick = (link) => {
    if (!onDeleteLink) return;

    const confirmDelete = window.confirm("Delete this link?");
    if (!confirmDelete) return;

    onDeleteLink(link);
  };

  // ----------------------------------------
  // NODE RENDERING (WITH FADE + HALO)
  // ----------------------------------------
  const drawNode = (node, ctx, globalScale) => {
    const label = node.name || node.id;

    const isSelected = selectedNode?.id === node.id;
    const isConnected = connectedNodes?.has(node.id);

    let opacity = 1;

    if (selectedNode) {
      if (isSelected) opacity = 1;
      else if (isConnected) opacity = 0.9;
      else opacity = 0.2; // 🔥 FADE FIX
    }

    ctx.globalAlpha = opacity;

    const radius = 6;

    // 🔵 Blue halo (connected)
    if (isConnected && !isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(0, 120, 255, 0.2)";
      ctx.fill();
    }

    // 🟡 Yellow ring (selected)
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(255, 200, 0, 0.6)";
      ctx.fill();
    }

    // 🎯 Core node
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || "#3366cc";
    ctx.fill();

    // 🔤 Label
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.fillStyle = "#333";
    ctx.fillText(label, node.x + 8, node.y + 4);
  };

  // ----------------------------------------
  // LINK STYLING (WITH FADE)
  // ----------------------------------------
  const getLinkColor = (link) => {
    if (!selectedNode) return "#999";

    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    const isConnected =
      sourceId === selectedNode.id || targetId === selectedNode.id;

    return isConnected ? "#333" : "rgba(150,150,150,0.2)";
  };

  const getLinkWidth = (link) => {
    if (!selectedNode) return 1.5;

    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    const isConnected =
      sourceId === selectedNode.id || targetId === selectedNode.id;

    return isConnected ? 2.5 : 1;
  };

  // ----------------------------------------
  // EMPTY STATE
  // ----------------------------------------
  if (!graphData || graphData.nodes.length <= 1) {
    return (
      <div className="panel">
        <h3>Spider Map</h3>
        <p>No linked intelligence yet.</p>
      </div>
    );
  }

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div className="panel">
      <div className="details-header">
        <h3>Spider Map</h3>
        <button onClick={() => setSelectedNode(null)}>
          Clear Focus
        </button>
      </div>

      <p className="card-detail">
        Click node to focus. Click link to delete.
      </p>

      <div style={{ height: "500px" }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={drawNode}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          onLinkClick={handleLinkClick}
        />
      </div>
    </div>
  );
}