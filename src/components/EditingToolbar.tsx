// React import not required with new JSX transform; kept out to avoid unused import error
import { Node, Edge } from 'reactflow';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
  Copy,
  Lock,
  Unlock,
  Trash2,
  BoxSelect,
} from "lucide-react";

interface EditingToolbarProps {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onAlignNodes: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => void;
  onDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
  // Grouping removed; toolbar no longer supports group/ungroup/bring/send
  onDuplicateNodes: () => void;
  onDeleteSelected: () => void;
  onLockNodes: () => void;
  onUnlockNodes: () => void;
  onSelectSubgraphContents?: (subgraphNodeId?: string) => void;
  placement?: 'floating' | 'inline';
}

export function EditingToolbar({
  selectedNodes,
  selectedEdges,
  onAlignNodes,
  onDistributeNodes,
  // ...existing code...
  onDuplicateNodes,
  onDeleteSelected,
  onLockNodes,
  onUnlockNodes,
  onSelectSubgraphContents,
  placement = 'inline',
}: EditingToolbarProps) {
  const hasSelectedNodes = selectedNodes.length > 0;
  // const hasMultipleNodes intentionally removed (grouping not supported)
  const hasSelectedElements = selectedNodes.length > 0 || selectedEdges.length > 0;

  return (
    <div
      className={
        placement === 'floating'
          ? "absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border bg-card/90 backdrop-blur px-2 py-1 shadow-md"
          : "w-full border-b bg-muted/30 px-2 py-1 flex items-center gap-1"
      }
      role="toolbar"
      aria-label="Editing tools"
    >
      {/* Select subgraph contents (visible when a single subgraph container is selected) */}
      {selectedNodes.length === 1 && (selectedNodes[0].type === 'group' || selectedNodes[0]?.data?.isSubgraph) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Select contents"
          onClick={() => onSelectSubgraphContents && onSelectSubgraphContents(selectedNodes[0].id)}
        >
          <BoxSelect className="h-4 w-4" />
        </Button>
      )}

      <Badge variant="secondary" className="text-xs ml-1">
        {selectedNodes.length}
      </Badge>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Align (H) */}
      <div className="flex items-center gap-1" aria-label="Align horizontally">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Left" onClick={() => onAlignNodes('left')}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Center (Horizontal)" onClick={() => onAlignNodes('center-horizontal')}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Right" onClick={() => onAlignNodes('right')}>
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Align (V) */}
      <div className="flex items-center gap-1" aria-label="Align vertically">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Top" onClick={() => onAlignNodes('top')}>
          <AlignVerticalJustifyStart className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Middle (Vertical)" onClick={() => onAlignNodes('center-vertical')}>
          <AlignVerticalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Bottom" onClick={() => onAlignNodes('bottom')}>
          <AlignVerticalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Distribute */}
      <div className="flex items-center gap-1" aria-label="Distribute">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Distribute Horizontally" onClick={() => onDistributeNodes('horizontal')}>
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Distribute Vertically" onClick={() => onDistributeNodes('vertical')}>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Actions */}
      <div className="flex items-center gap-1" aria-label="Actions">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Duplicate" onClick={onDuplicateNodes} disabled={!hasSelectedNodes}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Lock" onClick={onLockNodes} disabled={!hasSelectedNodes}>
          <Lock className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Unlock" onClick={onUnlockNodes} disabled={!hasSelectedNodes}>
          <Unlock className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" title="Delete" onClick={onDeleteSelected} disabled={!hasSelectedElements}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
// Icon Components removed; using lucide-react for consistency
