import type { Node, Edge } from 'reactflow';

type Align = 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical';
type Distribute = 'horizontal' | 'vertical';

export interface InspectorPanelProps {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onUpdateNode: (nodeId: string, data: any) => void;
  onUpdateEdgeLabel?: (edgeId: string, text: string) => void;
  onAlignNodes: (alignment: Align) => void;
  onDistributeNodes: (direction: Distribute) => void;
  onDuplicateNodes: () => void;
  onDeleteSelected: () => void;
  onLockNodes: () => void;
  onUnlockNodes: () => void;
  open: boolean;
  onToggle: () => void;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const {
    selectedNodes,
    selectedEdges,
    onUpdateNode,
    onUpdateEdgeLabel,
    onAlignNodes,
    onDistributeNodes,
    onDuplicateNodes,
    onDeleteSelected,
    onLockNodes,
    onUnlockNodes,
    open,
    onToggle,
  } = props;

  const hasSelection = selectedNodes.length + selectedEdges.length > 0;
  const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const singleEdge = selectedEdges.length === 1 ? selectedEdges[0] : null;

  return (
    <div className={`inspector-panel ${open ? 'open' : ''}`}>
      <div className="inspector-header">
        <div className="inspector-title">
          <i className="bi bi-sliders2-vertical me-2" />
          {hasSelection ? 'Properties' : 'Inspector'}
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={onToggle} title={open ? 'Hide Inspector' : 'Show Inspector'}>
          <i className={`bi ${open ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>
      </div>

      <div className="inspector-body">
        {!hasSelection && (
          <div className="text-muted small">
            <div className="mb-2">Select a node or edge to edit its properties.</div>
            <ul className="mb-0 ps-3">
              <li>Double-click a node to open the full editor</li>
              <li>Use the toolbar to align or distribute</li>
            </ul>
          </div>
        )}

        {singleNode && (
          <div>
            <div className="mb-2">
              <label className="form-label small">Label</label>
              <input
                className="form-control form-control-sm"
                value={singleNode.data?.label ?? ''}
                onChange={(e) => onUpdateNode(singleNode.id, { label: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label small">Description</label>
              <textarea
                rows={3}
                className="form-control form-control-sm"
                value={singleNode.data?.description ?? ''}
                onChange={(e) => onUpdateNode(singleNode.id, { description: e.target.value })}
              />
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small">Background</label>
                <input
                  type="color"
                  className="form-control form-control-color form-control-sm"
                  value={singleNode.style?.backgroundColor ?? '#ffffff'}
                  onChange={(e) => onUpdateNode(singleNode.id, { style: { ...singleNode.style, backgroundColor: e.target.value } })}
                  title="Background color"
                />
              </div>
              <div className="col-6">
                <label className="form-label small">Border</label>
                <input
                  type="color"
                  className="form-control form-control-color form-control-sm"
                  value={singleNode.style?.borderColor ?? '#222222'}
                  onChange={(e) => onUpdateNode(singleNode.id, { style: { ...singleNode.style, borderColor: e.target.value, border: `2px solid ${e.target.value}` } })}
                  title="Border color"
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label small">Shape</label>
              <select
                className="form-select form-select-sm"
                value={singleNode.data?.shape ?? 'rect'}
                onChange={(e) => onUpdateNode(singleNode.id, { shape: e.target.value })}
              >
                <option value="rect">Rectangle</option>
                <option value="round">Rounded</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
                <option value="stadium">Stadium</option>
              </select>
            </div>
            <div className="d-flex gap-2 mb-2">
              <button className="btn btn-sm btn-outline-primary" onClick={onDuplicateNodes} title="Duplicate">
                <i className="bi bi-layers me-1" /> Duplicate
              </button>
              <button className="btn btn-sm btn-outline-warning" onClick={onLockNodes} title="Lock">
                <i className="bi bi-lock me-1" /> Lock
              </button>
              <button className="btn btn-sm btn-outline-success" onClick={onUnlockNodes} title="Unlock">
                <i className="bi bi-unlock me-1" /> Unlock
              </button>
            </div>
            <button className="btn btn-sm btn-outline-danger w-100" onClick={onDeleteSelected} title="Delete">
              <i className="bi bi-trash3 me-1" /> Delete
            </button>
          </div>
        )}

        {!singleNode && selectedNodes.length > 1 && (
          <div>
            <div className="alert alert-light py-2 small" role="alert">
              <strong>{selectedNodes.length}</strong> nodes selected
            </div>
            <div className="d-flex flex-wrap gap-1 mb-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('left')}>Align Left</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('center-horizontal')}>Align H-Center</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('right')}>Align Right</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('top')}>Align Top</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('center-vertical')}>Align V-Middle</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onAlignNodes('bottom')}>Align Bottom</button>
            </div>
            <div className="d-flex gap-1 mb-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onDistributeNodes('horizontal')}>Distribute H</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => onDistributeNodes('vertical')}>Distribute V</button>
            </div>
            <div className="d-flex gap-2 mb-2">
              <button className="btn btn-sm btn-outline-primary" onClick={onDuplicateNodes}>Duplicate</button>
              <button className="btn btn-sm btn-outline-warning" onClick={onLockNodes}>Lock</button>
              <button className="btn btn-sm btn-outline-success" onClick={onUnlockNodes}>Unlock</button>
            </div>
            <button className="btn btn-sm btn-outline-danger w-100" onClick={onDeleteSelected}>Delete</button>
          </div>
        )}

        {singleEdge && (
          <div>
            <div className="mb-2">
              <label className="form-label small">Edge Label</label>
              <input
                className="form-control form-control-sm"
                value={String(singleEdge.label ?? '')}
                onChange={(e) => onUpdateEdgeLabel && onUpdateEdgeLabel(singleEdge.id, e.target.value)}
              />
            </div>
            <button className="btn btn-sm btn-outline-danger w-100" onClick={onDeleteSelected}>Delete Edge</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InspectorPanel;
