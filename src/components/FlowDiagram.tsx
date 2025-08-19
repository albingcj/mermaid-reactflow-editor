// @ts-nocheck
import { exportReactFlowImage } from '../utils/exportImage';
import {
  alignNodes,
  distributeNodes,
  bringToFront,
  sendToBack,
  duplicateNodes,
  deleteSelected,
  lockNodes,
  unlockNodes
} from '../utils/diagramEditingUtils';
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  NodeDragHandler,
  MarkerType,
  ConnectionLineType,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import '../selected-edge.css';
import 'reactflow/dist/style.css';
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
}

// Internal component that uses useReactFlow hook
function FlowDiagramInternal({
  nodes: initialNodes, 
  edges: initialEdges,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback
}: FlowDiagramProps) {
  const reactFlowInstance = useReactFlow();
  
  // Ref for the ReactFlow wrapper div
  const reactFlowWrapper = useRef(null);

  // State declarations
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  // Inline edge label editor state
  const [edgeLabelEditor, setEdgeLabelEditor] = useState<{
    edgeId: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Improved Download as Image Handler for High-Quality Large Diagrams
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

  // Handler for node changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      
      // Update selected nodes
      const newSelectedNodes = updated.filter(node => node.selected);
      setSelectedNodes(newSelectedNodes);
      
      if (onNodesChangeCallback) {
        onNodesChangeCallback(updated);
      }
      return updated;
    });
  }, [onNodesChangeCallback]);

  // Handler for edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      
      // Update selected edges
      const newSelectedEdges = updated.filter(edge => edge.selected);
      setSelectedEdges(newSelectedEdges);
      
      if (onEdgesChangeCallback) {
        onEdgesChangeCallback(updated);
      }
      return updated;
    });
  }, [onEdgesChangeCallback]);

  // Handler for connecting nodes
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      const updated = addEdge({
        ...connection,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1976D2', strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#1976D2'
        }
      }, eds);
      
      if (onEdgesChangeCallback) {
        onEdgesChangeCallback(updated);
      }
      return updated;
    });
  }, [onEdgesChangeCallback]);

  // Handler for edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  // Handler for edge double-click: open inline label editor
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    try {
      const wrapperRect = reactFlowWrapper.current?.getBoundingClientRect();
      const x = wrapperRect ? event.clientX - wrapperRect.left : 0;
      const y = wrapperRect ? event.clientY - wrapperRect.top : 0;
      setEdgeLabelEditor({ edgeId: edge.id, text: (edge.label as string) || '', x, y });
    } catch (err) {
      console.error('Failed to open edge label editor', err);
    }
  }, []);

  // Add a menu for edge type selection (optional enhancement)
  const [selectedEdgeType, setSelectedEdgeType] = useState('animated');

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
  // Show editor for nodes and group (subgraph) nodes
  setSelectedNode(node);
  setShowNodeEditor(true);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => {
      const newNodes = nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
            style: { ...node.style, ...data.style },
          };
        }
        return node;
      });
      
      if (onNodesChangeCallback) {
        onNodesChangeCallback(newNodes);
      }
      return newNodes;
    });
  }, [onNodesChangeCallback]);

  // Focus on a specific node
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && reactFlowInstance) {
      reactFlowInstance.fitView({
        nodes: [{ id: nodeId }],
        duration: 800,
        padding: 0.3,
      });
      
      // Highlight the node briefly
      setNodes(prevNodes => 
        prevNodes.map(n => ({
          ...n,
          style: n.id === nodeId 
            ? { ...n.style, border: '3px solid #ff6b6b', boxShadow: '0 0 20px rgba(255, 107, 107, 0.5)' }
            : n.style
        }))
      );
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        setNodes(prevNodes => 
          prevNodes.map(n => ({
            ...n,
            style: n.id === nodeId 
              ? { ...n.style, border: undefined, boxShadow: undefined }
              : n.style
          }))
        );
      }, 2000);
    }
  }, [nodes, reactFlowInstance]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add onEdit callback to node data
  const nodesWithEditCallback = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: () => {
            setSelectedNode(node);
            setShowNodeEditor(true);
          },
        },
      })),
    [nodes]
  );

  // Add selected class to selected edge
  const edgesWithSelection = useMemo(() =>
    edges.map(edge => ({
      ...edge,
      className: edge.id === selectedEdgeId ? 'selected' : undefined
    })), [edges, selectedEdgeId]);

  // Deselect edge when clicking on background
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  // Editing Functions - Using imported utility functions
  const onAlignNodes = useCallback((alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => {
    const newNodes = alignNodes(nodes, selectedNodes, alignment);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDistributeNodes = useCallback((direction: 'horizontal' | 'vertical') => {
    const newNodes = distributeNodes(nodes, selectedNodes, direction);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onBringToFront = useCallback(() => {
    const newNodes = bringToFront(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onSendToBack = useCallback(() => {
    const newNodes = sendToBack(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDuplicateNodes = useCallback(() => {
    const newNodes = duplicateNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDeleteSelected = useCallback(() => {
    const { newNodes, newEdges } = deleteSelected(nodes, edges, selectedNodes, selectedEdges);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodes([]);
    setSelectedEdges([]);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
    if (onEdgesChangeCallback) {
      onEdgesChangeCallback(newEdges);
    }
  }, [selectedNodes, selectedEdges, nodes, edges, onNodesChangeCallback, onEdgesChangeCallback]);

  const onLockNodes = useCallback(() => {
    const newNodes = lockNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onUnlockNodes = useCallback(() => {
    const newNodes = unlockNodes(nodes, selectedNodes);
    setNodes(newNodes);
    if (onNodesChangeCallback) {
      onNodesChangeCallback(newNodes);
    }
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onGroupNodes = useCallback(() => {
    // This is a placeholder - grouping is complex and would require more implementation
    console.log('Group nodes:', selectedNodes.map(n => n.id));
  }, [selectedNodes]);

  const onUngroupNodes = useCallback(() => {
    // This is a placeholder - ungrouping is complex and would require more implementation
    console.log('Ungroup nodes:', selectedNodes.map(n => n.id));
  }, [selectedNodes]);

  // Edge label editor save/cancel
  const saveEdgeLabel = useCallback((edgeId: string, text: string) => {
    setEdges((eds) => {
      const updated = eds.map(e => e.id === edgeId ? { ...e, label: text } : e);
      if (onEdgesChangeCallback) onEdgesChangeCallback(updated);
      return updated;
    });
    setEdgeLabelEditor(null);
  }, [onEdgesChangeCallback]);

  const cancelEdgeLabelEdit = useCallback(() => {
    setEdgeLabelEditor(null);
  }, []);

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
      />
      
      {/* Search Button */}
      <button
        onClick={() => setShowSearch(true)}
        className="btn btn-primary btn-sm mt-5"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          borderRadius: '20px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        title="Search nodes (Ctrl+F)"
      >
        {/* Search Icon SVG */}
        <span className="me-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="#fff" strokeWidth="2" fill="none" />
            <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        Search
      </button>

      {/* Download as Image Button */}
      <button
        onClick={handleDownloadImage}
        className="btn btn-outline-secondary btn-sm mt-5"
        style={{
          position: 'absolute',
          top: '50px',
          right: '10px',
          zIndex: 1000,
          borderRadius: '20px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
        }}
        title="Download diagram as image"
      >
        {/* Download Icon SVG */}
        <span className="me-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="13" width="10" height="1.5" rx="0.75" fill="#333" />
          </svg>
        </span>
        Download
      </button>

      {/* Loader Overlay for Export */}
      {exporting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#fff', // fully opaque
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{
            border: '6px solid #e3e3e3',
            borderTop: '6px solid #1976D2',
            borderRadius: '50%',
            width: 48,
            height: 48,
            animation: 'spin 1s linear infinite',
            marginBottom: 16,
          }} />
          <div style={{ fontSize: 18, color: '#1976D2', fontWeight: 500 }}>Exporting image...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
        </div>
      )}

      {/* Search Control */}
      <SearchControl
        nodes={nodes}
        onFocusNode={handleFocusNode}
        onClose={() => setShowSearch(false)}
        isVisible={showSearch}
      />
      
      <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
        <ReactFlow
          minZoom={0.05}
          nodes={nodesWithEditCallback}
          edges={edgesWithSelection}
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
            animated: true, // Default to animated edges
            style: { stroke: '#1976D2', strokeWidth: 2.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#1976D2'
            }
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          edgesUpdatable={true}
          connectionMode={ConnectionMode.Loose}
          onEdgeUpdate={(oldEdge, newConnection) => {
            // Ensure source and target are always strings (not null)
            if (!newConnection.source || !newConnection.target) return;
            
            setEdges((eds) => {
              const updated = eds.map(e =>
                e.id === oldEdge.id
                  ? { ...e, ...newConnection, source: newConnection.source!, target: newConnection.target! }
                  : e
              );
              
              if (onEdgesChangeCallback) {
                onEdgesChangeCallback(updated);
              }
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
            
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.project({
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            });
            
            const id = `${type}-${Date.now()}`;
            let newNode;
            
            if (type === 'node') {
              newNode = {
                id,
                type: 'custom',
                position,
                data: { label: 'New Node' },
                style: { width: 150, height: 50 },
              };
            } else if (type === 'subgraph') {
              newNode = {
                id,
                type: 'group',
                position,
                data: { label: 'New Subgraph' },
                style: { width: 220, height: 120, background: '#e3f2fd', border: '2px dashed #1976D2' },
              };
            }
            
            if (newNode) {
              setNodes((nds) => {
                const updated = [...nds, newNode];
                if (onNodesChangeCallback) {
                  onNodesChangeCallback(updated);
                }
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

        {/* Inline Edge Label Editor */}
        {edgeLabelEditor && (
          <div
            className="edge-label-editor"
            style={{ left: edgeLabelEditor.x, top: edgeLabelEditor.y }}
          >
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

// Main component wrapper with ReactFlowProvider
export function FlowDiagram(props: FlowDiagramProps) {
  return (
    <ReactFlowProvider>
      <FlowDiagramInternal {...props} />
    </ReactFlowProvider>
  );
}
