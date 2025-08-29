import React from 'react';
import { NodeProps, Handle, Position, NodeResizer } from 'reactflow';

function SubgraphNodeInner({ data, selected, isConnectable }: NodeProps) {
  return (
    <div className={`subgraph-node ${selected ? 'selected' : ''}`}>
      {/* Top handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="top-target"
            style={{
              background: '#555',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              top: -20,
              zIndex: 10,
            }}
            isConnectable={isConnectable}
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top-source"
            style={{
              background: '#1976D2',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              top: -20,
              zIndex: 11,
            }}
            isConnectable={isConnectable}
          />
        </>
      )}

      {/* NodeResizer for manual resizing; hidden while dragging */}
      {!data.isDragging && (
        <NodeResizer
          isVisible={selected}
          minWidth={40}
          minHeight={30}
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
      )}

      {/* Bottom handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-target"
            style={{
              background: '#555',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              bottom: -20,
              zIndex: 10,
            }}
            isConnectable={isConnectable}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-source"
            style={{
              background: '#1976D2',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              bottom: -20,
              zIndex: 11,
            }}
            isConnectable={isConnectable}
          />
        </>
      )}

      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>

      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>

      {/* Left handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            style={{
              background: '#555',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              left: -20,
              zIndex: 10,
            }}
            isConnectable={isConnectable}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left-source"
            style={{
              background: '#1976D2',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              left: -20,
              zIndex: 11,
            }}
            isConnectable={isConnectable}
          />
        </>
      )}

      {/* Right handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            style={{
              background: '#555',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              right: -20,
              zIndex: 10,
            }}
            isConnectable={isConnectable}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            style={{
              background: '#1976D2',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              right: -20,
              zIndex: 11,
            }}
            isConnectable={isConnectable}
          />
        </>
      )}
    </div>
  );
}

export const SubgraphNode = React.memo(SubgraphNodeInner);
