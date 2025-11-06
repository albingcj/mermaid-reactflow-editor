import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';

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
  const [iconColor, setIconColor] = useState('#000000');

  // Accordion states
  const [labelOpen, setLabelOpen] = useState(true);
  const [descOpen, setDescOpen] = useState(true);
  const [imageOpen, setImageOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setImageUrl(node.data.imageUrl || '');
      setDescription(node.data.description || '');
  setBackgroundColor(node.data?.style?.backgroundColor || node.style?.backgroundColor || '#ffffff');
  setBorderColor(node.data?.style?.borderColor || node.style?.borderColor || '#222222');
  setIconColor(node.data?.style?.iconColor || node.data?.iconColor || '#000000');
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
        ...(node.data?.style || {}),
        backgroundColor,
        borderColor,
  iconColor,
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
          {/* Label */}
          <Collapsible open={labelOpen} onOpenChange={(v) => setLabelOpen(v)}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left py-2 font-medium">Label</button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2">
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Node label" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Description */}
          <Collapsible open={descOpen} onOpenChange={(v) => setDescOpen(v)}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left py-2 font-medium">Description</button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2">
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="h-40 resize-none overflow-y-auto custom-scrollbar"
                  style={{ resize: 'none' }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Image / Icon */}
          {node.type !== 'group' && (
            <Collapsible open={imageOpen} onOpenChange={(v) => setImageOpen(v)}>
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full text-left py-2 font-medium">Image</button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2">
                  <Input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" />
                  <div className="mt-2">
                    {imageValid === true ? (
                      <img src={imageUrl} alt="Preview" className="h-28 w-28 rounded-md object-cover border" />
                    ) : imageValid === false && imageUrl ? (
                      <div className="h-28 w-28 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">Invalid image</div>
                    ) : null}
                  </div>

                  {/* TODO: Implement IconSearch component for icon selection */}
                  {/* <IconSearch onSelect={(url) => setImageUrl(url)} hideTrigger={true} open={imageOpen} onOpenChange={(v) => setImageOpen(v)} /> */}

                  {imageUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm">Icon color</label>
                      <input type="color" value={iconColor} onChange={e => setIconColor(e.target.value)} className="h-8 w-8 p-0 border-0" />
                      <Input value={iconColor} onChange={e => setIconColor(e.target.value)} className="w-28" />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Style */}
          <Collapsible open={styleOpen} onOpenChange={(v) => setStyleOpen(v)}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left py-2 font-medium">Style</button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Background</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Pick background color" type="button">
                        <span className="block h-5 w-5 rounded-sm border" style={{ background: backgroundColor }} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={6} align="start" className="w-56">
                      <div className="flex items-center gap-2">
                        <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="h-10 w-10 p-0 border-0" />
                        <Input value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="w-28" />
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {['#ffffff','#f8fafc','#fde68a','#bfdbfe','#fecaca','#d1fae5','#ddd6fe'].map(c => (
                          <button key={c} type="button" onClick={() => setBackgroundColor(c)} className="h-6 w-6 rounded-sm border" style={{ background: c }} aria-label={`Set background ${c}`} />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm">Border</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Pick border color" type="button">
                        <span className="block h-5 w-5 rounded-sm border" style={{ background: borderColor }} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={6} align="start" className="w-56">
                      <div className="flex items-center gap-2">
                        <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="h-10 w-10 p-0 border-0" />
                        <Input value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-28" />
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {['#222222','#000000','#64748b','#fb7185','#f59e0b','#34d399','#7c3aed'].map(c => (
                          <button key={c} type="button" onClick={() => setBorderColor(c)} className="h-6 w-6 rounded-sm border" style={{ background: c }} aria-label={`Set border ${c}`} />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
