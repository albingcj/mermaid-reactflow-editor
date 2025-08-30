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
    background: '#64748b',
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '2px solid white',
    zIndex: 10,
    opacity: 0.8,
  },
  source: {
    background: '#2563eb',
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '2px solid white',
    zIndex: 11,
    opacity: 0.8,
  },
};

const RESIZER_STYLES = {
  handle: {
    backgroundColor: '#2563eb',
    border: '2px solid white',
    width: 12,
    height: 12,
    borderRadius: '3px',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
  },
  line: {
    borderColor: '#2563eb',
    borderWidth: 2,
    opacity: 0.6,
  },
};

// Reusable handle component with enhanced UX
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
    const offset = 18;
    
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
      className="subgraph-connection-handle"
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
    <div className={nodeClassName} title={selected ? "Drag corners to resize in any direction" : undefined}>
      {/* Node Resizer with enhanced corner handles */}
      {!data.isDragging && (
        <NodeResizer
          isVisible={selected}
          minWidth={60}
          minHeight={40}
          maxWidth={600}
          maxHeight={500}
          handleStyle={RESIZER_STYLES.handle}
          lineStyle={RESIZER_STYLES.line}
        />
      )}

      {/* Connection Handles - slightly reduced opacity when selected */}
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