import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { COLOR_PRESETS, DEFAULT_COLORS } from '@/constants';
import IconSearch from './IconSearch';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_COLORS.background);
  const [borderColor, setBorderColor] = useState(DEFAULT_COLORS.border);
  const [iconColor, setIconColor] = useState(DEFAULT_COLORS.icon);
  const [imageValidState, setImageValidState] = useState<boolean | null>(null);

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

  // Image validation effect
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
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit {node.type === 'group' ? 'Subgraph' : 'Node'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 grid w-auto grid-cols-3 mb-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Node label"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="h-32 resize-none"
                />
              </div>
            </TabsContent>

            {/* Image Tab */}
            <TabsContent value="image" className="space-y-4 mt-0">
              {node.type !== 'group' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Image URL</label>
                    <Input
                      type="url"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or search icons</span>
                    </div>
                  </div>

                  <IconSearch onSelect={(url) => setImageUrl(url)} />

                  {imageUrl && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preview</label>
                        {imageValidState === true ? (
                          <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="h-24 w-24 object-contain"
                            />
                          </div>
                        ) : imageValidState === false ? (
                          <div className="flex items-center justify-center p-4 border rounded-lg bg-destructive/10 text-destructive text-sm">
                            Invalid image URL
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Icon Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={iconColor}
                            onChange={e => setIconColor(e.target.value)}
                            className="h-10 w-16 rounded border cursor-pointer"
                          />
                          <Input
                            value={iconColor}
                            onChange={e => setIconColor(e.target.value)}
                            className="flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Images are not available for subgraphs</p>
                </div>
              )}
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4 mt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">Background Color</label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-10 w-16 rounded border"
                        style={{ background: backgroundColor }}
                        title="Pick background color"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={backgroundColor}
                            onChange={e => setBackgroundColor(e.target.value)}
                            className="h-10 w-10 rounded border-0"
                          />
                          <Input
                            value={backgroundColor}
                            onChange={e => setBackgroundColor(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {COLOR_PRESETS.background.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBackgroundColor(c)}
                              className="h-8 w-8 rounded border hover:scale-110 transition-transform"
                              style={{ background: c }}
                              aria-label={`Set background ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Border Color</label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-10 w-16 rounded border"
                        style={{ background: borderColor }}
                        title="Pick border color"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={borderColor}
                            onChange={e => setBorderColor(e.target.value)}
                            className="h-10 w-10 rounded border-0"
                          />
                          <Input
                            value={borderColor}
                            onChange={e => setBorderColor(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {COLOR_PRESETS.border.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBorderColor(c)}
                              className="h-8 w-8 rounded border hover:scale-110 transition-transform"
                              style={{ background: c }}
                              aria-label={`Set border ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="flex-1"
                    placeholder="#222222"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
