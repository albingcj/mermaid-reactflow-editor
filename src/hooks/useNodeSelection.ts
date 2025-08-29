import { useState, useCallback, useRef } from "react";
import { Node } from "reactflow";

export const useNodeSelection = () => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [editingNode, setEditingNode] = useState<any | null>(null);

  const handleNodeClick = useCallback(
    (nodeId: string, isMultiSelect = false, nodes: Node[]) => {
      if (isMultiSelect) {
        setSelectedNodes((prev) => 
          prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
        );
      } else {
        setSelectedNodes([nodeId]);
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          setEditingNode(node);
        }
      }
    },
    []
  );

  const clearNodeSelection = useCallback(() => {
    setSelectedNodes([]);
    setEditingNode(null);
  }, []);

  return {
    selectedNodes,
    setSelectedNodes,
    editingNode,
    setEditingNode,
    handleNodeClick,
    clearNodeSelection,
  };
};