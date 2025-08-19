import { Node, Edge } from 'reactflow';

export function alignNodes(
  nodes: Node[],
  selectedNodes: Node[],
  alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical'
): Node[] {
  if (selectedNodes.length < 2) return nodes;
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
    // Center nodes horizontally (align their centers on the X axis)
    case 'center-horizontal': {
      const avgX = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
      bounds.forEach(bound => {
        const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
        if (nodeIndex !== -1) {
          newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: avgX - bound.width / 2 } };
        }
      });
    }
      break;

    // Center nodes vertically (align their centers on the Y axis)
    case 'center-vertical': {
      const avgY = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
      bounds.forEach(bound => {
        const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
        if (nodeIndex !== -1) {
          newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: avgY - bound.height / 2 } };
        }
      });
    }
      break;
  }
  return newNodes;
}

export function distributeNodes(
  nodes: Node[],
  selectedNodes: Node[],
  direction: 'horizontal' | 'vertical'
): Node[] {
  if (selectedNodes.length < 3) return nodes;
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
    bounds.sort((a, b) => a.centerX - b.centerX);
    const leftmostCenter = bounds[0].centerX;
    const rightmostCenter = bounds[bounds.length - 1].centerX;
    const totalSpace = rightmostCenter - leftmostCenter;
    const spacing = totalSpace / (bounds.length - 1);
    bounds.forEach((bound, index) => {
      const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
      if (nodeIndex !== -1) {
        const newCenterX = leftmostCenter + spacing * index;
        const newX = newCenterX - bound.width / 2;
        newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: newX } };
      }
    });
  } else {
    bounds.sort((a, b) => a.centerY - b.centerY);
    const topmostCenter = bounds[0].centerY;
    const bottommostCenter = bounds[bounds.length - 1].centerY;
    const totalSpace = bottommostCenter - topmostCenter;
    const spacing = totalSpace / (bounds.length - 1);
    bounds.forEach((bound, index) => {
      const nodeIndex = newNodes.findIndex(n => n.id === bound.id);
      if (nodeIndex !== -1) {
        const newCenterY = topmostCenter + spacing * index;
        const newY = newCenterY - bound.height / 2;
        newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: newY } };
      }
    });
  }
  return newNodes;
}

export function bringToFront(nodes: Node[], selectedNodes: Node[]): Node[] {
  const maxZ = Math.max(...nodes.map(n => n.zIndex || 0));
  return nodes.map(node =>
    selectedNodes.some(sn => sn.id === node.id)
      ? { ...node, zIndex: maxZ + 1 }
      : node
  );
}

export function sendToBack(nodes: Node[], selectedNodes: Node[]): Node[] {
  const minZ = Math.min(...nodes.map(n => n.zIndex || 0));
  return nodes.map(node =>
    selectedNodes.some(sn => sn.id === node.id)
      ? { ...node, zIndex: minZ - 1 }
      : node
  );
}

export function duplicateNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
  const newNodes = [...nodes];
  selectedNodes.forEach(node => {
    const newNode: Node = {
      ...node,
      id: `${node.id}_copy_${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      selected: false,
    };
    newNodes.push(newNode);
  });
  return newNodes;
}

export function deleteSelected(nodes: Node[], edges: Edge[], selectedNodes: Node[], selectedEdges: Edge[]) {
  const nodeIdsToDelete = selectedNodes.map(n => n.id);
  const edgeIdsToDelete = selectedEdges.map(e => e.id);
  const newNodes = nodes.filter(n => !nodeIdsToDelete.includes(n.id));
  const newEdges = edges.filter(e => !edgeIdsToDelete.includes(e.id));
  return { newNodes, newEdges };
}

export function lockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
  return nodes.map(node =>
    selectedNodes.some(sn => sn.id === node.id)
      ? { ...node, draggable: false, data: { ...node.data, locked: true } }
      : node
  );
}

export function unlockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
  return nodes.map(node =>
    selectedNodes.some(sn => sn.id === node.id)
      ? { ...node, draggable: true, data: { ...node.data, locked: false } }
      : node
  );
}
