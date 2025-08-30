import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, NodeResizer } from 'reactflow';

interface SubgraphNodeData {
  label: string;
  isDragging?: boolean;
}

interface SubgraphNodeProps extends NodeProps {
  data: SubgraphNodeData;
}

const HANDLE_STYLES = {
  target: {
    background: '#555',
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid white',
    zIndex: 10,
  },
  source: {
    background: '#1976D2',
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid white',
    zIndex: 11,
  },
};

const RESIZER_STYLES = {
  handle: {
    backgroundColor: '#1976D2',
    border: '2px solid white',
    width: 8,
    height: 8,
    borderRadius: '2px',
  },
  line: {
    borderColor: '#1976D2',
    borderWidth: 2,
  },
};

// Custom resize handle component that only shows corner handles
const CornerResizeHandle = ({ position }: { position: string }) => {
  const isCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(position);
  
  if (!isCorner) return null;
  
  return (
    <div
      style={{
        ...RESIZER_STYLES.handle,
        position: 'absolute',
        zIndex: 20,
      }}
    />
  );
};

// Reusable handle component
const ConnectionHandle = ({ 
  type, 
  position, 
  id 
}: { 
  type: 'source' | 'target'; 
  position: Position; 
  id: string; 
}) => {
  const positionStyles = useMemo(() => {
    const offset = 20;
    
    switch (position) {
      case Position.Top:
        return { top: -offset };
      case Position.Bottom:
        return { bottom: -offset };
      case Position.Left:
        return { left: -offset };
      case Position.Right:
        return { right: -offset };
      default:
        return {};
    }
  }, [position]);

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...HANDLE_STYLES[type],
        ...positionStyles,
      }}
      isConnectable={true}
    />
  );
};

function SubgraphNodeInner({ data, selected, isConnectable }: SubgraphNodeProps) {
  const nodeClassName = useMemo(() => 
    `subgraph-node ${selected ? 'selected' : ''}`, 
    [selected]
  );

  const handlePositions = useMemo(() => [
    { type: 'target' as const, position: Position.Top, id: 'top-target' },
    { type: 'source' as const, position: Position.Top, id: 'top-source' },
    { type: 'target' as const, position: Position.Bottom, id: 'bottom-target' },
    { type: 'source' as const, position: Position.Bottom, id: 'bottom-source' },
    { type: 'target' as const, position: Position.Left, id: 'left-target' },
    { type: 'source' as const, position: Position.Left, id: 'left-source' },
    { type: 'target' as const, position: Position.Right, id: 'right-target' },
    { type: 'source' as const, position: Position.Right, id: 'right-source' },
  ], []);

  return (
    <div className={nodeClassName}>
      {/* Node Resizer with only corner handles */}
      {!data.isDragging && (
        <NodeResizer
          isVisible={selected}
          minWidth={40}
          minHeight={30}
          maxWidth={500}
          maxHeight={400}
          handleComponent={CornerResizeHandle}
          handleStyle={RESIZER_STYLES.handle}
          lineStyle={RESIZER_STYLES.line}
        />
      )}

      {/* Connection Handles */}
      {!data.isDragging && isConnectable && 
        handlePositions.map(({ type, position, id }) => (
          <ConnectionHandle
            key={id}
            type={type}
            position={position}
            id={id}
          />
        ))
      }

      {/* Header */}
      <div className="subgraph-header">
        <div className="subgraph-title">{data.label}</div>
      </div>

      {/* Drag Handle Icon */}
      <div className="subgraph-drag-handle" title="Drag to move container">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>
    </div>
  );
}

export const SubgraphNode = memo(SubgraphNodeInner);