import React from 'react';
import { NodeProps } from 'reactflow';

export function SubgraphNode({ data, selected }: NodeProps) {
  return (
    <div className={`subgraph-node ${selected ? 'selected' : ''}`}>
      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>
      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z"/>
        </svg>
      </div>
    </div>
  );
}
