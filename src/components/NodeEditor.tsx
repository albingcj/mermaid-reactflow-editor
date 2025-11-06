import { useState, useEffect, useMemo } from 'react';
import { Node } from 'reactflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { COLOR_PRESETS, DEFAULT_COLORS } from '@/constants';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

type AccordionState = {
  label: boolean;
  description: boolean;
  image: boolean;
  style: boolean;
};

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_COLORS.background);
  const [borderColor, setBorderColor] = useState(DEFAULT_COLORS.border);
  const [iconColor, setIconColor] = useState(DEFAULT_COLORS.icon);

  // Consolidated accordion state
  const [accordionState, setAccordionState] = useState<AccordionState>({
    label: true,
    description: true,
    image: false,
    style: false,
  });

  const toggleAccordion = (key: keyof AccordionState) => {
    setAccordionState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setImageUrl(node.data.imageUrl || '');
      setDescription(node.data.description || '');
      setBackgroundColor(
        node.data?.style?.backgroundColor || node.style?.backgroundColor || DEFAULT_COLORS.background
      );
      setBorderColor(node.data?.style?.borderColor || node.style?.borderColor || DEFAULT_COLORS.border);
      setIconColor(node.data?.style?.iconColor || node.data?.iconColor || DEFAULT_COLORS.icon);
    }
  }, [node]);

  // Validate image URL - using useMemo to derive state
  const imageValid = useMemo(() => {
    if (!imageUrl) return null;

    // We still need async validation, so we'll use state for this
    return undefined; // Will be handled by the effect below
  }, [imageUrl]);

  // Image validation effect
  const [imageValidState, setImageValidState] = useState<boolean | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImageValidState(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setImageValidState(true); };
    img.onerror = () => { if (!cancelled) setImageValidState(false); };
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
          <Collapsible open={accordionState.label} onOpenChange={() => toggleAccordion('label')}>
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
          <Collapsible open={accordionState.description} onOpenChange={() => toggleAccordion('description')}>
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
            <Collapsible open={accordionState.image} onOpenChange={() => toggleAccordion('image')}>
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full text-left py-2 font-medium">Image</button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2">
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                  <div className="mt-2">
                    {imageValidState === true ? (
                      <img src={imageUrl} alt="Preview" className="h-28 w-28 rounded-md object-cover border" />
                    ) : imageValidState === false && imageUrl ? (
                      <div className="h-28 w-28 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                        Invalid image
                      </div>
                    ) : null}
                  </div>

                  {imageUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm">Icon color</label>
                      <input
                        type="color"
                        value={iconColor}
                        onChange={e => setIconColor(e.target.value)}
                        className="h-8 w-8 p-0 border-0"
                      />
                      <Input
                        value={iconColor}
                        onChange={e => setIconColor(e.target.value)}
                        className="w-28"
                      />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Style */}
          <Collapsible open={accordionState.style} onOpenChange={() => toggleAccordion('style')}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left py-2 font-medium">Style</button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 flex gap-4 items-center">
                {/* Background Color */}
                <div className="flex items-center gap-2">
                  <label className="text-sm">Background</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Pick background color"
                        type="button"
                      >
                        <span
                          className="block h-5 w-5 rounded-sm border"
                          style={{ background: backgroundColor }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={6} align="start" className="w-56">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={e => setBackgroundColor(e.target.value)}
                          className="h-10 w-10 p-0 border-0"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={e => setBackgroundColor(e.target.value)}
                          className="w-28"
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {COLOR_PRESETS.background.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBackgroundColor(c)}
                            className="h-6 w-6 rounded-sm border"
                            style={{ background: c }}
                            aria-label={`Set background ${c}`}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Border Color */}
                <div className="flex items-center gap-2">
                  <label className="text-sm">Border</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Pick border color"
                        type="button"
                      >
                        <span
                          className="block h-5 w-5 rounded-sm border"
                          style={{ background: borderColor }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={6} align="start" className="w-56">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={borderColor}
                          onChange={e => setBorderColor(e.target.value)}
                          className="h-10 w-10 p-0 border-0"
                        />
                        <Input
                          value={borderColor}
                          onChange={e => setBorderColor(e.target.value)}
                          className="w-28"
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {COLOR_PRESETS.border.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBorderColor(c)}
                            className="h-6 w-6 rounded-sm border"
                            style={{ background: c }}
                            aria-label={`Set border ${c}`}
                          />
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
