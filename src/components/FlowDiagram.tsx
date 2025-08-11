import React, { useCallback, useState, useEffect, useMemo } from 'react';
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
} from 'reactflow';
import '../selected-edge.css';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { NodeEditor } from './NodeEditor';
import { SubgraphNode } from './SubgraphNode';

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

export function FlowDiagram({ 
  nodes: initialNodes, 
  edges: initialEdges,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback
}: FlowDiagramProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);

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

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const newNodes = applyNodeChanges(changes, nodes);
      setNodes(newNodes);
      onNodesChangeCallback?.(newNodes);
    },
    [nodes, onNodesChangeCallback]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const newEdges = applyEdgeChanges(changes, edges);
      setEdges(newEdges);
      onEdgesChangeCallback?.(newEdges);
      // Deselect edge if it was removed
      if (selectedEdgeId && !newEdges.some(e => e.id === selectedEdgeId)) {
        setSelectedEdgeId(null);
      }
    },
    [edges, onEdgesChangeCallback, selectedEdgeId]
  );

  // Edge click handler
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNode(null); // Deselect node if any
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      // Create a new edge with the exact same properties as auto-generated edges
      // Including animation by default
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true, // Set animation to true by default for manually added edges
        style: {
          stroke: '#1976D2',
          strokeWidth: 2.5, // Match the width of animated edges
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#1976D2'
        }
      };
      
      const newEdges = addEdge(newEdge, edges);
      setEdges(newEdges);
      onEdgesChangeCallback?.(newEdges);
    },
    [edges, onEdgesChangeCallback]
  );

  // Add a menu for edge type selection (optional enhancement)
  const [selectedEdgeType, setSelectedEdgeType] = useState('animated');

  useEffect(() => {
    // Update default edge options when edge type changes
    // This is an optional enhancement if you want to allow users to choose edge types
  }, [selectedEdgeType]);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Only show editor for non-group nodes
    if (node.type !== 'group') {
      setSelectedNode(node);
      setShowNodeEditor(true);
    }
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
      onNodesChangeCallback?.(newNodes);
      return newNodes;
    });
  }, [onNodesChangeCallback]);

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

  return (
    <>
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodesWithEditCallback}
          edges={edgesWithSelection}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
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
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
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
