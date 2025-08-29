import React from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

function CustomNodeInner(props: NodeProps) {
  const { data, isConnectable, selected } = props;
  // style isn't declared on NodeProps in the reactflow types used here, so read it dynamically
  const style = (props as any).style as React.CSSProperties | undefined;
  // const handleClick = () => {
  //   if (data.githubUrl) {
  //     window.open(data.githubUrl, '_blank');
  //   }
  // };
  
  const renderLabel = (label: string) => {
    if (label.includes('\n')) {
      return label.split('\n').map((line, index) => (
        <div key={index}>{line}</div>
      ));
    }
    return label;
  };
  
  const getNodeClassName = () => {
    let className = `custom-node shape-${data.shape || 'rect'}`;
    // if (data.githubUrl) className += ' has-link';
    if (data.imageUrl) className += ' has-image';
    if (data.shape === 'diamond') className += ' diamond-node';
    if (selected) className += ' selected';
  if (data.locked) className += ' locked';
    return className;
  };

  const isImageNode = data.imageUrl && data.imageUrl.trim() !== '';
  const [imageAspect, setImageAspect] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isImageNode) {
      const img = new window.Image();
      img.onload = () => {
        setImageAspect(img.naturalWidth / img.naturalHeight);
      };
      img.src = data.imageUrl;
    } else {
      setImageAspect(null);
    }
  }, [data.imageUrl, isImageNode]);
  
  // Merge any node-level style (React Flow node.style) and data.style with defaults.
  // Many code paths set styles on the top-level node (node.style) while others use data.style.
  // Ensure we respect both so dropped nodes and converter-generated nodes render identically.
  const mergedStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    ...(style || {}),
    ...(data?.style || {}),
  };

  // Split merged style into visual vs layout props. We prefer visual styles provided in
  // `data.style` (converter/editor) and apply them to the inner `.custom-node` element
  // so the class-based defaults are overridden correctly. Layout-only props stay on
  // the wrapper via node.style (React Flow handles wrapper styles separately).
  const mergedAny = mergedStyle as any;
  const visualKeys = ['background', 'backgroundColor', 'border', 'borderColor', 'borderRadius', 'boxShadow', 'outline'];
  const visualStyle: Record<string, any> = {};
  const layoutOnlyStyle: Record<string, any> = { ...mergedAny };
  visualKeys.forEach((k) => {
    if (mergedAny[k] !== undefined) {
      visualStyle[k] = mergedAny[k];
      delete layoutOnlyStyle[k];
    }
  });

  return (
    <div 
      className={getNodeClassName()}
      onDoubleClick={data.onEdit}
    style={isImageNode && imageAspect ? { ...layoutOnlyStyle, ...visualStyle, aspectRatio: `${imageAspect}` } : { ...layoutOnlyStyle, ...visualStyle }}
    >
      {/* User-friendly node resizer with clear visual feedback */}
      {!data.isDragging && (
        <NodeResizer 
          isVisible={selected}
          minWidth={isImageNode ? 60 : 40}
          minHeight={isImageNode ? 60 : 30}
          maxWidth={500}
          maxHeight={400}
          keepAspectRatio={data.shape === 'circle' || isImageNode}
          handleStyle={{
            backgroundColor: '#2563eb',
            border: '2px solid white',
            width: 10,
            height: 10,
            borderRadius: '2px',
          }}
          lineStyle={{
            borderColor: '#2563eb',
            borderWidth: 2,
          }}
        />
      )}
      
      {/* Top handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            isConnectable={isConnectable}
            id="top-target"
            className="handle-top"
            style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}
          />
          <Handle
            type="source"
            position={Position.Top}
            isConnectable={isConnectable}
            id="top-source"
            className="handle-top"
            style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}
          />
        </>
      )}
      
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
                  // Fallback to text label if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="image-fallback" style={{ display: 'none', width: '100%', height: '100%', background: 'transparent' }}>
                <div className="node-label" style={{ fontSize: '10px' }}>
                  {renderLabel(data.label)}
                </div>
              </div>
            </div>
            {data.label && data.label.trim() !== '' && (
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

  {/* Locked styling is applied via the .locked class and CSS in App.css to avoid extra DOM elements that would appear in exported images */}
      
      {/* Bottom handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Bottom}
            isConnectable={isConnectable}
            id="bottom-target"
            className="handle-bottom"
            style={{ left: '50%', bottom: 0, transform: 'translate(-50%, 50%)' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            isConnectable={isConnectable}
            id="bottom-source"
            className="handle-bottom"
            style={{ left: '50%', bottom: 0, transform: 'translate(-50%, 50%)' }}
          />
        </>
      )}
      
      {/* Left handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            isConnectable={isConnectable}
            id="left-target"
            className="handle-left"
            style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
          />
          <Handle
            type="source"
            position={Position.Left}
            isConnectable={isConnectable}
            id="left-source"
            className="handle-left"
            style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
          />
        </>
      )}

      {/* Right handles */}
      {!data.isDragging && (
        <>
          <Handle
            type="target"
            position={Position.Right}
            isConnectable={isConnectable}
            id="right-target"
            className="handle-right"
            style={{ top: '50%', right: 0, transform: 'translate(50%, -50%)' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            id="right-source"
            className="handle-right"
            style={{ top: '50%', right: 0, transform: 'translate(50%, -50%)' }}
          />
        </>
      )}
    </div>
  );
}

export const CustomNode = React.memo(CustomNodeInner);