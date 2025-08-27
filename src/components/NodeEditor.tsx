import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  // Render modal via portal to avoid nesting inside transformed/zoomed containers
  const modal = (
    <div
      onClick={(e) => { e.stopPropagation(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* backdrop placed before content so it stays visually behind the dialog */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1040 }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 350, maxWidth: 500, background: 'var(--card)', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.2)', padding: 16, zIndex: 1051 }}
      >
        <div style={{ marginBottom: 12 }}>
          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Edit {node.type === 'group' ? 'Subgraph' : 'Node'}</h5>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Label</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Node label" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
          </div>

          {node.type !== 'group' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Image URL</label>
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>Use an image URL to display an image as the node content</div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={3} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12 }}>Background</label>
              <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} title="Choose background color" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12 }}>Border</label>
              <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} title="Choose border color" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none' }}>Save</button>
            <button type="button" onClick={onClose} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: 'transparent' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  try {
    return ReactDOM.createPortal(modal, document.body);
  } catch (e) {
    // If portal fails (SSR or other), fall back to inline render
    return modal;
  }
}
