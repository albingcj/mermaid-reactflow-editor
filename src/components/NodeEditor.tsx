import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  // const [githubUrl, setGithubUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#222222');
  
  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      // setGithubUrl(node.data.githubUrl || '');
      setImageUrl(node.data.imageUrl || '');
      setDescription(node.data.description || '');
      setBackgroundColor(node.style?.backgroundColor || '#ffffff');
      setBorderColor(node.style?.borderColor || '#222222');
    }
  }, [node]);
  
  if (!node) return null;
  
  const handleSave = () => {
    onUpdate(node.id, {
  label,
      // githubUrl,
      imageUrl,
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
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{zIndex: 1050}}>
      <div className="card shadow-lg" style={{minWidth: 350, maxWidth: 500}}>
        <div className="card-body">
          <h5 className="card-title mb-3">Edit {node.type === 'group' ? 'Subgraph' : 'Node'}</h5>
          <form>
            <div className="mb-3">
              <label className="form-label">Label</label>
              <input type="text" className="form-control" value={label} onChange={e => setLabel(e.target.value)} placeholder="Node label" />
            </div>
            {node.type !== 'group' && (
              <>
                <div className="mb-3">
                  <label className="form-label">Image URL</label>
                  <input type="url" className="form-control" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" />
                  <div className="form-text">Use an image URL to display an image as the node content</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={3} />
                </div>
              </>
            )}
            
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={3} />
            </div>
            <div className="mb-3 row g-2 align-items-center">
              <div className="col-auto">
                <label className="form-label mb-0">Background</label>
              </div>
              <div className="col-auto">
                <input type="color" className="form-control form-control-color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} title="Choose background color" />
              </div>
              <div className="col">
                <input type="text" className="form-control" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} placeholder="#ffffff" />
              </div>
            </div>
            <div className="mb-3 row g-2 align-items-center">
              <div className="col-auto">
                <label className="form-label mb-0">Border</label>
              </div>
              <div className="col-auto">
                <input type="color" className="form-control form-control-color" value={borderColor} onChange={e => setBorderColor(e.target.value)} title="Choose border color" />
              </div>
              <div className="col">
                <input type="text" className="form-control" value={borderColor} onChange={e => setBorderColor(e.target.value)} placeholder="#222222" />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" onClick={handleSave} className="btn btn-primary">Save</button>
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
