// React import not required with new JSX transform; kept out to avoid unused import error
import { Node, Edge } from 'reactflow';

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
}: EditingToolbarProps) {
  const hasSelectedNodes = selectedNodes.length > 0;
  // const hasMultipleNodes intentionally removed (grouping not supported)
  const hasSelectedElements = selectedNodes.length > 0 || selectedEdges.length > 0;
  if (!hasSelectedElements) return null;

  return (
    <div className="editing-toolbar editing-toolbar--floating" role="toolbar" aria-label="Editing tools">
      {/* Selection badge */}
      <div className="toolbar-chip" title={`Selected: ${selectedNodes.length} nodes, ${selectedEdges.length} edges`}>
        {selectedNodes.length}
      </div>

      {/* Align (H) */}
      <div className="toolbar-group" aria-label="Align horizontally">
        <button className="toolbar-btn" title="Align Left" onClick={() => onAlignNodes('left')}>
          <AlignLeftIcon />
        </button>
        <button className="toolbar-btn" title="Align Center (Horizontal)" onClick={() => onAlignNodes('center-horizontal')}>
          <AlignCenterHorizontalIcon />
        </button>
        <button className="toolbar-btn" title="Align Right" onClick={() => onAlignNodes('right')}>
          <AlignRightIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Align (V) */}
      <div className="toolbar-group" aria-label="Align vertically">
        <button className="toolbar-btn" title="Align Top" onClick={() => onAlignNodes('top')}>
          <AlignTopIcon />
        </button>
        <button className="toolbar-btn" title="Align Middle (Vertical)" onClick={() => onAlignNodes('center-vertical')}>
          <AlignCenterVerticalIcon />
        </button>
        <button className="toolbar-btn" title="Align Bottom" onClick={() => onAlignNodes('bottom')}>
          <AlignBottomIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Distribute */}
      <div className="toolbar-group" aria-label="Distribute">
        <button className="toolbar-btn" title="Distribute Horizontally" onClick={() => onDistributeNodes('horizontal')}>
          <DistributeHorizontalIcon />
        </button>
        <button className="toolbar-btn" title="Distribute Vertically" onClick={() => onDistributeNodes('vertical')}>
          <DistributeVerticalIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Actions */}
      <div className="toolbar-group" aria-label="Actions">
        <button className="toolbar-btn" title="Duplicate" onClick={onDuplicateNodes} disabled={!hasSelectedNodes}>
          <DuplicateIcon />
        </button>
        <button className="toolbar-btn" title="Lock" onClick={onLockNodes} disabled={!hasSelectedNodes}>
          <LockIcon />
        </button>
        <button className="toolbar-btn" title="Unlock" onClick={onUnlockNodes} disabled={!hasSelectedNodes}>
          <UnlockIcon />
        </button>
        <button className="toolbar-btn toolbar-btn--danger" title="Delete" onClick={onDeleteSelected} disabled={!hasSelectedElements}>
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}

// Icon Components
function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2v12h1V2H2zm3 3h8v2H5V5zm0 4h6v2H5V9z"/>
    </svg>
  );
}

function AlignCenterHorizontalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1v14h1V1H8zM4 5h8v2H4V5zm2 4h4v2H6V9z"/>
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13 2v12h1V2h-1zM3 5h8v2H3V5zm2 4h6v2H5V9z"/>
    </svg>
  );
}

function AlignTopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2h12v1H2V2zm3 3v8h2V5H5zm4 0v6h2V5H9z"/>
    </svg>
  );
}

function AlignCenterVerticalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 8h14v1H1V8zM5 4v8h2V4H5zm4 2v4h2V6H9z"/>
    </svg>
  );
}

function AlignBottomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 13h12v1H2v-1zM5 3v8h2V3H5zm4 2v6h2V5H9z"/>
    </svg>
  );
}

function DistributeHorizontalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 4h2v8H2V4zm5 2h2v4H7V6zm5-2h2v8h-2V4z"/>
    </svg>
  );
}

function DistributeVerticalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2v2h8V2H4zm2 5v2h4V7H6zm-2 5v2h8v-2H4z"/>
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2h8v2H6v6H4V2zm2 4h8v8H6V6zm1 1v6h6V7H7z"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 7V5a3 3 0 116 0v2h1a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h1zM6 5v2h4V5a2 2 0 10-4 0z"/>
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 7V5a3 3 0 015.905-.75l.845-1.64A4.5 4.5 0 004 5v2H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1H5z"/>
    </svg>
  );
}

// Group/Ungroup icons removed

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  );
}
