import React, { useEffect, useState, useMemo, memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

interface CustomNodeData {
  label: string;
  description?: string;
  imageUrl?: string;
  shape?: 'rect' | 'circle' | 'diamond';
  style?: React.CSSProperties;
  isDragging?: boolean;
  locked?: boolean;
  onEdit?: () => void;
}

interface CustomNodeProps extends NodeProps {
  data: CustomNodeData;
}

const HANDLE_STYLES = {
  backgroundColor: '#2563eb',
  border: '2px solid white',
  width: 10,
  height: 10,
  borderRadius: '2px',
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

function CustomNodeInner(props: CustomNodeProps) {
  const { data, isConnectable, selected } = props;
  const style = (props as any).style as React.CSSProperties | undefined;
  
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  
  const isImageNode = useMemo(() => 
    Boolean(data.imageUrl?.trim()), 
    [data.imageUrl]
  );

  // Load image and calculate aspect ratio
  useEffect(() => {
    if (!isImageNode) {
      setImageAspect(null);
      return;
    }

    const img = new Image();
    img.onload = () => setImageAspect(img.naturalWidth / img.naturalHeight);
    img.onerror = () => setImageAspect(null);
    img.src = data.imageUrl!;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [data.imageUrl, isImageNode]);

  // Memoize class name calculation
  const nodeClassName = useMemo(() => {
    const classes = ['custom-node', `shape-${data.shape || 'rect'}`];
    
    if (data.imageUrl) classes.push('has-image');
    if (data.shape === 'diamond') classes.push('diamond-node');
    if (selected) classes.push('selected');
    if (data.locked) classes.push('locked');
    
    return classes.join(' ');
  }, [data.shape, data.imageUrl, data.locked, selected]);

  // Memoize merged styles
  const mergedStyle = useMemo<React.CSSProperties>(() => ({
    width: '100%',
    height: '100%',
    position: 'relative',
    ...(style || {}),
    ...(data?.style || {}),
    ...(isImageNode && imageAspect ? { aspectRatio: `${imageAspect}` } : {}),
  }), [style, data?.style, isImageNode, imageAspect]);

  // Render multiline labels
  const renderLabel = (label: string) => {
    if (!label.includes('\n')) return label;
    
    return label.split('\n').map((line, index) => (
      <div key={index}>{line}</div>
    ));
  };

  // Handle component for connection points
  const ConnectionHandle = ({ 
    type, 
    position, 
    id 
  }: { 
    type: 'source' | 'target'; 
    position: Position; 
    id: string; 
  }) => (
    <Handle
      type={type}
      position={position}
      isConnectable={isConnectable}
      id={id}
      className={`handle-${position.toLowerCase()}`}
      style={{
        left: position === Position.Left ? 0 : position === Position.Right ? undefined : '50%',
        right: position === Position.Right ? 0 : undefined,
        top: position === Position.Top ? 0 : position === Position.Bottom ? undefined : '50%',
        bottom: position === Position.Bottom ? 0 : undefined,
        transform: 
          position === Position.Top ? 'translate(-50%, -50%)' :
          position === Position.Bottom ? 'translate(-50%, 50%)' :
          position === Position.Left ? 'translate(-50%, -50%)' :
          'translate(50%, -50%)',
      }}
    />
  );

  return (
    <div 
      className={nodeClassName}
      onDoubleClick={data.onEdit}
      style={mergedStyle}
    >
      {/* Node Resizer with enhanced corner handles */}
      {!data.isDragging && (
        <NodeResizer 
          isVisible={selected}
          minWidth={isImageNode ? 60 : 40}
          minHeight={isImageNode ? 60 : 30}
          maxWidth={500}
          maxHeight={400}
          keepAspectRatio={data.shape === 'circle' || isImageNode}
          handleStyle={RESIZER_STYLES.handle}
          lineStyle={RESIZER_STYLES.line}
        />
      )}
      
      {/* Connection Handles - only render when not dragging */}
      {!data.isDragging && (
        <>
          {/* Top handles */}
          <ConnectionHandle type="target" position={Position.Top} id="top-target" />
          <ConnectionHandle type="source" position={Position.Top} id="top-source" />
          
          {/* Bottom handles */}
          <ConnectionHandle type="target" position={Position.Bottom} id="bottom-target" />
          <ConnectionHandle type="source" position={Position.Bottom} id="bottom-source" />
          
          {/* Left handles */}
          <ConnectionHandle type="target" position={Position.Left} id="left-target" />
          <ConnectionHandle type="source" position={Position.Left} id="left-source" />
          
          {/* Right handles */}
          <ConnectionHandle type="target" position={Position.Right} id="right-target" />
          <ConnectionHandle type="source" position={Position.Right} id="right-source" />
        </>
      )}
      
      {/* Node Content */}
      <div className="node-content">
        {isImageNode ? (
          <>
            <div className="node-image-container">
              <img 
                src={data.imageUrl} 
                alt={data.label || 'Node image'} 
                className="node-image"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block',
                  background: 'transparent',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div 
                className="image-fallback" 
                style={{ 
                  display: 'none', 
                  width: '100%', 
                  height: '100%', 
                  background: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div className="node-label" style={{ fontSize: '10px' }}>
                  {renderLabel(data.label)}
                </div>
              </div>
            </div>
            {data.label?.trim() && (
              <div className="image-caption" title={data.label}>
                {data.label}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="node-label">
              {renderLabel(data.label)}
            </div>
            {data.description && (
              <div className="node-description" title={data.description}>
                {data.description}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const CustomNode = memo(CustomNodeInner);