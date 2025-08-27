import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageValid, setImageValid] = useState<boolean | null>(null);
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#222222');

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setImageUrl(node.data.imageUrl || '');
      setDescription(node.data.description || '');
      setBackgroundColor(node.style?.backgroundColor || '#ffffff');
      setBorderColor(node.style?.borderColor || '#222222');
    }
  }, [node]);

  // Validate image URL and update preview status
  useEffect(() => {
    if (!imageUrl) {
      setImageValid(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setImageValid(true); };
    img.onerror = () => { if (!cancelled) setImageValid(false); };
    img.src = imageUrl;

    return () => { cancelled = true; };
  }, [imageUrl]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate(node.id, {
      label,
      imageUrl,
      description,
      style: {
        ...node.style,
        backgroundColor,
        borderColor,
        border: `2px solid ${borderColor}`,
      },
    });
    onClose();
  };

  return (
    <Dialog open={!!node} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {node.type === 'group' ? 'Subgraph' : 'Node'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm mb-1">Label</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Node label" />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col" style={{ flex: '1 1 65%', minWidth: 0 }}>
              <label className="block text-sm mb-1">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="h-40 resize-none overflow-y-auto custom-scrollbar"
                style={{ resize: 'none' }}
              />
            </div>

            {node.type !== 'group' && (
              <div className="flex flex-col items-start" style={{ width: '260px', minWidth: 160 }}>
                <label className="block text-sm mb-1">Image URL</label>
                <Input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" />
                <div className="mt-2">
                  {imageValid === true ? (
                    <img src={imageUrl} alt="Preview" className="h-28 w-28 rounded-md object-cover border" />
                  ) : imageValid === false && imageUrl ? (
                    <div className="h-28 w-28 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">Invalid image</div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm">Background</label>
              <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} title="Choose background color" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Border</label>
              <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} title="Choose border color" />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
