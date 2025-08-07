import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#222222');
  
  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setGithubUrl(node.data.githubUrl || '');
      setDescription(node.data.description || '');
      setBackgroundColor(node.style?.backgroundColor || '#ffffff');
      setBorderColor(node.style?.borderColor || '#222222');
    }
  }, [node]);
  
  if (!node) return null;
  
  const handleSave = () => {
    onUpdate(node.id, {
      label,
      githubUrl,
      description,
      style: {
        ...node.style,
        backgroundColor,
        borderColor,
        border: `2px solid ${borderColor}`,
      }
    });
    onClose();
  };
  
  return (
    <div className="node-editor-overlay">
      <div className="node-editor">
        <h3>Edit Node</h3>
        
        <div className="form-group">
          <label>Label:</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Node label"
          />
        </div>
        
        <div className="form-group">
          <label>GitHub URL:</label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label>Background Color:</label>
          <div className="color-input">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Border Color:</label>
          <div className="color-input">
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
            />
            <input
              type="text"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              placeholder="#222222"
            />
          </div>
        </div>
        
        <div className="button-group">
          <button onClick={handleSave} className="save-btn">Save</button>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
}