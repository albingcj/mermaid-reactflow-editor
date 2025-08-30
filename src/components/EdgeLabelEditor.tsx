import React from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface EdgeLabelEditorProps {
  open: boolean;
  x: number; // coordinates relative to the parent wrapper (position: relative)
  y: number;
  text: string;
  onChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EdgeLabelEditor({ open, x, y, text, onChange, onSave, onCancel }: EdgeLabelEditorProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // slight delay to ensure popover is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      {/* Anchor is positioned inside a relative wrapper via absolute x/y */}
      <PopoverAnchor asChild>
        <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }} />
      </PopoverAnchor>
      <PopoverContent side={"top"} align={"center"} sideOffset={8} className="w-80 p-3">
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Edge label"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={onSave}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
