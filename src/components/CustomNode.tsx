
import React from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

export function CustomNode({ data, isConnectable, selected }: NodeProps) {
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
  
  return (
    <div 
      className={getNodeClassName()}
      onDoubleClick={data.onEdit}
      style={isImageNode && imageAspect ? {
        width: '100%',
        height: '100%',
        aspectRatio: `${imageAspect}`,
        position: 'relative'
      } : { width: '100%', height: '100%', position: 'relative' }}
    >
      {/* User-friendly node resizer with clear visual feedback */}
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
      
      {/* Top handles */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        id="top-target"
        className="handle-top"
      />
      <Handle
        type="source"
        position={Position.Top}
        isConnectable={isConnectable}
        id="top-source"
        className="handle-top"
      />
      
      <div className="node-content">
        {/* {data.githubUrl && (
          <div className="github-icon" onClick={handleClick} title="Open in GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </div>
        )} */}
        
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
      
      {/* Bottom handles */}
      <Handle
        type="target"
        position={Position.Bottom}
        isConnectable={isConnectable}
        id="bottom-target"
        className="handle-bottom"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        id="bottom-source"
        className="handle-bottom"
      />
      
      {/* Left handles */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        id="left-target"
        className="handle-left"
      />
      <Handle
        type="source"
        position={Position.Left}
        isConnectable={isConnectable}
        id="left-source"
        className="handle-left"
      />

      {/* Right handles */}
      <Handle
        type="target"
        position={Position.Right}
        isConnectable={isConnectable}
        id="right-target"
        className="handle-right"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        id="right-source"
        className="handle-right"
      />
    </div>
  );
}
