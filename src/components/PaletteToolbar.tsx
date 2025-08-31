import React from 'react';
import { Square, Layers, Diamond } from 'lucide-react';

type PaletteItem = {
  id: string;
  type: 'node' | 'subgraph' | 'diamond';
  label: string;
  Icon?: React.ComponentType<any>;
};

const ITEMS: PaletteItem[] = [
  { id: 'node', type: 'node', label: 'Node', Icon: Square },
  { id: 'diamond', type: 'diamond', label: 'Conditional', Icon: Diamond },
  { id: 'subgraph', type: 'subgraph', label: 'Subgraph', Icon: Layers },
];

export function PaletteToolbar({ className = '' }: { className?: string }) {
  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow', item.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`palette-toolbar ${className} w-full flex flex-row items-stretch gap-2 overflow-x-auto flex-nowrap sm:flex-wrap`}
      role="toolbar"
      aria-label="Palette toolbar"
    >
      {ITEMS.map((it) => {
        const Icon = it.Icon;
        return (
          <div
            key={it.id}
            className="draggable-palette-item p-2 rounded cursor-grab select-none flex items-center gap-2 border bg-card hover:bg-accent transition-colors flex-none shrink-0 min-w-[44px] sm:flex-1 sm:basis-0 sm:min-w-[160px] justify-center sm:justify-start"
            draggable
            onDragStart={(e) => onDragStart(e, it)}
            title={`Drag ${it.label} onto canvas`}
            role="button"
            aria-label={`Drag ${it.label}`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium hidden sm:block">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default PaletteToolbar;
