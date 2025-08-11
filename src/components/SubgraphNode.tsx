import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

export function SubgraphNode({ data, selected }: NodeProps) {
  return (
    <div className={`subgraph-node ${selected ? 'selected' : ''}`}>
      {/* Top handles */}
      <div className="handle-group top-handles">
        <Handle
          type="target"
          position={Position.Top}
          id="subgraph-top-target"
          className="handle target-handle"
          style={{ left: '35%' }}
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Top}
          id="subgraph-top-source"
          className="handle source-handle"
          style={{ left: '65%' }}
          isConnectable={true}
        />
      </div>
      
      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>
      
      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z"/>
        </svg>
      </div>
      
      {/* Bottom handles */}
      <div className="handle-group bottom-handles">
        <Handle
          type="source"
          position={Position.Bottom}
          id="subgraph-bottom-source"
          className="handle source-handle"
          style={{ left: '35%' }}
          isConnectable={true}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="subgraph-bottom-target"
          className="handle target-handle"
          style={{ left: '65%' }}
          isConnectable={true}
        />
      </div>
      
      {/* Left handles */}
      <div className="handle-group left-handles">
        <Handle
          type="source"
          position={Position.Left}
          id="subgraph-left-source"
          className="handle source-handle"
          style={{ top: '35%' }}
          isConnectable={true}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="subgraph-left-target"
          className="handle target-handle"
          style={{ top: '65%' }}
          isConnectable={true}
        />
      </div>
      
      {/* Right handles */}
      <div className="handle-group right-handles">
        <Handle
          type="target"
          position={Position.Right}
          id="subgraph-right-target"
          className="handle target-handle"
          style={{ top: '35%' }}
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="subgraph-right-source"
          className="handle source-handle"
          style={{ top: '65%' }}
          isConnectable={true}
        />
      </div>
    </div>
  );
}
