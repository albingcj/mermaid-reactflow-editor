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
  ConnectionMode,
} from 'reactflow';
import '../selected-edge.css';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { NodeEditor } from './NodeEditor';
import { SubgraphNode } from './SubgraphNode';
import { EditingToolbar } from './EditingToolbar';

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
  // State declarations

  // Handler for node changes
  const onNodesChange = React.useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      onNodesChangeCallback?.(updated);
      return updated;
    });
  }, [onNodesChangeCallback]);

  // Handler for edge changes
  const onEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      onEdgesChangeCallback?.(updated);
      return updated;
    });
  }, [onEdgesChangeCallback]);


  // Handler for connecting nodes (now after edges is defined)
  const onConnect = React.useCallback((connection: Connection) => {
    setEdges((eds) => {
      const updated = addEdge(connection, eds);
      onEdgesChangeCallback?.(updated);
      return updated;
    });
  }, [onEdgesChangeCallback]);

  // Handler for edge click
  const onEdgeClick = React.useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
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

  // Editing Functions
  const onAlignNodes = useCallback((alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => {
    if (selectedNodes.length < 2) return;

    const bounds = selectedNodes.map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.width || 150,
      height: node.height || 50,
    }));

    let newNodes = [...nodes];

    switch (alignment) {
      case 'left':
        const leftX = Math.min(...bounds.map(b => b.x));
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: leftX } };
          }
        });
        break;

      case 'right':
        const rightX = Math.max(...bounds.map(b => b.x + b.width));
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: rightX - bound.width } };
          }
        });
        break;

      case 'top':
        const topY = Math.min(...bounds.map(b => b.y));
        // Handler for connecting nodes (now after edges is defined)
        const onConnect = React.useCallback((connection: Connection) => {
          setEdges((eds) => addEdge(connection, eds));
          onEdgesChangeCallback?.(addEdge(connection, edges));
        }, [edges, onEdgesChangeCallback]);
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: topY } };
          }
        });
        break;

      case 'bottom':
        const bottomY = Math.max(...bounds.map(b => b.y + b.height));
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: bottomY - bound.height } };
          }
        });
        break;

      case 'center-horizontal':
        const avgY = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: avgY - bound.height / 2 } };
          }
        });
        break;

      case 'center-vertical':
        const avgX = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
        bounds.forEach(bound => {
          const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: avgX - bound.width / 2 } };
          }
        });
        break;
    }

    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDistributeNodes = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 3) return;

    const bounds = selectedNodes.map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.width || 150,
      height: node.height || 50,
      centerX: node.position.x + (node.width || 150) / 2,
      centerY: node.position.y + (node.height || 50) / 2,
    }));

    let newNodes = [...nodes];

    if (direction === 'horizontal') {
      // Sort by X position (left to right)
      bounds.sort((a, b) => a.centerX - b.centerX);
      
      // Calculate total space between leftmost and rightmost centers
      const leftmostCenter = bounds[0].centerX;
      const rightmostCenter = bounds[bounds.length - 1].centerX;
      const totalSpace = rightmostCenter - leftmostCenter;
      const spacing = totalSpace / (bounds.length - 1);
      
      // Distribute nodes evenly by their centers
      bounds.forEach((bound, index) => {
        const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
        if (nodeIndex !== -1) {
          const newCenterX = leftmostCenter + spacing * index;
          const newX = newCenterX - bound.width / 2;
          newNodes[nodeIndex] = { 
            ...newNodes[nodeIndex], 
            position: { ...newNodes[nodeIndex].position, x: newX }
          };
        }
      });
    } else {
      // Sort by Y position (top to bottom)
      bounds.sort((a, b) => a.centerY - b.centerY);
      
      // Calculate total space between topmost and bottommost centers
      const topmostCenter = bounds[0].centerY;
      const bottommostCenter = bounds[bounds.length - 1].centerY;
      const totalSpace = bottommostCenter - topmostCenter;
      const spacing = totalSpace / (bounds.length - 1);
      
      // Distribute nodes evenly by their centers
      bounds.forEach((bound, index) => {
        const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
        if (nodeIndex !== -1) {
          const newCenterY = topmostCenter + spacing * index;
          const newY = newCenterY - bound.height / 2;
          newNodes[nodeIndex] = { 
            ...newNodes[nodeIndex], 
            position: { ...newNodes[nodeIndex].position, y: newY }
          };
        }
      });
    }
    
    // Update all nodes at once
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onBringToFront = useCallback(() => {
    const maxZ = Math.max(...nodes.map(n => n.zIndex || 0));
    const newNodes = nodes.map(node => 
      selectedNodes.some(sn => sn.id === node.id) 
        ? { ...node, zIndex: maxZ + 1 }
        : node
    );
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onSendToBack = useCallback(() => {
    const minZ = Math.min(...nodes.map(n => n.zIndex || 0));
    const newNodes = nodes.map(node => 
      selectedNodes.some(sn => sn.id === node.id) 
        ? { ...node, zIndex: minZ - 1 }
        : node
    );
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDuplicateNodes = useCallback(() => {
    const newNodes = [...nodes];
    const duplicatedNodes: Node[] = [];
    
    selectedNodes.forEach(node => {
      const newNode: Node = {
        ...node,
        id: `${node.id}_copy_${Date.now()}`,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        selected: false,
      };
      duplicatedNodes.push(newNode);
      newNodes.push(newNode);
    });
    
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onDeleteSelected = useCallback(() => {
    const nodeIdsToDelete = selectedNodes.map(n => n.id);
    const edgeIdsToDelete = selectedEdges.map(e => e.id);
    
    const newNodes = nodes.filter(n => !nodeIdsToDelete.includes(n.id));
    const newEdges = edges.filter(e => !edgeIdsToDelete.includes(e.id));
    
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodes([]);
    setSelectedEdges([]);
    
    onNodesChangeCallback?.(newNodes);
    onEdgesChangeCallback?.(newEdges);
  }, [selectedNodes, selectedEdges, nodes, edges, onNodesChangeCallback, onEdgesChangeCallback]);

  const onLockNodes = useCallback(() => {
    const newNodes = nodes.map(node => 
      selectedNodes.some(sn => sn.id === node.id) 
        ? { 
            ...node, 
            draggable: false,
            data: { ...node.data, locked: true }
          }
        : node
    );
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onUnlockNodes = useCallback(() => {
    const newNodes = nodes.map(node => 
      selectedNodes.some(sn => sn.id === node.id) 
        ? { 
            ...node, 
            draggable: true,
            data: { ...node.data, locked: false }
          }
        : node
    );
    setNodes(newNodes);
    onNodesChangeCallback?.(newNodes);
  }, [selectedNodes, nodes, onNodesChangeCallback]);

  const onGroupNodes = useCallback(() => {
    // This is a placeholder - grouping is complex and would require more implementation
    console.log('Group nodes:', selectedNodes.map(n => n.id));
  }, [selectedNodes]);

  const onUngroupNodes = useCallback(() => {
    // This is a placeholder - ungrouping is complex and would require more implementation
    console.log('Ungroup nodes:', selectedNodes.map(n => n.id));
  }, [selectedNodes]);

  return (
    <>
      <EditingToolbar
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
        onAlignNodes={onAlignNodes}
        onDistributeNodes={onDistributeNodes}
        onGroupNodes={onGroupNodes}
        onUngroupNodes={onUngroupNodes}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onDuplicateNodes={onDuplicateNodes}
        onDeleteSelected={onDeleteSelected}
        onLockNodes={onLockNodes}
        onUnlockNodes={onUnlockNodes}
      />
      <div style={{ width: '100%', height: '100%' }}>
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
            setEdges((eds) => eds.map(e =>
              e.id === oldEdge.id
                ? { ...e, ...newConnection, source: newConnection.source!, target: newConnection.target! }
                : e
            ));
            onEdgesChangeCallback?.(edges.map(e =>
              e.id === oldEdge.id
                ? { ...e, ...newConnection, source: newConnection.source!, target: newConnection.target! }
                : e
            ));
          }}
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
