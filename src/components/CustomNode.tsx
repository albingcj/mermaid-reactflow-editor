import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export function CustomNode({ data, isConnectable }: NodeProps) {
  const handleClick = () => {
    if (data.githubUrl) {
      window.open(data.githubUrl, '_blank');
    }
  };
  
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
    if (data.githubUrl) className += ' has-link';
    if (data.shape === 'diamond') className += ' diamond-node';
    return className;
  };
  
  return (
    <div 
      className={getNodeClassName()}
      onDoubleClick={data.onEdit}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ visibility: data.shape === 'diamond' ? 'hidden' : 'visible' }}
      />
      
      <div className="node-content">
        {data.githubUrl && (
          <div className="github-icon" onClick={handleClick} title="Open in GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </div>
        )}
        <div className="node-label">
          {renderLabel(data.label)}
        </div>
        {data.description && (
          <div className="node-description" title={data.description}>
            {data.description}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ visibility: data.shape === 'diamond' ? 'hidden' : 'visible' }}
      />
    </div>
  );
}