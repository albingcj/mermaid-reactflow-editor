import React from 'react';
import { Square, Layers } from 'lucide-react';

type PaletteItem = {
  id: string;
  type: 'node' | 'subgraph';
  label: string;
  Icon?: React.ComponentType<any>;
};

const ITEMS: PaletteItem[] = [
  { id: 'node', type: 'node', label: 'Node', Icon: Square },
  { id: 'subgraph', type: 'subgraph', label: 'Subgraph', Icon: Layers },
];

export function PaletteToolbar({ className = '' }: { className?: string }) {
  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow', item.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`palette-toolbar ${className}`} role="toolbar" aria-label="Palette toolbar">
      {ITEMS.map((it) => {
        const Icon = it.Icon;
        return (
          <div
            key={it.id}
            className="draggable-palette-item p-2 rounded cursor-grab select-none flex items-center gap-2"
            draggable
            onDragStart={(e) => onDragStart(e, it)}
            title={`Drag ${it.label} onto canvas`}
            role="button"
            aria-label={`Drag ${it.label}`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default PaletteToolbar;
