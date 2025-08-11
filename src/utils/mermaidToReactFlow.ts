import { Node, Edge, MarkerType, Position } from 'reactflow';
import mermaid from 'mermaid';
import dagre from 'dagre';

export interface ReactFlowData {
  nodes: Node[];
  edges: Edge[];
}

mermaid.initialize({ 
  startOnLoad: false,
  theme: 'default',
  flowchart: {
    htmlLabels: false,
    curve: 'linear'
  }
});

interface MermaidNode {
  id: string;
  label: string;
  shape: string;
  subgraph?: string;
  parentSubgraph?: string;  // For nested subgraphs
}

interface MermaidEdge {
  source: string;
  target: string;
  label?: string;
  type: string;
}

interface SubgraphInfo {
  id: string;
  title: string;
  nodes: string[];
  parentId?: string;  // For nested subgraphs
  childrenIds: string[];  // For nested subgraphs
}

interface SubgraphLayout {
  id: string;
  title: string;
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  width: number;
  height: number;
  position?: { x: number; y: number };
  parentId?: string;
}

const SUBGRAPH_HEADER_HEIGHT = 50;
const SUBGRAPH_PADDING = 30;
const DEBUG = true;  // Set to true to enable debug logging

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[MermaidConverter]', ...args);
  }
}

function cleanLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function getNodeShape(nodeDefinition: string): string {
  if (nodeDefinition.includes('{') && nodeDefinition.includes('}')) return 'diamond';
  if (nodeDefinition.includes('((') && nodeDefinition.includes('))')) return 'circle';
  if (nodeDefinition.includes('([') && nodeDefinition.includes('])')) return 'stadium';
  if (nodeDefinition.includes('[') && nodeDefinition.includes(']')) return 'rect';
  if (nodeDefinition.includes('(') && nodeDefinition.includes(')')) return 'round';
  return 'rect';
}

function parseMermaidCode(code: string): { 
  nodes: MermaidNode[], 
  edges: MermaidEdge[], 
  subgraphs: SubgraphInfo[],
  direction: string 
} {
  const nodes: MermaidNode[] = [];
  const edges: MermaidEdge[] = [];
  const subgraphs: SubgraphInfo[] = [];
  const nodeMap = new Map<string, MermaidNode>();
  
  // Default direction is top-to-bottom
  let direction = 'TB';
  
  // Remove comments and clean up the code
  const cleanCode = code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('%%'))
    .join('\n');
  
  debugLog('Clean code:', cleanCode);
  
  // Parse graph direction
  const directionMatch = cleanCode.match(/graph\s+(TB|BT|RL|LR)/i);
  if (directionMatch) {
    direction = directionMatch[1].toUpperCase();
    debugLog('Detected graph direction:', direction);
  }
  
  const lines = cleanCode.split('\n');
  const subgraphStack: string[] = [];  // Track nested subgraphs
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    debugLog(`Processing line ${i}: ${line}`);
    
    // Handle subgraph start
    const subgraphMatch = line.match(/^subgraph\s+([^\s]+)(?:\s*\[(.+)\])?/);
    if (subgraphMatch) {
      const [, subgraphId, subgraphTitle] = subgraphMatch;
      
      // Get parent from stack if this is a nested subgraph
      const parentId = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;
      
      debugLog(`Found subgraph: ${subgraphId}, title: ${subgraphTitle || subgraphId}, parent: ${parentId || 'none'}`);
      
      subgraphStack.push(subgraphId);
      
      const newSubgraph: SubgraphInfo = {
        id: subgraphId,
        title: subgraphTitle || subgraphId,
        nodes: [],
        parentId,
        childrenIds: []
      };
      
      // Update parent's children list
      if (parentId) {
        const parentSubgraph = subgraphs.find(sg => sg.id === parentId);
        if (parentSubgraph) {
          parentSubgraph.childrenIds.push(subgraphId);
        }
      }
      
      subgraphs.push(newSubgraph);
      continue;
    }
    
    // Handle subgraph end
    if (line === 'end') {
      if (subgraphStack.length > 0) {
        debugLog(`End of subgraph: ${subgraphStack[subgraphStack.length - 1]}`);
        subgraphStack.pop();
      } else {
        debugLog('Warning: Found "end" without matching subgraph start');
      }
      continue;
    }
    
    // Get current subgraph from the top of the stack
    const currentSubgraph = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;
    
    // Parse edge connections with more patterns
    const edgePatterns = [
      // A[Label] -->|EdgeLabel| B{Label}
      /([A-Za-z0-9_]+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?\s*(-->|->|---|===>|==>|-\.-|:-:|::|~|\.\.\.|===)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?/,
      // Simpler pattern: A --> B
      /([A-Za-z0-9_]+)\s*(-->|->|---|===>|==>|-\.-|:-:|::|~|\.\.\.|===)\s*([A-Za-z0-9_]+)/
    ];
    
    let edgeMatch = null;
    for (const pattern of edgePatterns) {
      edgeMatch = line.match(pattern);
      if (edgeMatch) break;
    }
    
    if (edgeMatch) {
      try {
        const sourceId = edgeMatch[1];
        const edgeType = edgeMatch[2];
        const edgeLabel = edgeMatch[3] || '';
        const targetId = edgeMatch[4] || edgeMatch[3];
        
        debugLog(`Found edge: ${sourceId} ${edgeType} ${targetId} with label: "${edgeLabel}"`);
        
        // Extract node definitions from the line
        const fullLine = line;
        
        // Parse source node
        const sourceNodeMatch = fullLine.match(new RegExp(`${sourceId}([\\[\\(\\{][^\\]\\)\\}]*[\\]\\)\\}])`));
        if (sourceNodeMatch && !nodeMap.has(sourceId)) {
          const fullDef = sourceNodeMatch[0];
          const shape = getNodeShape(fullDef);
          const labelMatch = fullDef.match(/[\[\(\{]([^\]\)\}]*)[\]\)\}]/);
          const label = labelMatch ? cleanLabel(labelMatch[1]) : sourceId;
          
          const node: MermaidNode = { 
            id: sourceId, 
            label, 
            shape, 
            subgraph: currentSubgraph,
            parentSubgraph: subgraphStack.length > 1 ? subgraphStack[subgraphStack.length - 2] : undefined
          };
          
          nodes.push(node);
          nodeMap.set(sourceId, node);
          
          if (currentSubgraph) {
            const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
            if (subgraph) subgraph.nodes.push(sourceId);
          }
          
          debugLog(`Created source node: ${sourceId}, label: "${label}", shape: ${shape}, subgraph: ${currentSubgraph || 'none'}`);
        } else if (!nodeMap.has(sourceId)) {
          // Create simple node
          const node: MermaidNode = { 
            id: sourceId, 
            label: sourceId, 
            shape: 'rect', 
            subgraph: currentSubgraph,
            parentSubgraph: subgraphStack.length > 1 ? subgraphStack[subgraphStack.length - 2] : undefined
          };
          
          nodes.push(node);
          nodeMap.set(sourceId, node);
          
          if (currentSubgraph) {
            const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
            if (subgraph) subgraph.nodes.push(sourceId);
          }
          
          debugLog(`Created simple source node: ${sourceId}, subgraph: ${currentSubgraph || 'none'}`);
        } else if (currentSubgraph && !nodeMap.get(sourceId)?.subgraph) {
          // Node already exists but wasn't assigned to this subgraph
          const node = nodeMap.get(sourceId)!;
          node.subgraph = currentSubgraph;
          
          const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
          if (subgraph && !subgraph.nodes.includes(sourceId)) {
            subgraph.nodes.push(sourceId);
          }
          
          debugLog(`Updated existing node ${sourceId} to be part of subgraph ${currentSubgraph}`);
        }
        
        // Parse target node
        const targetNodeMatch = fullLine.match(new RegExp(`${targetId}([\\[\\(\\{][^\\]\\)\\}]*[\\]\\)\\}])`));
        if (targetNodeMatch && !nodeMap.has(targetId)) {
          const fullDef = targetNodeMatch[0];
          const shape = getNodeShape(fullDef);
          const labelMatch = fullDef.match(/[\[\(\{]([^\]\)\}]*)[\]\)\}]/);
          const label = labelMatch ? cleanLabel(labelMatch[1]) : targetId;
          
          const node: MermaidNode = { 
            id: targetId, 
            label, 
            shape, 
            subgraph: currentSubgraph,
            parentSubgraph: subgraphStack.length > 1 ? subgraphStack[subgraphStack.length - 2] : undefined
          };
          
          nodes.push(node);
          nodeMap.set(targetId, node);
          
          if (currentSubgraph) {
            const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
            if (subgraph) subgraph.nodes.push(targetId);
          }
          
          debugLog(`Created target node: ${targetId}, label: "${label}", shape: ${shape}, subgraph: ${currentSubgraph || 'none'}`);
        } else if (!nodeMap.has(targetId)) {
          // Create simple node
          const node: MermaidNode = { 
            id: targetId, 
            label: targetId, 
            shape: 'rect', 
            subgraph: currentSubgraph,
            parentSubgraph: subgraphStack.length > 1 ? subgraphStack[subgraphStack.length - 2] : undefined
          };
          
          nodes.push(node);
          nodeMap.set(targetId, node);
          
          if (currentSubgraph) {
            const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
            if (subgraph) subgraph.nodes.push(targetId);
          }
          
          debugLog(`Created simple target node: ${targetId}, subgraph: ${currentSubgraph || 'none'}`);
        } else if (currentSubgraph && !nodeMap.get(targetId)?.subgraph) {
          // Node already exists but wasn't assigned to this subgraph
          const node = nodeMap.get(targetId)!;
          node.subgraph = currentSubgraph;
          
          const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
          if (subgraph && !subgraph.nodes.includes(targetId)) {
            subgraph.nodes.push(targetId);
          }
          
          debugLog(`Updated existing node ${targetId} to be part of subgraph ${currentSubgraph}`);
        }
        
        // Add edge
        edges.push({
          source: sourceId,
          target: targetId,
          label: edgeLabel,
          type: edgeType
        });
      } catch (error) {
        debugLog(`Error parsing edge: ${line}`, error);
      }
    } else {
      // Parse standalone node definitions
      try {
        const nodePatterns = [
          /^([A-Za-z0-9_]+)([\[\(\{][^\]\)\}]*[\]\)\}])/,
          /^([A-Za-z0-9_]+)$/
        ];
        
        for (const pattern of nodePatterns) {
          const nodeMatch = line.match(pattern);
          if (nodeMatch && !nodeMap.has(nodeMatch[1])) {
            const nodeId = nodeMatch[1];
            const nodeDef = nodeMatch[2] || '[' + nodeId + ']';
            const shape = getNodeShape(nodeDef);
            const labelMatch = nodeDef.match(/[\[\(\{]([^\]\)\}]*)[\]\)\}]/);
            const label = labelMatch ? cleanLabel(labelMatch[1]) : nodeId;
            
            const node: MermaidNode = { 
              id: nodeId, 
              label, 
              shape, 
              subgraph: currentSubgraph,
              parentSubgraph: subgraphStack.length > 1 ? subgraphStack[subgraphStack.length - 2] : undefined
            };
            
            nodes.push(node);
            nodeMap.set(nodeId, node);
            
            if (currentSubgraph) {
              const subgraph = subgraphs.find(sg => sg.id === currentSubgraph);
              if (subgraph) subgraph.nodes.push(nodeId);
            }
            
            debugLog(`Created standalone node: ${nodeId}, label: "${label}", shape: ${shape}, subgraph: ${currentSubgraph || 'none'}`);
            break;
          }
        }
      } catch (error) {
        debugLog(`Error parsing standalone node: ${line}`, error);
      }
    }
  }
  
  // Verify subgraph hierarchy
  debugLog('Subgraph hierarchy:');
  subgraphs.forEach(sg => {
    debugLog(`- ${sg.id} (parent: ${sg.parentId || 'none'}, children: ${sg.childrenIds.join(', ') || 'none'}, nodes: ${sg.nodes.length})`);
  });
  
  return { nodes, edges, subgraphs, direction };
}

// Calculate dynamic node sizes based on label length
function calculateNodeSize(label: string, shape: string) {
  const lines = label.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  const width = Math.max(100, Math.min(250, maxLineLength * 7 + 30));
  const height = Math.max(40, lines.length * 18 + 25);
  
  if (shape === 'diamond') {
    return { width: Math.max(80, width * 0.8), height: Math.max(80, height * 0.8) };
  }
  if (shape === 'circle') {
    const size = Math.max(width, height) + 10;
    return { width: size, height: size };
  }
  return { width, height };
}

// Process subgraphs in hierarchical order (parents before children)
function processSubgraphsInHierarchicalOrder(subgraphs: SubgraphInfo[]): SubgraphInfo[] {
  const result: SubgraphInfo[] = [];
  const processed = new Set<string>();
  
  // First pass: add all subgraphs without parents
  subgraphs.forEach(subgraph => {
    if (!subgraph.parentId) {
      result.push(subgraph);
      processed.add(subgraph.id);
    }
  });
  
  // Process remaining subgraphs in hierarchical order
  let lastProcessedCount = 0;
  while (processed.size < subgraphs.length && lastProcessedCount !== processed.size) {
    lastProcessedCount = processed.size;
    
    subgraphs.forEach(subgraph => {
      if (!processed.has(subgraph.id) && subgraph.parentId && processed.has(subgraph.parentId)) {
        result.push(subgraph);
        processed.add(subgraph.id);
      }
    });
  }
  
  // Add any remaining subgraphs (in case of circular references)
  subgraphs.forEach(subgraph => {
    if (!processed.has(subgraph.id)) {
      debugLog(`Warning: Subgraph ${subgraph.id} has circular reference or missing parent. Adding it anyway.`);
      result.push(subgraph);
    }
  });
  
  return result;
}

// Phase 1: Layout each subgraph independently
function layoutSubgraphs(
  nodes: MermaidNode[], 
  edges: MermaidEdge[], 
  subgraphs: SubgraphInfo[],
  direction: string
): Map<string, SubgraphLayout> {
  const subgraphLayouts = new Map<string, SubgraphLayout>();
  
  // Process subgraphs in hierarchical order
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  
  debugLog(`Laying out ${orderedSubgraphs.length} subgraphs in hierarchical order`);
  
  orderedSubgraphs.forEach(subgraph => {
    const subgraphNodes = nodes.filter(n => n.subgraph === subgraph.id);
    const subgraphEdges = edges.filter(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      return sourceNode?.subgraph === subgraph.id && targetNode?.subgraph === subgraph.id;
    });
    
    if (subgraphNodes.length === 0) {
      debugLog(`Skipping empty subgraph: ${subgraph.id}`);
      return;
    }
    
    debugLog(`Laying out subgraph: ${subgraph.id} with ${subgraphNodes.length} nodes and ${subgraphEdges.length} edges`);
    
    // Create a new graph for this subgraph
    const g = new dagre.graphlib.Graph();
    g.setGraph({ 
      rankdir: direction, 
      nodesep: 40, 
      ranksep: 60,
      marginx: SUBGRAPH_PADDING,
      marginy: SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT
    });
    g.setDefaultEdgeLabel(() => ({}));
    
    // Add nodes
    subgraphNodes.forEach(node => {
      const size = calculateNodeSize(node.label, node.shape);
      g.setNode(node.id, { width: size.width, height: size.height });
    });
    
    // Add edges
    subgraphEdges.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });
    
    // Layout this subgraph
    dagre.layout(g);
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
    
    subgraphNodes.forEach(node => {
      const nodeLayout = g.node(node.id);
      if (!nodeLayout) {
        debugLog(`Warning: No layout information for node ${node.id} in subgraph ${subgraph.id}`);
        return;
      }
      
      const size = calculateNodeSize(node.label, node.shape);
      
      nodePositions.set(node.id, {
        x: nodeLayout.x,
        y: nodeLayout.y,
        width: size.width,
        height: size.height
      });
      
      minX = Math.min(minX, nodeLayout.x - size.width / 2);
      maxX = Math.max(maxX, nodeLayout.x + size.width / 2);
      minY = Math.min(minY, nodeLayout.y - size.height / 2);
      maxY = Math.max(maxY, nodeLayout.y + size.height / 2);
    });
    
    // If no nodes were successfully laid out, skip this subgraph
    if (minX === Infinity || minY === Infinity) {
      debugLog(`Warning: Could not calculate layout for subgraph ${subgraph.id}`);
      return;
    }
    
    // Normalize positions to start from (0, 0) with header space
    const offsetX = -minX + SUBGRAPH_PADDING;
    const offsetY = -minY + SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT;
    
    nodePositions.forEach((pos, nodeId) => {
      nodePositions.set(nodeId, {
        ...pos,
        x: pos.x + offsetX,
        y: pos.y + offsetY
      });
    });
    
    const width = (maxX - minX) + SUBGRAPH_PADDING * 2;
    const height = (maxY - minY) + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER_HEIGHT;
    
    subgraphLayouts.set(subgraph.id, {
      id: subgraph.id,
      title: subgraph.title,
      nodes: nodePositions,
      width,
      height,
      parentId: subgraph.parentId
    });
    
    debugLog(`Subgraph ${subgraph.id} layout: width=${width}, height=${height}`);
  });
  
  return subgraphLayouts;
}

// Calculate connection weights between containers
function calculateConnectionWeights(
  nodes: MermaidNode[],
  edges: MermaidEdge[]
): Map<string, Map<string, number>> {
  const weights = new Map<string, Map<string, number>>();
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    // Get container IDs (either subgraph ID or node ID for standalone nodes)
    const sourceContainer = sourceNode.subgraph || sourceNode.id;
    const targetContainer = targetNode.subgraph || targetNode.id;
    
    // Skip self-connections within the same container
    if (sourceContainer === targetContainer) return;
    
    // Initialize maps if needed
    if (!weights.has(sourceContainer)) {
      weights.set(sourceContainer, new Map<string, number>());
    }
    
    const sourceWeights = weights.get(sourceContainer)!;
    const currentWeight = sourceWeights.get(targetContainer) || 0;
    sourceWeights.set(targetContainer, currentWeight + 1);
  });
  
  return weights;
}

// Phase 2: Layout meta-graph (containers + standalone nodes)
function layoutMetaGraph(
  nodes: MermaidNode[], 
  edges: MermaidEdge[], 
  subgraphLayouts: Map<string, SubgraphLayout>,
  direction: string
): { subgraphPositions: Map<string, { x: number; y: number }>, standalonePositions: Map<string, { x: number; y: number }> } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ 
    rankdir: direction, 
    nodesep: 80, 
    ranksep: 100,
    marginx: 50,
    marginy: 50
  });
  g.setDefaultEdgeLabel(() => ({}));
  
  debugLog('Laying out meta-graph');
  
  // Calculate connection weights between containers
  const connectionWeights = calculateConnectionWeights(nodes, edges);
  
  // Add subgraph containers as nodes
  subgraphLayouts.forEach((layout, id) => {
    // Skip nested subgraphs - they'll be positioned relative to their parents
    if (!layout.parentId) {
      g.setNode(id, { width: layout.width, height: layout.height });
      debugLog(`Added subgraph ${id} to meta-graph (width=${layout.width}, height=${layout.height})`);
    }
  });
  
  // Add standalone nodes
  const standaloneNodes = nodes.filter(n => !n.subgraph);
  standaloneNodes.forEach(node => {
    const size = calculateNodeSize(node.label, node.shape);
    g.setNode(node.id, { width: size.width, height: size.height });
    debugLog(`Added standalone node ${node.id} to meta-graph`);
  });
  
  // Add edges between containers and standalone nodes with weights
  connectionWeights.forEach((targets, sourceId) => {
    targets.forEach((weight, targetId) => {
      // Skip edges between nested subgraphs and their parents
      const sourceLayout = subgraphLayouts.get(sourceId);
      const targetLayout = subgraphLayouts.get(targetId);
      
      if ((sourceLayout && sourceLayout.parentId === targetId) || 
          (targetLayout && targetLayout.parentId === sourceId)) {
        return;
      }
      
      // Only add edges between top-level containers or standalone nodes
      const sourceIsTopLevel = !sourceLayout || !sourceLayout.parentId;
      const targetIsTopLevel = !targetLayout || !targetLayout.parentId;
      
      if (sourceIsTopLevel && targetIsTopLevel) {
        // Check if both nodes exist in the graph
        if (g.hasNode(sourceId) && g.hasNode(targetId)) {
          if (!g.hasEdge(sourceId, targetId)) {
            g.setEdge(sourceId, targetId, { weight });
            debugLog(`Added meta-edge from ${sourceId} to ${targetId} with weight ${weight}`);
          }
        }
      }
    });
  });
  
  // Layout the meta-graph
  dagre.layout(g);
  
  // Extract positions
  const subgraphPositions = new Map<string, { x: number; y: number }>();
  const standalonePositions = new Map<string, { x: number; y: number }>();
  
  // Position top-level subgraphs
  subgraphLayouts.forEach((layout, id) => {
    if (!layout.parentId) {
      const node = g.node(id);
      if (node) {
        subgraphPositions.set(id, {
          x: node.x - layout.width / 2,
          y: node.y - layout.height / 2
        });
        debugLog(`Positioned subgraph ${id} at (${node.x - layout.width / 2}, ${node.y - layout.height / 2})`);
      } else {
        debugLog(`Warning: No position for subgraph ${id} in meta-graph`);
      }
    }
  });
  
  // Position nested subgraphs relative to their parents
  const processedSubgraphs = new Set<string>();
  
  // Position nested subgraphs relative to their parents
  function positionNestedSubgraphs() {
    let progress = false;
    
    subgraphLayouts.forEach((layout, id) => {
      if (!processedSubgraphs.has(id) && layout.parentId) {
        const parentPos = subgraphPositions.get(layout.parentId);
        const parentLayout = subgraphLayouts.get(layout.parentId);
        
        if (parentPos && parentLayout) {
          // Position inside parent with some padding
          const x = parentPos.x + SUBGRAPH_PADDING;
          const y = parentPos.y + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_PADDING;
          
          subgraphPositions.set(id, { x, y });
          processedSubgraphs.add(id);
          progress = true;
          
          debugLog(`Positioned nested subgraph ${id} at (${x}, ${y}) relative to parent ${layout.parentId}`);
        }
      }
    });
    
    return progress;
  }
  
  // Keep positioning nested subgraphs until no more progress is made
  while (positionNestedSubgraphs()) {}
  
  // Position standalone nodes
  standaloneNodes.forEach(node => {
    const nodeLayout = g.node(node.id);
    if (nodeLayout) {
      const size = calculateNodeSize(node.label, node.shape);
      standalonePositions.set(node.id, {
        x: nodeLayout.x - size.width / 2,
        y: nodeLayout.y - size.height / 2
      });
      debugLog(`Positioned standalone node ${node.id} at (${nodeLayout.x - size.width / 2}, ${nodeLayout.y - size.height / 2})`);
    } else {
      debugLog(`Warning: No position for standalone node ${node.id} in meta-graph`);
    }
  });
  
  return { subgraphPositions, standalonePositions };
}

// Phase 3: Combine layouts and create React Flow elements
function createReactFlowElements(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  subgraphLayouts: Map<string, SubgraphLayout>,
  subgraphPositions: Map<string, { x: number; y: number }>,
  standalonePositions: Map<string, { x: number; y: number }>
): ReactFlowData {
  const reactFlowNodes: Node[] = [];
  
  debugLog('Creating React Flow elements');
  
  // Color schemes
  const getNodeColors = (shape: string, index: number) => {
    const colorSchemes = {
      rect: ['#E3F2FD', '#1976D2'], // Blue
      diamond: ['#FFF3E0', '#F57C00'], // Orange
      circle: ['#E8F5E8', '#388E3C'], // Green
      stadium: ['#F3E5F5', '#7B1FA2'], // Purple
      round: ['#FCE4EC', '#C2185B'], // Pink
    };
    
    const defaultColors = ['#F0F4F8', '#2D3748'];
    const colors = colorSchemes[shape as keyof typeof colorSchemes] || defaultColors;
    
    return {
      backgroundColor: colors[0],
      borderColor: colors[1],
    };
  };

  const getSubgraphColors = (index: number) => {
    const subgraphColors = [
      { bg: 'rgba(227, 242, 253, 0.4)', border: '#1976D2' }, // Blue
      { bg: 'rgba(232, 245, 233, 0.4)', border: '#388E3C' }, // Green
      { bg: 'rgba(243, 229, 245, 0.4)', border: '#7B1FA2' }, // Purple
      { bg: 'rgba(255, 243, 224, 0.4)', border: '#F57C00' }, // Orange
      { bg: 'rgba(252, 228, 236, 0.4)', border: '#C2185B' }, // Pink
    ];
    return subgraphColors[index % subgraphColors.length];
  };
  
  // Process subgraphs in hierarchical order
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  
  // Add subgraph containers
  orderedSubgraphs.forEach((subgraph, index) => {
    const layout = subgraphLayouts.get(subgraph.id);
    const position = subgraphPositions.get(subgraph.id);
    
    if (layout && position) {
      const colors = getSubgraphColors(index);
      
      reactFlowNodes.push({
        id: `subgraph-${subgraph.id}`,
        type: 'group',
        position: position,
        data: { 
          label: subgraph.title,
          isSubgraph: true
        },
        style: {
          backgroundColor: colors.bg,
          border: `3px solid ${colors.border}`,
          borderRadius: '12px',
          width: layout.width,
          height: layout.height,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: -1,
        },
        selectable: true,
        draggable: true,
        connectable: false,
        parentNode: layout.parentId ? `subgraph-${layout.parentId}` : undefined,
        extent: layout.parentId ? 'parent' : undefined,
      });
    }
  });
  
  // Add nodes
  let nodeIndex = 0;
  nodes.forEach(node => {
    const colors = getNodeColors(node.shape, nodeIndex++);
    
    let nodeStyle = {
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      borderWidth: '2px',
      borderStyle: 'solid' as const,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    };
    
    // Adjust style based on shape
    switch (node.shape) {
      case 'diamond':
        nodeStyle.borderRadius = '0px';
        break;
      case 'circle':
        nodeStyle.borderRadius = '50%';
        break;
      case 'stadium':
        nodeStyle.borderRadius = '30px';
        break;
      case 'round':
        nodeStyle.borderRadius = '15px';
        break;
    }
    
    let position: { x: number; y: number };
    let parentNode: string | undefined;
    
    if (node.subgraph) {
      // Node is inside a subgraph
      const subgraphLayout = subgraphLayouts.get(node.subgraph);
      const subgraphPosition = subgraphPositions.get(node.subgraph);
      const nodeLayout = subgraphLayout?.nodes.get(node.id);
      
      if (nodeLayout && subgraphPosition) {
        // Position relative to parent
        position = {
          x: nodeLayout.x - nodeLayout.width / 2,
          y: nodeLayout.y - nodeLayout.height / 2
        };
        parentNode = `subgraph-${node.subgraph}`;
      } else {
        position = { x: 0, y: 0 };
      }
    } else {
      // Standalone node
      const standalonePos = standalonePositions.get(node.id);
      position = standalonePos || { x: 0, y: 0 };
    }
    
    reactFlowNodes.push({
      id: node.id,
      type: 'custom',
      position: position,
      data: { 
        label: node.label,
        githubUrl: '',
        description: '',
        shape: node.shape,
        colors
      },
      style: nodeStyle,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      parentNode: parentNode,
      extent: parentNode ? 'parent' : undefined,
      draggable: true,
      zIndex: 1,
    });
  });
  
  // Create edges with consistent styling
  const reactFlowEdges: Edge[] = edges.map((edge, index) => {
    const edgeColors = ['#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#C2185B'];
    const edgeColor = edgeColors[index % edgeColors.length];
    
    let edgeStyle = {
      stroke: edgeColor,
      strokeWidth: 2,
    };
    
    // Always use smoothstep for consistency
    const edgeType = 'smoothstep';
    let animated = false;
    
    // Style edges based on type
    switch (edge.type) {
      case '-->':
      case '->':
        animated = true;
        edgeStyle.strokeWidth = 2.5;
        break;
      case '---':
        edgeStyle.strokeDasharray = '8,4';
        break;
      case '-.-':
        edgeStyle.strokeDasharray = '4,4';
        break;
      case '==>':
      case '===>':
        edgeStyle.strokeWidth = 4;
        animated = true;
        break;
    }
    
    // Create edge with explicit properties
    return {
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edgeType,
      animated,
      style: edgeStyle,
      labelStyle: {
        fontSize: '12px',
        fontWeight: '500',
        color: edgeColor,
        backgroundColor: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        border: `1px solid ${edgeColor}`,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edgeColor,
      },
      // These ensure consistent connections
      sourceHandle: null,
      targetHandle: null,
      zIndex: 0,
    };
  });
  
  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}



// Main layout function using the three-phase approach
function layoutGraph(
  nodes: MermaidNode[], 
  edges: MermaidEdge[], 
  subgraphs: SubgraphInfo[],
  direction: string
): { nodes: Node[], edges: Edge[] } {
  debugLog('Starting graph layout with direction:', direction);
  debugLog(`Input: ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`);
  
  // Phase 1: Layout each subgraph independently
  const subgraphLayouts = layoutSubgraphs(nodes, edges, subgraphs, direction);
  
  // Phase 2: Layout meta-graph (containers + standalone nodes)
  const { subgraphPositions, standalonePositions } = layoutMetaGraph(nodes, edges, subgraphLayouts, direction);
  
  // Phase 3: Combine layouts and create React Flow elements
  return createReactFlowElements(nodes, edges, subgraphs, subgraphLayouts, subgraphPositions, standalonePositions);
}

export async function convertMermaidToReactFlow(mermaidCode: string): Promise<ReactFlowData> {
  try {
    debugLog('Starting Mermaid to React Flow conversion');
    debugLog('Mermaid code:', mermaidCode);
    
    // Parse the Mermaid code
    const { nodes, edges, subgraphs, direction } = parseMermaidCode(mermaidCode);
    
    if (nodes.length === 0) {
      debugLog('No nodes found in Mermaid diagram');
      return { nodes: [], edges: [] };
    }
    
    debugLog(`Parsed ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`);
    
    // Layout the graph and return
    return layoutGraph(nodes, edges, subgraphs, direction);
  } catch (error) {
    console.error('Error converting Mermaid to React Flow:', error);
    return { nodes: [], edges: [] };
  }
}
