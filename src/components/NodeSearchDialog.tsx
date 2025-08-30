import React, { useMemo } from 'react';
import { Node } from 'reactflow';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from '@/components/ui/command';

export interface NodeSearchDialogProps {
  open: boolean;
  nodes: Node[];
  onOpenChange: (open: boolean) => void;
  onSelectNode: (nodeId: string) => void;
}

export function NodeSearchDialog({ open, nodes, onOpenChange, onSelectNode }: NodeSearchDialogProps) {
  // Split nodes by type for clearer grouping
  const { nodeItems, subgraphItems, conditionItems } = useMemo(() => {
    const n: Array<{ id: string; label: string }> = [];
    const s: Array<{ id: string; label: string }> = [];
    const c: Array<{ id: string; label: string }> = [];
    nodes.forEach((node) => {
      const label = (node.data?.label as string) || node.id;
      if (node.type === 'group' || node.data?.isSubgraph) {
        s.push({ id: node.id, label });
      } else if (node.type === 'diamond' || node.data?.shape === 'diamond') {
        c.push({ id: node.id, label });
      } else {
        n.push({ id: node.id, label });
      }
    });
    // Sort for stable UX
    n.sort((a, b) => a.label.localeCompare(b.label));
    s.sort((a, b) => a.label.localeCompare(b.label));
    c.sort((a, b) => a.label.localeCompare(b.label));
    return { nodeItems: n, subgraphItems: s, conditionItems: c };
  }, [nodes]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search nodes and subgraphs">
      <CommandInput placeholder="Search nodes and subgraphs..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>No results found.</CommandEmpty>
        {conditionItems.length > 0 && (
          <CommandGroup heading="Conditions">
            {conditionItems.map((item) => (
              <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                <span className="inline-flex size-5 items-center justify-center rounded bg-muted mr-2">
                  {/* diamond icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>
                <span className="truncate" title={item.label}>{item.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">• {item.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(conditionItems.length > 0 && (subgraphItems.length > 0 || nodeItems.length > 0)) && <CommandSeparator />}
        {subgraphItems.length > 0 && (
          <CommandGroup heading="Subgraphs">
            {subgraphItems.map((item) => (
              <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                <span className="inline-flex size-5 items-center justify-center rounded bg-muted mr-2">
                  {/* simple subgraph icon */}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="4" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <span className="truncate" title={item.label}>{item.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">• {item.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {subgraphItems.length > 0 && nodeItems.length > 0 && <CommandSeparator />}
        {nodeItems.length > 0 && (
          <CommandGroup heading="Nodes">
            {nodeItems.map((item) => (
              <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                <span className="inline-flex size-5 items-center justify-center rounded bg-muted mr-2">
                  {/* simple node icon */}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <span className="truncate" title={item.label}>{item.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">• {item.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
