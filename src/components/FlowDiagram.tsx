// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  Edge,
  EdgeChange,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../selected-edge.css';
import { exportReactFlowImage } from '../utils/exportImage';
import {
  alignNodes,
  bringToFront,
  deleteSelected,
  distributeNodes,
  duplicateNodes,
  lockNodes,
  sendToBack,
  unlockNodes,
} from '../utils/diagramEditingUtils';
import { CustomNode } from './CustomNode';
import { NodeEditor } from './NodeEditor';
import { SubgraphNode } from './SubgraphNode';
import { EditingToolbar } from './EditingToolbar';
import { SearchControl } from './SearchControl';

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onRequestPreview?: () => void;
  onRegisterMethods?: (methods: { openSearch?: () => void; exportImage?: () => Promise<void> }) => void;
}

function FlowDiagramInternal({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onRequestPreview,
  onRegisterMethods,
}: FlowDiagramProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [edgeLabelEditor, setEdgeLabelEditor] = useState<{
    edgeId: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // inspector removed per UX decision

  // keep local state in sync if parent props change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      group: SubgraphNode,
    }),
    []
  );

  const onNodeDragStart = useCallback(() => setIsDragging(true), []);
  const onNodeDragStop = useCallback(() => setIsDragging(false), []);

  const handleDownloadImage = async () => {
    if (!reactFlowWrapper.current || !reactFlowInstance) return;
    await exportReactFlowImage({
      wrapper: reactFlowWrapper.current,
      nodes,
      reactFlowInstance,
      setExporting,
      onError: (err) => alert('Failed to export image: ' + err),
      fileName: 'reactflow-diagram.png',
      pixelRatio: 8,
    });
  };

  // Register methods so parent can trigger search/export actions
  useEffect(() => {
    if (onRegisterMethods) {
      onRegisterMethods({
        openSearch: () => setShowSearch(true),
        exportImage: handleDownloadImage,
      });
    }
    // unregister on unmount
    return () => {
      if (onRegisterMethods) onRegisterMethods({});
    };
  }, [onRegisterMethods, handleDownloadImage]);

  // only update selected sets when selection actually changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasSelectChange = changes.some((c) => c.type === 'select');
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        if (hasSelectChange) {
          setSelectedNodes(updated.filter((n) => n.selected));
        }
        return updated;
      });
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasSelectChange = changes.some((c) => c.type === 'select');
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (hasSelectChange) {
          setSelectedEdges(updated.filter((e) => e.selected));
        }
        return updated;
      });
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#1976D2', strokeWidth: 2.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#1976D2',
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setEdges((eds) => {
        const updated = eds.map((e) => ({ ...e, selected: e.id === edge.id }));
        setSelectedEdges(updated.filter((e) => e.selected));
        return updated;
      });
    },
    [setEdges]
  );

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      if (!reactFlowInstance) return;
      reactFlowInstance.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.3 });
      // brief highlight
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, style: { ...n.style, outline: '3px solid #ff6b6b' } } : n
        )
      );
      setTimeout(() => {
        setNodes((prev) =>
          prev.map((n) => (n.id === nodeId ? { ...n, style: { ...n.style, outline: undefined } } : n))
        );
      }, 1200);
    },
    [reactFlowInstance, setNodes]
  );

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const container = reactFlowWrapper.current;
    const rect = container ? container.getBoundingClientRect() : ({ left: 0, top: 0 } as any);
    setEdgeLabelEditor({
      edgeId: edge.id,
      text: String(edge.label ?? ''),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeEditor(true);
  }, []);

  const onNodeDragStopLocal = useCallback(() => {
    onNodeDragStop();
    if (onNodesChangeCallback) onNodesChangeCallback(nodes);
    if (onEdgesChangeCallback) onEdgesChangeCallback(edges);
  }, [onNodeDragStop, onNodesChangeCallback, onEdgesChangeCallback, nodes, edges]);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data }, style: { ...n.style, ...data?.style } } : n
        );
        if (onNodesChangeCallback) onNodesChangeCallback(updated);
        return updated;
      });
    },
    [onNodesChangeCallback, setNodes]
  );

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const edgesWithSelection = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        className: edge.id === selectedEdgeId ? 'selected' : undefined,
      })),
    [edges, selectedEdgeId]
  );

  const onPaneClick = useCallback(() => setSelectedEdgeId(null), []);

  // toolbar actions
  const onAlignNodes = useCallback(
    (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => {
      const newNodes = alignNodes(nodes, selectedNodes, alignment);
      setNodes(newNodes);
      if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
    },
    [selectedNodes, nodes, onNodesChangeCallback]
  );

  const onDistributeNodes = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const newNodes = distributeNodes(nodes, selectedNodes, direction);
      setNodes(newNodes);
      if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
    },
    [selectedNodes, nodes, onNodesChangeCallback]
  );

  const onBringToFront = useCallback(() => {
    const newNodes = bringToFront(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onSendToBack = useCallback(() => {
    const newNodes = sendToBack(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDuplicateNodes = useCallback(() => {
    const newNodes = duplicateNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDeleteSelected = useCallback(() => {
    const { newNodes, newEdges } = deleteSelected(nodes, edges, selectedNodes, selectedEdges);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodes([]);
    setSelectedEdges([]);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
    if (onEdgesChangeCallback) onEdgesChangeCallback(newEdges);
  }, [selectedNodes, selectedEdges, nodes, edges, onNodesChangeCallback, onEdgesChangeCallback]);

  const onLockNodes = useCallback(() => {
    const newNodes = lockNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onUnlockNodes = useCallback(() => {
    const newNodes = unlockNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) onNodesChangeCallback(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onSelectSubgraphContents = useCallback(
    (subgraphNodeId?: string) => {
      if (!subgraphNodeId) return;
      const parentId = subgraphNodeId;
      setNodes((nds) => {
        const updated = nds.map((n) => ({ ...n, selected: n.parentNode === parentId }));
        setSelectedNodes(updated.filter((n) => n.selected));
        if (onNodesChangeCallback) onNodesChangeCallback(updated);
        return updated;
      });
      setEdges((eds) => {
        const nodeIds = new Set(nodes.filter((n) => n.parentNode === parentId).map((n) => n.id));
        const updated = eds.map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
        setSelectedEdges(updated.filter((e) => e.selected));
        if (onEdgesChangeCallback) onEdgesChangeCallback(updated);
        return updated;
      });
    },
    [nodes, onNodesChangeCallback, onEdgesChangeCallback]
  );

  const saveEdgeLabel = useCallback(
    (edgeId: string, text: string) => {
      setEdges((eds) => {
        const updated = eds.map((e) => (e.id === edgeId ? { ...e, label: text } : e));
        if (onEdgesChangeCallback) onEdgesChangeCallback(updated);
        return updated;
      });
      setEdgeLabelEditor(null);
    },
    [onEdgesChangeCallback]
  );

  const cancelEdgeLabelEdit = useCallback(() => setEdgeLabelEditor(null), []);

  return (
  <>
      <EditingToolbar
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
        onAlignNodes={onAlignNodes}
        onDistributeNodes={onDistributeNodes}
        onDuplicateNodes={onDuplicateNodes}
        onDeleteSelected={onDeleteSelected}
        onLockNodes={onLockNodes}
        onUnlockNodes={onUnlockNodes}
        onSelectSubgraphContents={onSelectSubgraphContents}
      />

  {/* Search control moved to top nav; no floating search button */}

  {/* Download/export image moved to top nav; no floating download button */}

  {/* Preview is controlled by top nav in App; no floating preview buttons inside canvas */}

      {exporting && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#fff',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              border: '6px solid #e3e3e3',
              borderTop: '6px solid #1976D2',
              borderRadius: '50%',
              width: 48,
              height: 48,
              animation: 'spin 1s linear infinite',
              marginBottom: 16,
            }}
          />
          <div style={{ fontSize: 18, color: '#1976D2', fontWeight: 500 }}>Exporting image...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
        </div>
      )}

      <SearchControl nodes={nodes} onFocusNode={handleFocusNode} onClose={() => setShowSearch(false)} isVisible={showSearch} />

  <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper} className={isDragging ? 'dragging' : ''}>
        <ReactFlow
          minZoom={0.05}
          nodes={nodes}
          edges={edgesWithSelection}
          onlyRenderVisibleElements
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStopLocal}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#1976D2', strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#1976D2' },
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          edgesUpdatable={true}
          connectionMode={ConnectionMode.Loose}
          onEdgeUpdate={(oldEdge, newConnection) => {
            if (!newConnection.source || !newConnection.target) return;
            setEdges((eds) => {
              const updated = eds.map((e) =>
                e.id === oldEdge.id
                  ? { ...e, ...newConnection, source: newConnection.source!, target: newConnection.target! }
                  : e
              );
              if (onEdgesChangeCallback) onEdgesChangeCallback(updated);
              return updated;
            });
          }}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;
            const bounds = reactFlowWrapper.current!.getBoundingClientRect();
            const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
            const id = `${type}-${Date.now()}`;
            let newNode: any;
            if (type === 'node') {
              newNode = { id, type: 'custom', position, data: { label: 'New Node' }, style: { width: 150, height: 50 } };
            } else if (type === 'subgraph') {
              newNode = { id, type: 'group', position, data: { label: 'New Subgraph' }, style: { width: 220, height: 120, background: '#e3f2fd', border: '2px dashed #1976D2' } };
            }
            if (newNode) {
              setNodes((nds) => {
                const updated = [...nds, newNode];
                if (onNodesChangeCallback) onNodesChangeCallback(updated);
                return updated;
              });
            }
          }}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

  {/* Inspector removed per user request */}

      {edgeLabelEditor && (
        <div className="edge-label-editor" style={{ left: edgeLabelEditor.x, top: edgeLabelEditor.y }}>
          <input
            autoFocus
            value={edgeLabelEditor.text}
            onChange={(e) => setEdgeLabelEditor({ ...edgeLabelEditor, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdgeLabel(edgeLabelEditor.edgeId, edgeLabelEditor.text);
              if (e.key === 'Escape') cancelEdgeLabelEdit();
            }}
          />
          <div className="edge-label-editor-actions">
            <button onClick={() => saveEdgeLabel(edgeLabelEditor.edgeId, edgeLabelEditor.text)}>Save</button>
            <button onClick={cancelEdgeLabelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {showNodeEditor && (
        <NodeEditor
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={() => {
            setShowNodeEditor(false);
            setSelectedNode(null);
          }}
        />
      )}
    </>
  );
}

export function FlowDiagram(props: FlowDiagramProps) {
  return (
    <ReactFlowProvider>
      <FlowDiagramInternal {...props} />
    </ReactFlowProvider>
  );
}
