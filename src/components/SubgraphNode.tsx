import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

export function SubgraphNode({ data, selected }: NodeProps) {
  return (
    <div className={`subgraph-node ${selected ? 'selected' : ''}`}>
      {/* Add connection handles to the subgraph container */}
      <Handle
        type="target"
        position={Position.Top}
        id="subgraph-top"
        style={{
          background: '#555',
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '2px solid white',
          top: -20,
          zIndex: 10,
        }}
        isConnectable={true}
      />
      
      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>
      
      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z"/>
        </svg>
      </div>
      
      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="subgraph-bottom"
        style={{
          background: '#555',
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '2px solid white',
          bottom: -20,
          zIndex: 10,
        }}
        isConnectable={true}
      />
      
      {/* Left handle */}
      <Handle
        type="source"
        position={Position.Left}
        id="subgraph-left"
        style={{
          background: '#555',
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '2px solid white',
          left: -20,
          zIndex: 10,
        }}
        isConnectable={true}
      />
      
      {/* Right handle */}
      <Handle
        type="target"
        position={Position.Right}
        id="subgraph-right"
        style={{
          background: '#555',
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '2px solid white',
          right: -20,
          zIndex: 10,
        }}
        isConnectable={true}
      />
    </div>
  );
}
