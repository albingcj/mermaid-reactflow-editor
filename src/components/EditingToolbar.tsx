// React import not required with new JSX transform; kept out to avoid unused import error
import { Node, Edge } from 'reactflow';

interface EditingToolbarProps {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onAlignNodes: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => void;
  onDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
  onGroupNodes: () => void;
  onUngroupNodes: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
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
  onGroupNodes,
  onUngroupNodes,
  onBringToFront,
  onSendToBack,
  onDuplicateNodes,
  onDeleteSelected,
  onLockNodes,
  onUnlockNodes,
}: EditingToolbarProps) {
  const hasSelectedNodes = selectedNodes.length > 0;
  const hasMultipleNodes = selectedNodes.length > 1;
  const hasSelectedElements = selectedNodes.length > 0 || selectedEdges.length > 0;
  if (!hasSelectedElements) return null;

  return (
    <div className="editing-toolbar p-2 bg-white border rounded shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="small text-muted">Selection: <strong className="text-dark">{selectedNodes.length}</strong> nodes, <strong className="text-dark">{selectedEdges.length}</strong> edges</div>
        <div className="small text-muted">Tools</div>
      </div>

      <div className="row g-2">
        {/* Alignment */}
        <div className="col-12 col-md-6">
          <div className="card card-body p-2 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-medium">Align</div>
              <small className="text-muted">Axis</small>
            </div>

            <div className="d-flex flex-column gap-2">
              <div className="d-flex gap-2">
                <button className="btn btn-light btn-sm border" title="Align Left" onClick={() => onAlignNodes('left')}>
                  <AlignLeftIcon />
                </button>
                <button className="btn btn-light btn-sm border" title="Align Center Horizontal" onClick={() => onAlignNodes('center-horizontal')}>
                  <AlignCenterHorizontalIcon />
                </button>
                <button className="btn btn-light btn-sm border" title="Align Right" onClick={() => onAlignNodes('right')}>
                  <AlignRightIcon />
                </button>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-light btn-sm border" title="Align Top" onClick={() => onAlignNodes('top')}>
                  <AlignTopIcon />
                </button>
                <button className="btn btn-light btn-sm border" title="Align Center Vertical" onClick={() => onAlignNodes('center-vertical')}>
                  <AlignCenterVerticalIcon />
                </button>
                <button className="btn btn-light btn-sm border" title="Align Bottom" onClick={() => onAlignNodes('bottom')}>
                  <AlignBottomIcon />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Distribute & Group */}
        <div className="col-12 col-md-6">
          <div className="card card-body p-2 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-medium">Arrange</div>
              <small className="text-muted">Distribute / Group</small>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-secondary btn-sm" title="Distribute Horizontally" onClick={() => onDistributeNodes('horizontal')}>
                <DistributeHorizontalIcon />
                <span className="ms-2">Distribute H</span>
              </button>
              <button className="btn btn-outline-secondary btn-sm" title="Distribute Vertically" onClick={() => onDistributeNodes('vertical')}>
                <DistributeVerticalIcon />
                <span className="ms-2">Distribute V</span>
              </button>

              <button className="btn btn-outline-secondary btn-sm" title="Group Selected" onClick={onGroupNodes} disabled={!hasMultipleNodes}>
                <GroupIcon />
                <span className="ms-2">Group</span>
              </button>
              <button className="btn btn-outline-secondary btn-sm" title="Ungroup Selected" onClick={onUngroupNodes} disabled={!hasMultipleNodes}>
                <UngroupIcon />
                <span className="ms-2">Ungroup</span>
              </button>

              <button className="btn btn-outline-secondary btn-sm" title="Bring to Front" onClick={onBringToFront} disabled={!hasSelectedNodes}>
                <BringToFrontIcon />
                <span className="ms-2">Front</span>
              </button>
              <button className="btn btn-outline-secondary btn-sm" title="Send to Back" onClick={onSendToBack} disabled={!hasSelectedNodes}>
                <SendToBackIcon />
                <span className="ms-2">Back</span>
              </button>

              <button className="btn btn-outline-secondary btn-sm" title="Duplicate" onClick={onDuplicateNodes} disabled={!hasSelectedNodes}>
                <DuplicateIcon />
                <span className="ms-2">Duplicate</span>
              </button>

              <button className="btn btn-outline-danger btn-sm ms-auto" title="Delete Selected" onClick={onDeleteSelected} disabled={!hasSelectedElements}>
                <DeleteIcon />
                <span className="ms-2">Delete</span>
              </button>

              <button className="btn btn-outline-secondary btn-sm" title="Lock Position" onClick={onLockNodes} disabled={!hasSelectedNodes}>
                <LockIcon />
              </button>
              <button className="btn btn-outline-secondary btn-sm" title="Unlock Position" onClick={onUnlockNodes} disabled={!hasSelectedNodes}>
                <UnlockIcon />
              </button>
            </div>
          </div>
        </div>
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

function BringToFrontIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2h8v8h-2V4H6V2zM2 6h8v8H2V6zm1 1v6h6V7H3z"/>
    </svg>
  );
}

function SendToBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2h8v2H4v6H2V2zm4 4h8v8H6V6zm1 1v6h6V7H7z"/>
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

function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 4h4v1H3v3H2V4zm8 0h4v4h-1V5h-3V4zM2 10v4h4v-1H3v-3H2zm10 3v1h4v-4h-1v3h-3z"/>
    </svg>
  );
}

function UngroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2h4v1H6V2zM2 6h1v4H2V6zm11 0h1v4h-1V6zM6 13h4v1H6v-1z"/>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  );
}
