import React from "react";
import { NodeProps, Handle, Position, NodeResizer } from "reactflow";

export function SubgraphNode({ data, selected, isConnectable }: NodeProps) {
  return (
    <div className={`subgraph-node ${selected ? "selected" : ""}`}>
      {/* Add NodeResizer for manual resizing */}
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={150}
        handleStyle={{
          backgroundColor: '#1976D2',
          border: '2px solid white',
          width: 8,
          height: 8,
        }}
        lineStyle={{
          borderColor: '#1976D2',
          borderWidth: 2,
        }}
      />
      
      {/* Bottom handles */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="subgraph-bottom-target"
        style={{
          background: "#555",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          bottom: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="subgraph-bottom-source"
        style={{
          background: "#1976D2",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          bottom: -20,
          zIndex: 11,
        }}
        isConnectable={isConnectable}
      />

      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>

      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>

      {/* Left handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="subgraph-left-target"
        style={{
          background: "#555",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          left: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="subgraph-left-source"
        style={{
          background: "#1976D2",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          left: -20,
          zIndex: 11,
        }}
        isConnectable={isConnectable}
      />
      

      {/* Left handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="subgraph-left-source"
        style={{
          background: "#1976D2",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          left: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="subgraph-left-target"
        style={{
          background: "#555",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          left: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
      

      {/* Right handles */}
      <Handle
        type="target"
        position={Position.Right}
        id="subgraph-right-target"
        style={{
          background: "#555",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          right: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="subgraph-right-source"
        style={{
          background: "#1976D2",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid white",
          right: -20,
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
    </div>
  );
}
